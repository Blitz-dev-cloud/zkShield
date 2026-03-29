from flask import Flask, request, jsonify
import requests as http_requests
import json
import hashlib
import hmac
import os
import time
import secrets

if __package__ in (None, ""):
    # Supports running as: python3 gateway/gateway.py
    from packet_parser import parse_auth, parse_packet
    from verifier import verify_auth_proof, verify_ml_proof
    from session_store import create_session, has_session, verify_and_update_packet_envelope
else:
    # Supports running as: python3 -m gateway.gateway
    from gateway.packet_parser import parse_auth, parse_packet
    from gateway.verifier import verify_auth_proof, verify_ml_proof
    from gateway.session_store import create_session, has_session, verify_and_update_packet_envelope

app = Flask(__name__)

def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


RELAY_URL = _require_env("ZKSHIELD_RELAY_URL")
FORWARD_SIGNING_KEY = _require_env("ZKSHIELD_FORWARD_SIGNING_KEY")


def _validate_destination(destination):
    if not isinstance(destination, str) or not destination:
        return False, "Invalid or missing destination"
    if not (destination.startswith("http://") or destination.startswith("https://")):
        return False, "Destination must be an http:// or https:// URL"
    return True, None


def _create_forward_token(session_id, destination, payload_hash):
    ts = int(time.time())
    nonce = secrets.token_hex(12)
    signing_input = f"{session_id}|{destination}|{ts}|{nonce}|{payload_hash}"
    signature = hmac.new(
        FORWARD_SIGNING_KEY.encode(),
        signing_input.encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "session_id": session_id,
        "destination": destination,
        "timestamp": ts,
        "nonce": nonce,
        "payload_hash": payload_hash,
        "signature": signature,
    }


def _build_http_forward_request(payload, destination):
    """Build relay forwarding request for API-style packet payload."""
    method = str(payload.get("method", "GET")).upper()
    headers = payload.get("headers") or {}
    body = payload.get("body")

    allowed_methods = {"GET", "POST", "PUT", "PATCH", "DELETE"}
    if method not in allowed_methods:
        return None, f"Unsupported method: {method}"

    dest_ok, dest_error = _validate_destination(destination)
    if not dest_ok:
        return None, dest_error

    if not isinstance(headers, dict):
        return None, "headers must be an object"

    return {
        "mode": "http",
        "destination": destination,
        "method": method,
        "headers": headers,
        "body": body,
    }, None


def _build_raw_forward_request(payload, destination, packet_meta, payload_hash):
    """Build relay forwarding request for non-HTTP raw packet payload."""
    dest_ok, dest_error = _validate_destination(destination)
    if not dest_ok:
        return None, dest_error

    return {
        "mode": "raw",
        "destination": destination,
        "json": {
            "payload": payload,
            "packet_meta": {
                "sequence": packet_meta.get("sequence"),
                "nonce": packet_meta.get("nonce"),
                "timestamp": packet_meta.get("timestamp"),
                "payload_hash": payload_hash,
            },
        },
    }, None


def _forward_via_relay(session_id, destination, payload_hash, forward_request):
    token = _create_forward_token(session_id, destination, payload_hash)
    try:
        relay_res = http_requests.post(
            RELAY_URL,
            json={
                "forward_token": token,
                "forward_request": forward_request,
            },
            timeout=10,
        )
    except Exception as exc:
        return None, f"Relay unreachable: {exc}"

    relay_json = {}
    try:
        relay_json = relay_res.json()
    except Exception:
        relay_json = {"raw": relay_res.text}

    if relay_res.status_code >= 400 or not relay_json.get("ok", False):
        return None, relay_json.get("error", f"Relay forward failed with status {relay_res.status_code}")

    return relay_json.get("forwarded_response"), None


@app.route("/auth", methods=["POST"])
def authorize_user():
    """One-time authorization. Verifies auth proof and returns session_id."""
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "DROP",
            "message": "Invalid or missing JSON body"
        }), 400

    parsed, error = parse_auth(data)
    if error:
        return jsonify({
            "status": "DROP",
            "message": error
        }), 400

    auth_proof = parsed["auth_proof"]
    auth_public = parsed["auth_public"]

    ok, msg = verify_auth_proof(auth_proof, auth_public)
    if not ok:
        return jsonify({
            "status": "DROP",
            "message": msg
        }), 403

    user_nullifier = auth_public[1] if len(auth_public) > 1 else "unknown"
    session_id, session_key = create_session(str(user_nullifier))

    return jsonify({
        "status": "AUTHORIZED",
        "message": "User authorized",
        "session_id": session_id,
        "session_key": session_key,
        "user_nullifier": str(user_nullifier)
    }), 200


@app.route("/packet", methods=["POST"])
def receive_packet():
    """Packet verification after authorization. Requires valid session_id."""
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "DROP",
            "message": "Invalid or missing JSON body"
        }), 400

    parsed, error = parse_packet(data)
    if error:
        return jsonify({
            "status": "DROP",
            "message": error
        }), 400

    session_id = parsed["session_id"]
    payload = parsed["payload"]
    destination = parsed["destination"]
    ml_proof = parsed["ml_proof"]
    packet_meta = parsed["packet_meta"]

    if not has_session(str(session_id)):
        return jsonify({
            "status": "DROP",
            "message": "Invalid or expired session. Authorize first."
        }), 403

    payload_hash = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    envelope_ok, envelope_msg = verify_and_update_packet_envelope(
        str(session_id), payload_hash, packet_meta
    )
    if not envelope_ok:
        return jsonify({
            "status": "DROP",
            "message": envelope_msg
        }), 403

    ok, msg = verify_ml_proof(ml_proof)
    if not ok:
        return jsonify({
            "status": "DROP",
            "message": msg
        }), 403

    if isinstance(payload, dict) and payload.get("type") == "http_request":
        forward_request, build_error = _build_http_forward_request(payload, destination)
        if build_error:
            return jsonify({
                "status": "DROP",
                "message": build_error
            }), 400

        forwarded, forward_error = _forward_via_relay(str(session_id), destination, payload_hash, forward_request)
        if forward_error:
            return jsonify({
                "status": "DROP",
                "message": forward_error
            }), 400

        return jsonify({
            "status": "PASS",
            "message": "Packet verified and HTTP request forwarded",
            "destination": destination,
            "payload_hash": payload_hash,
            "packet_meta": {
                "sequence": packet_meta.get("sequence"),
                "nonce": packet_meta.get("nonce"),
                "timestamp": packet_meta.get("timestamp"),
                "payload_hash": payload_hash,
            },
            "forwarded_response": forwarded,
        }), 200

    forward_request, build_error = _build_raw_forward_request(payload, destination, packet_meta, payload_hash)
    if build_error:
        return jsonify({
            "status": "DROP",
            "message": build_error
        }), 400

    forwarded, forward_error = _forward_via_relay(str(session_id), destination, payload_hash, forward_request)
    if forward_error:
        return jsonify({
            "status": "DROP",
            "message": forward_error
        }), 400

    return jsonify({
        "status": "PASS",
        "message": "Packet verified and raw payload forwarded",
        "destination": destination,
        "payload_hash": payload_hash,
        "packet_meta": {
            "sequence": packet_meta.get("sequence"),
            "nonce": packet_meta.get("nonce"),
            "timestamp": packet_meta.get("timestamp"),
            "payload_hash": payload_hash,
        },
        "forwarded_response": forwarded,
    }), 200


@app.route("/health", methods=["GET"])
def health():
    skip_ml_verify = os.environ.get("ZKSHIELD_SKIP_ML_VERIFY", "false").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    return jsonify({"status": "ok", "skip_ml_verify": skip_ml_verify}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False, use_reloader=False)
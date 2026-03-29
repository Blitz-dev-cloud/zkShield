from flask import Flask, request, jsonify
import hashlib
import hmac
import json
import os
import secrets
import time
from urllib.parse import urlparse

import requests

app = Flask(__name__)

def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


FORWARD_SIGNING_KEY = _require_env("ZKSHIELD_FORWARD_SIGNING_KEY")
FORWARD_TTL_SECONDS = int(os.environ.get("ZKSHIELD_FORWARD_TTL_SECONDS", "30"))
ALLOWED_HOSTS_RAW = _require_env("ZKSHIELD_RELAY_ALLOWED_HOSTS")


def _allowed_hosts():
    raw = [item.strip() for item in ALLOWED_HOSTS_RAW.split(",") if item.strip()]
    hosts = set(raw)
    if not hosts:
        raise RuntimeError("ZKSHIELD_RELAY_ALLOWED_HOSTS must include at least one hostname")
    if "*" in hosts:
        raise RuntimeError("Wildcard '*' is not allowed for ZKSHIELD_RELAY_ALLOWED_HOSTS in production mode")
    return hosts


def _destination_allowed(destination: str) -> bool:
    try:
        parsed = urlparse(destination)
    except Exception:
        return False

    if parsed.scheme not in ("http", "https"):
        return False

    host = parsed.hostname
    if not host:
        return False

    allow = _allowed_hosts()
    if "*" in allow:
        return True
    return host in allow


def _verify_forward_token(token: dict):
    required = ["session_id", "destination", "timestamp", "nonce", "payload_hash", "signature"]
    for field in required:
        if field not in token:
            return False, f"Missing forward_token.{field}"

    session_id = str(token["session_id"])
    destination = str(token["destination"])
    nonce = str(token["nonce"])
    payload_hash = str(token["payload_hash"])
    signature = str(token["signature"])

    try:
        ts = int(token["timestamp"])
    except Exception:
        return False, "Invalid forward_token.timestamp"

    if abs(int(time.time()) - ts) > FORWARD_TTL_SECONDS:
        return False, "Forward token expired"

    if not _destination_allowed(destination):
        return False, "Destination host not allowed"

    signing_input = f"{session_id}|{destination}|{ts}|{nonce}|{payload_hash}"
    expected_sig = hmac.new(
        FORWARD_SIGNING_KEY.encode(),
        signing_input.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, signature):
        return False, "Invalid forward token signature"

    return True, "ok"


def _hash_body(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _forward_request(forward_request: dict):
    mode = str(forward_request.get("mode", "")).lower()
    destination = str(forward_request.get("destination", ""))

    if mode == "http":
        method = str(forward_request.get("method", "GET")).upper()
        headers = forward_request.get("headers") or {}
        body = forward_request.get("body", "")

        if not isinstance(headers, dict):
            return None, "forward_request.headers must be an object"

        response = requests.request(
            method=method,
            url=destination,
            headers=headers,
            data=body,
            timeout=10,
        )
        return {
            "upstream_url": destination,
            "upstream_method": method,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body_hash": _hash_body(response.text),
            "content_type": response.headers.get("content-type", ""),
        }, None

    if mode == "raw":
        payload_json = forward_request.get("json")
        if payload_json is None:
            return None, "forward_request.json is required for raw mode"

        response = requests.post(
            destination,
            json=payload_json,
            timeout=10,
        )
        return {
            "upstream_url": destination,
            "upstream_method": "POST",
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body_hash": _hash_body(response.text),
            "content_type": response.headers.get("content-type", ""),
        }, None

    return None, f"Unsupported forward mode: {mode}"


@app.route("/forward", methods=["POST"])
def forward():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"ok": False, "error": "Invalid or missing JSON body"}), 400

    token = data.get("forward_token")
    forward_request = data.get("forward_request")

    if not isinstance(token, dict):
        return jsonify({"ok": False, "error": "Missing forward_token"}), 400
    if not isinstance(forward_request, dict):
        return jsonify({"ok": False, "error": "Missing forward_request"}), 400

    token_ok, token_msg = _verify_forward_token(token)
    if not token_ok:
        return jsonify({"ok": False, "error": token_msg}), 403

    # Destination in request must match token destination exactly.
    req_destination = str(forward_request.get("destination", ""))
    if req_destination != str(token.get("destination", "")):
        return jsonify({"ok": False, "error": "Destination mismatch between token and request"}), 400

    try:
        forwarded, forward_error = _forward_request(forward_request)
    except Exception as exc:
        return jsonify({"ok": False, "error": f"Relay forward failed: {exc}"}), 502

    if forward_error:
        return jsonify({"ok": False, "error": forward_error}), 400

    return jsonify({
        "ok": True,
        "relay_id": secrets.token_hex(8),
        "forwarded_response": forwarded,
    }), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5100, debug=False, use_reloader=False)

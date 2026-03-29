from flask import Flask, request, jsonify
import hashlib
import json

app = Flask(__name__)


def _extract_packet_fields(data):
    """Support both raw and API-mode forwarded bodies."""
    # Raw mode expected shape: { payload, packet_meta }
    if isinstance(data, dict) and "payload" in data and "packet_meta" in data:
        return data.get("payload"), data.get("packet_meta") or {}

    # API mode may send body directly (e.g., {payload: "..."})
    if isinstance(data, dict):
        # Optional nested wrapper support.
        if "data" in data and isinstance(data["data"], dict):
            nested = data["data"]
            payload = nested.get("payload", nested)
            packet_meta = nested.get("packet_meta", {}) if isinstance(nested, dict) else {}
            return payload, packet_meta

        payload = data.get("payload", data)
        packet_meta = data.get("packet_meta", {}) if isinstance(data.get("packet_meta", {}), dict) else {}
        return payload, packet_meta

    return data, {}


@app.route("/ingest", methods=["POST"])
def ingest():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"ok": False, "error": "Invalid JSON"}), 400

    payload, packet_meta = _extract_packet_fields(data)

    payload_hash = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()

    print("[receiver] packet received")
    print(f"[receiver] sequence={packet_meta.get('sequence')} nonce={packet_meta.get('nonce')}")
    print(f"[receiver] payload_hash={payload_hash}")

    return jsonify(
        {
            "ok": True,
            "received": True,
            "payload_hash": payload_hash,
            "sequence": packet_meta.get("sequence"),
        }
    ), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    # Bind all interfaces for cross-device demo (LAN/VPN/tunnel)
    app.run(host="0.0.0.0", port=7000, debug=False, use_reloader=False)

from flask import Flask, request, jsonify
from gateway.packet_parser import parse_packet
from gateway.verifier import verify_packet

app = Flask(__name__)

@app.route("/packet", methods=["POST"])
def receive_packet():
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

    auth_proof = parsed["auth_proof"]
    auth_public = parsed["auth_public"]
    ml_proof = parsed["ml_proof"]
    payload = parsed["payload"]

    ok, msg = verify_packet(auth_proof, auth_public, ml_proof)

    if not ok:
        return jsonify({
            "status": "DROP",
            "message": msg
        }), 403

    return jsonify({
        "status": "PASS",
        "message": "Packet forwarded",
        "payload": payload
    }), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
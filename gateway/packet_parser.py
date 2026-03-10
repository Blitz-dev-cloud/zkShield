def parse_packet(packet_json):
    required_fields = ["payload", "auth_proof", "auth_public", "ml_proof"]

    for field in required_fields:
        if field not in packet_json:
            return None, f"Missing field: {field}"

    return {
        "payload": packet_json["payload"],
        "auth_proof": packet_json["auth_proof"],
        "auth_public": packet_json["auth_public"],
        "ml_proof": packet_json["ml_proof"]
    }, None
def parse_auth(auth_json):
    required_fields = ["auth_proof", "auth_public"]

    for field in required_fields:
        if field not in auth_json:
            return None, f"Missing field: {field}"

    return {
        "auth_proof": auth_json["auth_proof"],
        "auth_public": auth_json["auth_public"],
    }, None


def parse_packet(packet_json):
    required_fields = ["payload", "destination", "session_id", "ml_proof", "packet_meta"]

    for field in required_fields:
        if field not in packet_json:
            return None, f"Missing field: {field}"

    return {
        "payload": packet_json["payload"],
        "destination": packet_json["destination"],
        "session_id": packet_json["session_id"],
        "ml_proof": packet_json["ml_proof"],
        "packet_meta": packet_json["packet_meta"],
    }, None
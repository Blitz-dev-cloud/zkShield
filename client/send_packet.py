import requests

def send_packet(payload, auth_proof, auth_public, ml_proof):
    packet = {
        "payload": payload,
        "auth_proof": auth_proof,
        "auth_public": auth_public,
        "ml_proof": ml_proof
    }

    response = requests.post(
        "http://localhost:5001/packet",
        json=packet
    )

    print("Status code:", response.status_code)
    print("Gateway response:", response.json())
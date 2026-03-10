from client.features import extract_features
from client.proof_gen import generate_auth_proof, generate_ml_proof
from client.send_packet import send_packet

def main():
    packet = {
        "size": 512,
        "request_rate": 20,
        "port_category": 1,
        "protocol": 0,
        "entropy": 4.2,
        "payload": "Hello from zkShield client"
    }

    features = extract_features(packet)

    auth_proof, auth_public = generate_auth_proof()
    
    ml_proof = generate_ml_proof(features)

    send_packet(
        payload=packet["payload"],
        auth_proof=auth_proof,
        auth_public=auth_public,
        ml_proof=ml_proof
    )

if __name__ == "__main__":
    main()
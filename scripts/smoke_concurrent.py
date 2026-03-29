#!/usr/bin/env python3
import argparse
import concurrent.futures
import hashlib
import hmac
import json
import secrets
import sys
import time
from pathlib import Path

import requests


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def read_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def create_signed_packet(session_id, session_key, payload, destination, ml_proof):
    sequence = 1
    nonce = secrets.token_hex(16)
    timestamp = int(time.time())
    payload_hash = hashlib.sha256(canonical_json(payload).encode()).hexdigest()
    signature_input = f"{session_id}|{sequence}|{nonce}|{timestamp}|{payload_hash}"
    signature = hmac.new(session_key.encode(), signature_input.encode(), hashlib.sha256).hexdigest()

    return {
        "payload": payload,
        "destination": destination,
        "session_id": session_id,
        "ml_proof": ml_proof,
        "packet_meta": {
            "sequence": sequence,
            "nonce": nonce,
            "timestamp": timestamp,
            "signature": signature,
        },
    }


def worker(i, auth_url, packet_url, destination, auth_proof, auth_public, ml_proof, timeout):
    auth_res = requests.post(
        auth_url,
        json={"auth_proof": auth_proof, "auth_public": auth_public},
        timeout=timeout,
    )
    if auth_res.status_code != 200:
        return False, f"worker={i} auth failed status={auth_res.status_code} body={auth_res.text[:200]}"

    auth_data = auth_res.json()
    session_id = auth_data.get("session_id")
    session_key = auth_data.get("session_key")
    if not session_id or not session_key:
        return False, f"worker={i} auth missing session fields"

    payload = {
        "type": "smoke_test",
        "index": i,
        "message": f"concurrent packet {i}",
    }
    packet = create_signed_packet(session_id, session_key, payload, destination, ml_proof)

    packet_res = requests.post(packet_url, json=packet, timeout=timeout)
    if packet_res.status_code != 200:
        return False, f"worker={i} packet failed status={packet_res.status_code} body={packet_res.text[:200]}"

    result = packet_res.json()
    if result.get("status") != "PASS":
        return False, f"worker={i} packet status={result.get('status')} body={packet_res.text[:200]}"

    return True, f"worker={i} PASS"


def main():
    parser = argparse.ArgumentParser(description="Concurrent production-style smoke test for gateway + relay")
    parser.add_argument("--gateway-base", default="http://127.0.0.1:5001", help="Gateway base URL")
    parser.add_argument("--destination", default="http://127.0.0.1:7000/ingest", help="Forward destination URL")
    parser.add_argument("--count", type=int, default=8, help="Total concurrent packet sends")
    parser.add_argument("--workers", type=int, default=8, help="Max concurrent workers")
    parser.add_argument("--timeout", type=int, default=20, help="HTTP timeout seconds")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    auth_proof = read_json(repo_root / "proofs" / "auth_proof.json")
    auth_public = read_json(repo_root / "proofs" / "auth_public.json")
    ml_proof = read_json(repo_root / "ml" / "ezkl" / "proof.json")

    auth_url = f"{args.gateway_base.rstrip('/')}/auth"
    packet_url = f"{args.gateway_base.rstrip('/')}/packet"

    print(f"Running concurrent smoke test: count={args.count}, workers={args.workers}")
    print(f"Gateway auth URL: {auth_url}")
    print(f"Gateway packet URL: {packet_url}")
    print(f"Destination URL: {args.destination}")

    passed = 0
    failures = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [
            executor.submit(
                worker,
                i,
                auth_url,
                packet_url,
                args.destination,
                auth_proof,
                auth_public,
                ml_proof,
                args.timeout,
            )
            for i in range(1, args.count + 1)
        ]

        for future in concurrent.futures.as_completed(futures):
            ok, message = future.result()
            print(message)
            if ok:
                passed += 1
            else:
                failures.append(message)

    print(f"Summary: passed={passed} failed={len(failures)}")
    if failures:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

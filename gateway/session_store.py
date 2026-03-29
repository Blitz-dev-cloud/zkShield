import json
import os
import secrets
import time
import hmac
import hashlib
from typing import Dict, Any

SESSION_FILE = "gateway/auth_sessions.json"


def _load_sessions() -> Dict[str, Any]:
    if not os.path.exists(SESSION_FILE):
        return {}
    with open(SESSION_FILE, "r") as f:
        data = json.load(f)
    return data if isinstance(data, dict) else {}


def _save_sessions(sessions: Dict[str, Any]) -> None:
    with open(SESSION_FILE, "w") as f:
        json.dump(sessions, f, indent=2)


def create_session(user_nullifier: str):
    sessions = _load_sessions()
    session_id = secrets.token_hex(16)
    session_key = secrets.token_hex(32)
    sessions[session_id] = {
        "user_nullifier": user_nullifier,
        "session_key": session_key,
        "created_at": int(time.time()),
        "last_sequence": 0,
        "used_nonces": []
    }
    _save_sessions(sessions)
    return session_id, session_key


def has_session(session_id: str) -> bool:
    sessions = _load_sessions()
    return session_id in sessions


def get_session(session_id: str):
    sessions = _load_sessions()
    return sessions.get(session_id)


def verify_and_update_packet_envelope(session_id: str, payload_hash: str, packet_meta: Dict[str, Any]):
    """Verify packet signature/nonce/sequence and update replay state."""
    sessions = _load_sessions()
    session = sessions.get(session_id)
    if not session:
        return False, "Invalid or expired session"

    required = ["sequence", "nonce", "timestamp", "signature"]
    for field in required:
        if field not in packet_meta:
            return False, f"Missing packet_meta.{field}"

    try:
        sequence = int(packet_meta["sequence"])
        timestamp = int(packet_meta["timestamp"])
        nonce = str(packet_meta["nonce"])
        signature = str(packet_meta["signature"])
    except Exception:
        return False, "Invalid packet_meta field types"

    if sequence <= int(session.get("last_sequence", 0)):
        return False, "Replay detected: sequence must be strictly increasing"

    used_nonces = set(session.get("used_nonces", []))
    if nonce in used_nonces:
        return False, "Replay detected: nonce already used"

    now = int(time.time())
    if abs(now - timestamp) > 30:
        return False, "Stale packet timestamp"

    signing_input = f"{session_id}|{sequence}|{nonce}|{timestamp}|{payload_hash}"
    expected_sig = hmac.new(
        session["session_key"].encode(),
        signing_input.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, signature):
        return False, "Invalid packet signature"

    # Keep nonce window bounded.
    next_nonces = list(used_nonces)
    next_nonces.append(nonce)
    if len(next_nonces) > 2000:
        next_nonces = next_nonces[-2000:]

    session["last_sequence"] = sequence
    session["used_nonces"] = next_nonces
    sessions[session_id] = session
    _save_sessions(sessions)
    return True, "Packet envelope verified"


def clear_sessions() -> None:
    _save_sessions({})

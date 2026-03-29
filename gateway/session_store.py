import os
import secrets
import time
import hmac
import hashlib
from typing import Dict, Any, Optional

import redis


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


REDIS_URL = _require_env("ZKSHIELD_REDIS_URL")
SESSION_TTL_SECONDS = int(os.environ.get("ZKSHIELD_SESSION_TTL_SECONDS", "3600"))
NONCE_TTL_SECONDS = int(os.environ.get("ZKSHIELD_NONCE_TTL_SECONDS", str(SESSION_TTL_SECONDS)))
MAX_CLOCK_SKEW_SECONDS = int(os.environ.get("ZKSHIELD_MAX_CLOCK_SKEW_SECONDS", "30"))

_redis = redis.Redis.from_url(REDIS_URL, decode_responses=True)

_ATOMIC_REPLAY_SCRIPT = """
local session_key = KEYS[1]
local nonce_key = KEYS[2]
local sequence = tonumber(ARGV[1])
local nonce = ARGV[2]
local nonce_ttl = tonumber(ARGV[3])

if redis.call('EXISTS', session_key) == 0 then
  return 'INVALID_SESSION'
end

local last_sequence = tonumber(redis.call('HGET', session_key, 'last_sequence') or '0')
if sequence <= last_sequence then
  return 'REPLAY_SEQUENCE'
end

if redis.call('SISMEMBER', nonce_key, nonce) == 1 then
  return 'REPLAY_NONCE'
end

redis.call('HSET', session_key, 'last_sequence', tostring(sequence))
redis.call('SADD', nonce_key, nonce)
redis.call('EXPIRE', nonce_key, nonce_ttl)

return 'OK'
"""


def _session_key(session_id: str) -> str:
    return f"zkshield:session:{session_id}"


def _nonce_key(session_id: str) -> str:
    return f"zkshield:session_nonces:{session_id}"


def create_session(user_nullifier: str):
    session_id = secrets.token_hex(16)
    session_key = secrets.token_hex(32)

    key = _session_key(session_id)
    _redis.hset(
        key,
        mapping={
            "user_nullifier": user_nullifier,
            "session_key": session_key,
            "created_at": str(int(time.time())),
            "last_sequence": "0",
        },
    )
    _redis.expire(key, SESSION_TTL_SECONDS)
    return session_id, session_key


def has_session(session_id: str) -> bool:
    return _redis.exists(_session_key(session_id)) == 1


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    values = _redis.hgetall(_session_key(session_id))
    return values or None


def verify_and_update_packet_envelope(session_id: str, payload_hash: str, packet_meta: Dict[str, Any]):
    """Verify packet signature/nonce/sequence and update replay state."""
    session = get_session(session_id)
    if session is None:
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

    now = int(time.time())
    if abs(now - timestamp) > MAX_CLOCK_SKEW_SECONDS:
        return False, "Stale packet timestamp"

    signing_input = f"{session_id}|{sequence}|{nonce}|{timestamp}|{payload_hash}"
    expected_sig = hmac.new(
        session["session_key"].encode(),
        signing_input.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, signature):
        return False, "Invalid packet signature"

    result = _redis.eval(
        _ATOMIC_REPLAY_SCRIPT,
        2,
        _session_key(session_id),
        _nonce_key(session_id),
        sequence,
        nonce,
        NONCE_TTL_SECONDS,
    )

    if result == "REPLAY_SEQUENCE":
        return False, "Replay detected: sequence must be strictly increasing"
    if result == "REPLAY_NONCE":
        return False, "Replay detected: nonce already used"
    if result == "INVALID_SESSION":
        return False, "Invalid or expired session"
    if result != "OK":
        return False, "Session replay state update failed"

    return True, "Packet envelope verified"


def clear_sessions() -> None:
    keys = list(_redis.scan_iter("zkshield:session:*"))
    nonce_keys = list(_redis.scan_iter("zkshield:session_nonces:*") )
    if keys or nonce_keys:
        _redis.delete(*(keys + nonce_keys))

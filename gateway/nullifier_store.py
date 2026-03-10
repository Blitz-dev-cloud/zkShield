import json
import os

NULLIFIER_FILE = "gateway/used_nullifiers.json"

def _load_nullifiers():
    if not os.path.exists(NULLIFIER_FILE):
        return set()
    with open(NULLIFIER_FILE, "r") as f:
        data = json.load(f)
    return set(data)

def _save_nullifiers(nullifiers):
    with open(NULLIFIER_FILE, "w") as f:
        json.dump(list(nullifiers), f, indent=2)

def check_and_store_nullifier(auth_public):
    nullifiers = _load_nullifiers()

    if len(auth_public) < 2:
        return False, "Invalid auth_public format"

    nullifier = auth_public[1]

    if nullifier in nullifiers:
        return False, "Replay attack detected"

    nullifiers.add(nullifier)
    _save_nullifiers(nullifiers)
    return True, "Nullifier accepted"
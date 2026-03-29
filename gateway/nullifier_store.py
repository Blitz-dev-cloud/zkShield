import json
import os

# Tracks ML proof nullifiers per packet (prevents double-spending packets)
ML_NULLIFIER_FILE = "gateway/used_ml_nullifiers.json"

# Tracks authorized users (auth_public nullifiers)
AUTH_NULLIFIER_FILE = "gateway/authorized_users.json"

def _load_ml_nullifiers():
    """Load ML proof nullifiers (per-packet)"""
    if not os.path.exists(ML_NULLIFIER_FILE):
        return set()
    with open(ML_NULLIFIER_FILE, "r") as f:
        data = json.load(f)
    return set(data)

def _save_ml_nullifiers(nullifiers):
    with open(ML_NULLIFIER_FILE, "w") as f:
        json.dump(list(nullifiers), f, indent=2)

def _load_authorized_users():
    """Load authorized user nullifiers (from auth proofs)"""
    if not os.path.exists(AUTH_NULLIFIER_FILE):
        return set()
    with open(AUTH_NULLIFIER_FILE, "r") as f:
        data = json.load(f)
    return set(data)

def _save_authorized_users(users):
    with open(AUTH_NULLIFIER_FILE, "w") as f:
        json.dump(list(users), f, indent=2)

def check_user_authorized(auth_public):
    """
    Check if user is authorized (one-time per auth generation).
    User is tracked by their nullifier from the auth proof.
    """
    users = _load_authorized_users()
    
    if len(auth_public) < 2:
        return False, "Invalid auth_public format"
    
    user_nullifier = auth_public[1]
    
    if user_nullifier not in users:
        users.add(user_nullifier)
        _save_authorized_users(users)
        return True, "User authorized"
    
    return True, "User already authorized (reusing auth proof)"

def check_and_store_ml_nullifier(ml_proof):
    """
    Check ML proof nullifier to prevent sending the same packet twice.
    Each packet should have a fresh ML proof with a unique nullifier.
    """
    nullifiers = _load_ml_nullifiers()
    
    # Extract nullifier from ML proof (typically first field or in metadata)
    if isinstance(ml_proof, dict):
        # If ml_proof has a structure, extract nullifier
        ml_nullifier = ml_proof.get("nullifier", str(ml_proof))
    else:
        ml_nullifier = str(ml_proof)
    
    if ml_nullifier in nullifiers:
        return False, "Packet already verified (ML proof replay detected)"
    
    nullifiers.add(ml_nullifier)
    _save_ml_nullifiers(nullifiers)
    return True, "Packet accepted"

def clear_ml_nullifiers():
    """Clear ML nullifiers (safe for testing, called after new auth)"""
    _save_ml_nullifiers(set())
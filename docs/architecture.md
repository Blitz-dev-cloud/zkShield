# zkShield++ Architecture: ZK & Cryptography Module

## Overview

zkShield++ is a protocol-level network security system where every packet carries
a zero-knowledge proof. The firewall is stateless and only verifies proofs —
it never inspects packet contents, sessions, tokens, or identities.

## Two-Layer Proof System
```
SENDER                                    FIREWALL
──────                                    ────────
sk (secret key)                           auth_zkml_vk.json (Groth16 VK)
Merkle path (private)                     ezkl/vk.key (EZKL VK)
Packet features x (private)              Merkle root (public)
                │                         ML weights committed (public)
                ▼
    ┌─────────────────────────┐
    │  Layer 1: Groth16       │  →  auth_proof.json
    │  - Commitment           │     "I am authorized"
    │  - Merkle inclusion     │
    │  - Nullifier            │
    └─────────────────────────┘
    ┌─────────────────────────┐
    │  Layer 2: EZKL          │  →  ezkl/proof.json
    │  - Neural network       │     "My packet is SAFE"
    │  - Inference proof      │
    └─────────────────────────┘
                │
                └──── both proofs attached to packet ────► VERIFY → PASS/DROP
```

## Component Breakdown

### Groth16 Auth Circuit (auth_zkml.circom)
- Proves sender identity via Merkle inclusion
- Uses Poseidon hash for ZK-friendly commitments
- Includes nullifier to prevent replay attacks
- Produces a ~200 byte proof (3 elliptic curve points)

### EZKL ML Circuit
- PyTorch neural network (5 input → 16 → 8 → 1 output)
- Trained on 1000 synthetic network packet samples
- Achieves 76% classification accuracy
- EZKL converts inference to ZK proof automatically

### Merkle Tree (Depth 3)
- Stores commitments of all authorized senders
- Admin updates root to add/revoke senders
- Prover provides sibling path privately
- Circuit verifies path leads to public root

## Data Flow
```
1. Admin registers sender:
   sk → c = Poseidon(sk) → insert c into Merkle tree → publish root

2. Sender generates proof (per packet):
   sk + path + features → ZK circuits → (auth_proof, ml_proof)

3. Packet transmission:
   packet + auth_proof + auth_public + ml_proof → firewall

4. Firewall verification:
   verify(auth_proof, vk, public) → OK/FAIL
   verify(ml_proof, vk, settings) → OK/FAIL
   both OK → forward packet
   any FAIL → drop packet
```

## Frontend Integration (Next.js Dashboard)

The `frontend/` app is now wired to the real proving scripts through server-side
API routes (Node runtime):

```
frontend UI (Generate / Verify pages)
            │  fetch("/api/workflow/*")
            ▼
Next.js route handlers (frontend/app/api/workflow/*)
            │  spawn("bash", ["scripts/gen_proof.sh" | "scripts/verify_proof.sh"])
            ▼
Project scripts/ (Groth16 + EZKL CLI pipeline)
            │
            ▼
Artifacts on disk:
   - proofs/auth_proof.json
   - proofs/auth_public.json
   - ml/ezkl/proof.json
```

### API Endpoints

- `POST /api/workflow/generate`
   - Runs `scripts/gen_proof.sh`
   - Returns generation status, public inputs (`root`, `nullifier_hash`), artifact paths, and logs

- `POST /api/workflow/verify`
   - Runs `scripts/verify_proof.sh`
   - Returns verification statuses (`authStatus`, `mlStatus`), final verdict (`pass`/`drop`), public inputs, and logs

- `POST /api/workflow/send`
   - Loads `proofs/auth_proof.json`, `proofs/auth_public.json`, `ml/ezkl/proof.json`
   - Sends packet + proofs to gateway endpoint (`/packet`)
   - Returns gateway PASS/DROP response and delivery logs

### Script Hardening for API Execution

The shell scripts are configured for backend execution reliability:

- `set -euo pipefail` enabled (fail fast with proper non-zero exit codes)
- Script-local root resolution (`ROOT_DIR=.../..`) so they work from any CWD
- Explicit virtualenv activation path (`source "$ROOT_DIR/venv/bin/activate"`)
- ML verification exits non-zero on failure (frontend receives correct failure state)

## Security Properties

| Property | Mechanism |
|---|---|
| Zero identity leakage | sk never revealed, only proof |
| Replay prevention | Nullifier = Poseidon(sk, 0) |
| Revocation | Admin updates Merkle root |
| ML integrity | EZKL proves correct inference |
| Stateless firewall | Only needs vk.json to verify |

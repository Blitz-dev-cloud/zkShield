# zkShield++ Protocol Specification

> **A zero-knowledge network firewall where every packet carries a cryptographic proof of both identity and ML-based safety — without ever revealing packet contents, identities, or model weights.**

---

## 1. Protocol Overview

### 1.1 Purpose

zkShield++ is a stateless, zero-knowledge firewall that makes packet accept/drop decisions based on:

1. **Identity Layer (Groth16)**: Proof that sender is authorized (Merkle tree membership + nullifier)
2. **Safety Layer (EZKL)**: Proof that packet features are safe (neural network inference)

Neither the firewall nor any observer can see:
- Sender's raw identity
- Packet contents  
- Model weights or structure
- Session state (fully stateless after auth)

---

## 2. Cryptographic Foundation

### 2.1 Layer 1: Authentication (Groth16)

**Circuit**: `circuits/auth_zkml.circom`

**Public Inputs** (revealed to firewall):
- `root`: Merkle tree root (commitment to authorized users)
- `nullifierHash`: Hash of sender's nullifier (replays prevented, anonymity preserved)

**Private Inputs** (known only to sender):
- `secret`: Sender's secret key
- `leaf`: "identity" = SHA256(secret)  
- `pathElements[]`: Merkle path to root
- `pathIndices[]`: Position along path

**Proof Format** (Groth16):
```json
{
  "pi_a": [x, y, 1],      // E(G1) commitment to A
  "pi_b": [[x, y], [x, y], [1, 0]],  // E(G2) commitment to B  
  "pi_c": [x, y, 1],      // E(G1) commitment to C
  "protocol": "groth16"
}
```

**Verification**:
```
verify(proof, public_inputs, verification_key) → accept/reject
```

Using snarkjs pairing equations:
```
e(A, B) = e(C, δ) · e(γ, ∑(pub[i] * γ_i))
```

### 2.2 Layer 2: ML Safety (EZKL/KZG)

**Model**: `ml/model/packet_classifier.onnx`

**Input Features** (normalized):
1. Packet size (bytes)
2. Request rate (packets/sec)
3. Port category (0-4)
4. Protocol (0-5)
5. Entropy (bits)

**Output**: Probability that packet is safe (≥ 0.5 → safe)

**Proof Format** (EZKL/KZG):
```json
{
  "instances": [[normalized_input]],
  "proof": "...",  // KZG commitment proof
  "transcript_type": "EVM"
}
```

**Verification**:
```
kzg_verify(proof, public_outputs, srs) → accept/reject
```

---

## 3. Network Flow

### 3.1 Authorization Phase (One-Time)

```
┌─────────┐                                      ┌──────────────┐
│ Sender  │                                      │   Gateway    │
└────┬────┘                                      └──────┬───────┘
     │                                                   │
     │ 1. Secret key (offline, private)                 │
     │    ↓                                              │
     │ 2. Compute: leaf = SHA256(secret)                │
     │    Merkle path from tree                         │
     │    nullifierHash = SHA256(secret)                │
     │    ↓                                              │
     │ 3. Generate Groth16 proof (snarkjs)             │
     │    auth_proof.json                               │
     │    auth_public = [root, nullifierHash]           │
     │    ↓                                              │
     ├─── POST /auth ──────────────────────────────────>│
     │    Body: {                                        │
     │      auth_proof: {...},                           │
     │      auth_public: [root, nullifier]              │
     │    }                                              │
     │<─── session_id ──────────────────────────────────┤
     │    Verify proof using VK                          │
     │    Store session_id + nullifier                   │
     │    Return: {                                      │
     │      session_id: "abc...",                        │
     │      user_nullifier: nullifier                    │
     │    }                                              │
```

**Validation on gateway**:
1. Parse auth_proof and auth_public
2. Call `snarkjs groth16 verify(vk, proof, public)` 
3. If OK: Store session_id in memory, index by nullifier
4. If FAIL: Return 403 error

**Security**:
- Nullifier prevents replay: same user can't authorize twice
- Root proves membership without revealing identity
- snarkjs verifies all pairing equations are satisfied

---

### 3.2 Packet Send Phase (Repeated)

```
┌─────────┐                                      ┌──────────────┐
│ Sender  │                                      │   Gateway    │
└────┬────┘                                      └──────┬───────┘
     │                                                   │
     │ 1. Prepare packet:                               │
     │    - payload (any data)                           │
     │    - Extract features:                            │
     │      size, request_rate, port, protocol, entropy │
     │    ↓                                              │
     │ 2. Normalize features (z-score):                 │
     │    f_norm = (f - mean) / scale                    │
     │    ↓                                              │
     │ 3. Run ONNX model → safety score                 │
     │    score ≥ 0.5 → safe                            │
     │    ↓                                              │
     │ 4. Generate EZKL proof:                           │
     │    Prove: model(features) → output_safe          │
     │    Without revealing: weights, features, output  │
     │    ↓                                              │
     │ 5. Create packet:                                │
     │    {                                              │
     │      payload: "...",                              │
     │      session_id: from_auth,                       │
     │      ml_proof: {...}                              │
     │    }                                              │
     │    ↓                                              │
     ├─── POST /packet ─────────────────────────────────>│
     │    Body: {                                        │
     │      payload,                                     │
     │      session_id,                                  │
     │      ml_proof                                     │
     │    }                                              │
     │<─── PASS/DROP ────────────────────────────────────┤
     │    1. Check: session_id valid (in memory)         │
     │    2. Verify: ml_proof using EZKL                 │
     │    3. If both OK: PASS                            │
     │    4. If either fails: DROP                       │
     │    Return: {                                      │
     │      status: "PASS" | "DROP",                     │
     │      message: "...",                              │
     │      payload: (if PASS)                           │
     │    }                                              │
```

**Validation on gateway**:
1. Check session_id exists and is not expired
2. Parse ml_proof
3. Call `ezkl.verify(ml_proof, settings, vk)`
4. If ALL checks pass: `status = PASS`, forward payload
5. Otherwise: `status = DROP`, log reason

**Security**:
- session_id tethered to auth nullifier (no cross-user spoofing)
- ml_proof prevents tampering with features
- Each packet gets fresh proof (no replay)

---

## 4. Gateway API

### 4.1 Route: POST /auth

**Purpose**: One-time user authorization

**Request**:
```json
{
  "auth_proof": {
    "pi_a": [...],
    "pi_b": [...],
    "pi_c": [...]
  },
  "auth_public": ["0x...", "0x..."]
}
```

**Response (200)**:
```json
{
  "status": "AUTHORIZED",
  "message": "User authorized",
  "session_id": "uuid-v4",
  "user_nullifier": "0x..."
}
```

**Response (403)**:
```json
{
  "status": "DROP",
  "message": "Auth proof invalid"
}
```

**Errors**:
- 400: Invalid JSON or missing fields
- 403: Proof verification failed
- 500: Internal error

---

### 4.2 Route: POST /packet

**Purpose**: Send an authenticated packet

**Request**:
```json
{
  "payload": "application data",
  "session_id": "uuid-v4",
  "ml_proof": {
    "instances": [...],
    "proof": "..."
  }
}
```

**Response (200 - PASS)**:
```json
{
  "status": "PASS",
  "message": "Packet verified and forwarded",
  "payload": "application data"
}
```

**Response (200 - DROP)**:
```json
{
  "status": "DROP",
  "message": "ML proof invalid"
}
```

**Response (403)**:
```json
{
  "status": "DROP",
  "message": "Invalid or expired session"
}
```

**Errors**:
- 400: Invalid JSON
- 403: Session invalid or ML proof invalid
- 500: Internal error

---

### 4.3 Route: GET /health

**Purpose**: Health check

**Response**:
```json
{ "status": "ok" }
```

---

## 5. Data Formats

### 5.1 Merkle Tree Structure

**File**: `circuits/merkle_input.json`

```json
{
  "secret": "42",
  "leaf": "0x...",  // SHA256(secret)
  "levels": [
    "0x...",  // level 0
    "0x...",  // level 1
    ...
  ],
  "root": "0x..."   // final Merkle root
}
```

### 5.2 Auth Input

**File**: `circuits/auth_input.json`

```json
{
  "secret": "42",
  "leaf": "0x...",
  "pathElements": ["0x...", "0x...", ...],
  "pathIndices": [0, 1, 0, ...],
  "nullifierHash": "0x..."
}
```

### 5.3 Proof Artifacts

**Auth Proof**:
```
proofs/auth_proof.json        (Groth16 proof)
proofs/auth_public.json       ([root, nullifierHash])
```

**ML Proof**:
```
ml/ezkl/proof.json            (EZKL/KZG proof)
ml/ezkl/settings.json         (circuit configuration)
ml/ezkl/vk.key               (verification key)
```

---

## 6. Threat Model

### 6.1 Attacker Capabilities Assumed

- **Network attacker**: Can intercept/modify packets
- **Honest-but-curious gateway**: Won't collude but wants to infer information
- **Firewall operator**: Can inspect logs/decisions

### 6.2 Security Properties

| Threat | Mitigation |
|--------|-----------|
| Replay auth | Nullifier → can't re-authorize |
| Replay packet | Fresh ML proof per packet |
| Feature manipulation | ML proof binds features |
| Identity leakage | Merkle proof hides identity |
| Weight inference | EZKL hides model internals |
| Session hijack | session_id is random UUID |
| Denial of service | Stateless (no per-user overhead) |

### 6.3 Trust Assumptions

1. **Public parameters trusted**: Merkle root, model, ML settings
2. **Verification keys trusted**: Auth VK and ML VK from setup ceremony
3. **Cryptography non-broken**: SHA256, Groth16 pairing checks


---

## 7. Setup and Deployment

### 7.1 Prerequisites

```bash
# System dependencies
apt install nodejs npm git

# JavaScript/Circom tools
npm install -g snarkjs circom

# Python
python3.9+ with pip

# EZKL (Python package)
pip install ezkl requests
```

### 7.2 Circuit Setup (One-Time)

```bash
# Compile Circom circuits
cd circuits
circom auth_zkml.circom --output build --wasm

# Generate Groth16 setup (powers of tau)
curl https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau \
  -o build/pot12_final.ptau

# Phase 2: Circuit-specific setup
snarkjs zkey new build/auth_zkml.r1cs build/pot12_final.ptau \
  build/auth_zkml.zkey

# Generate verification key
snarkjs zkey export verificationkey build/auth_zkml.zkey \
  build/auth_zkml_vk.json
```

### 7.3 ML Model Setup

```bash
# Compile model to ONNX
cd ml/model
python train_model.py           # (optional: retrain)
python export_onnx.py

# EZKL setup
cd ../ezkl
python run_ezkl.py              # Runs full pipeline: gen_witness, prove, verify
```

### 7.4 Gateway Deployment

```bash
# Start gateway server
cd gateway
python3 gateway.py              # Listens on http://127.0.0.1:5001

# Load auth/ML verification keys
# (gateway.py loads automatically from zk-setup/ and ml/ezkl/)
```

### 7.5 Frontend Deployment

```bash
# Install Next.js dependencies
cd frontend
npm install

# Run dev server
npm run dev                      # http://localhost:3000

# Or build for production
npm run build
npm run start
```

---

## 8. CLI Usage

### 8.1 Installation

```bash
# Install dependencies
pip install click click-help-colors requests

# Make CLI executable
chmod +x cli.py

# Optional: add to PATH
sudo ln -s /path/to/cli.py /usr/local/bin/zkshield-cli
```

### 8.2 Basic Workflow

```bash
# Step 1: Authorize
zkshield-cli auth --secret-key 12345

# Step 2: Send packets
zkshield-cli send --session-id <SID> --payload "hello"
zkshield-cli send --session-id <SID> --payload "world"

# Step 3: Check status
zkshield-cli status --check-gateway
```

### 8.3 Other Commands

```bash
# Generate all proofs
zkshield-cli generate --secret-key 42

# List status
zkshield-cli status

# Configure gateway
zkshield-cli config set gateway_url http://my-gateway:5001
```

---

## 9. Troubleshooting

### Issue: "Could not find zkShield++ repository root"

**Cause**: Running CLI from outside project directory

**Fix**: Either:
1. Run from within `/path/to/zkShield++/`
2. Set env var: `export ZKSHIELD_REPO=/path/to/zkShield++`

---

### Issue: "auth proof generation failed"

**Cause**: Missing Node.js tools or circuits not compiled

**Fix**:
```bash
npm install -g snarkjs circom
cd circuits && circom auth_zkml.circom --output build --wasm
```

---

### Issue: "Gateway unreachable"

**Cause**: Gateway server not running or wrong URL

**Fix**:
```bash
# Terminal 1: Start gateway
python3 gateway/gateway.py

# Terminal 2: Try CLI command
zkshield-cli status --check-gateway
```

---

### Issue: "Invalid session"

**Cause**: Session expired (default: 24 hours) or wrong session ID

**Fix**:
1. Re-authorize: `zkshield-cli auth`
2. Use new session ID: `zkshield-cli send --session-id <NEW_SID>`

---

### Issue: "ML proof generation failed"

**Cause**: EZKL Python package missing or model files corrupt

**Fix**:
```bash
pip install --upgrade ezkl
python3 ml/ezkl/run_ezkl.py  # Test EZKL directly

# If still fails, retrain model
python3 ml/model/train_model.py
python3 ml/model/export_onnx.py
```

---

## 10. Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Proof generation (auth) | 2-5s | snarkjs on laptop |
| Proof generation (ML) | 10-30s | EZKL depends on model size |
| Proof verification (auth) | <100ms | Pairing checks |
| Proof verification (ML) | <100ms | KZG verification |
| Packet throughput | 100-500/sec | Per session (varies by HW) |
| Proof size (auth) | ~500 bytes | Groth16 standard size |
| Proof size (ML) | 50-100 KB | EZKL/KZG variable |

---

## 11. Future Enhancements

- [ ] Recursive proofs for batching
- [ ] GPU acceleration for EZKL
- [ ] Threshold multi-sig for gateway verification
- [ ] On-chain verification (Ethereum integration)
- [ ] Distributed Merkle tree updates
- [ ] More sophisticated feature extraction
- [ ] Adaptive model retraining

---

## 12. References

- [snarkjs](https://github.com/iden3/snarkjs) - Groth16 proving/verification
- [EZKL](https://github.com/zkonduit/ezkl) - ML proof generation
- [Circom](https://docs.circom.io/) - ZK circuit language
- [KZG Polynomial Commitments](https://dankradfeist.de/ethereum/2020/06/16/kate-polynomial-commitments.html)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)

---

**Version**: 0.1.0  
**Last Updated**: March 2026  
**Maintainer**: zkShield++ Team

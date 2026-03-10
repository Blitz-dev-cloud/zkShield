# zkShield++

> **A zero-knowledge network firewall where every packet carries a cryptographic proof of both identity and ML-based safety — without ever revealing packet contents, identities, or model weights.**

---

## What is zkShield++?

zkShield++ is a protocol-level network security system built on two layers of ZK proofs:

| Layer | System | Proves |
|---|---|---|
| **Layer 1** | Groth16 (snarkjs + circom) | Sender is authorized (Merkle inclusion, nullifier) |
| **Layer 2** | EZKL (KZG) | Packet features are safe (neural network inference) |

The firewall is **fully stateless** — it only needs two verification keys to decide pass/drop. It never inspects raw packet contents, sessions, or identities.

```
SENDER                                          FIREWALL
──────                                          ────────
secret key (sk)          ───── auth_proof ────► verify(auth_proof, vk) ──► OK/DROP
Merkle path (private)    
Packet features          ───── ml_proof ──────► verify(ml_proof, vk)   ──► OK/DROP
```

---

## Architecture

```
zkShield++/
├── circuits/           # Circom ZK circuits
│   ├── auth_zkml.circom      ← main unified auth circuit
│   ├── merkle.circom         ← standalone Merkle circuit (testing)
│   ├── test_commitment.circom← commitment test circuit
│   └── build/                ← compiled R1CS + WASM (gitignored)
│
├── ml/
│   ├── dataset/
│   │   └── generate_dataset.py   ← generates synthetic packet CSV
│   ├── model/
│   │   ├── train_model.py        ← trains PyTorch classifier
│   │   └── export_onnx.py        ← exports model to ONNX
│   └── ezkl/
│       └── run_ezkl.py           ← full EZKL pipeline (setup → prove → verify)
│
├── scripts/
│   ├── compute_tree.js       ← prints Merkle tree structure
│   ├── compute_inputs.js     ← computes and writes auth_input.json
│   ├── setup_zk.sh           ← full ZK setup from scratch
│   ├── gen_proof.sh          ← generates both proofs
│   └── verify_proof.sh       ← firewall simulation (verify both proofs)
│
├── proofs/                   ← generated proof files (gitignored)
├── zk-setup/                 ← zkeys, ptau, vk files (gitignored)
└── docs/                     ← architecture, protocol spec, threat model
```

---

## Prerequisites

### System
```bash
# Node.js (v18+)
node --version

# snarkjs
npm install -g snarkjs

# circom (v2)
# Install from: https://docs.circom.io/getting-started/installation/
circom --version

# Python 3.10+
python3 --version
```

### Python packages
```bash
python3 -m venv venv
source venv/bin/activate
pip install torch torchvision onnx ezkl scikit-learn pandas numpy
```

### Node packages
```bash
npm install          # root (snarkjs, etc.)
cd circuits && npm install && cd ..   # circomlibjs for scripts
```

---

## Quickstart

### Step 1 — ML Pipeline (run once)
```bash
source venv/bin/activate

# Generate synthetic packet dataset (1000 samples)
python3 ml/dataset/generate_dataset.py

# Train the neural network classifier
python3 ml/model/train_model.py

# Export to ONNX format
python3 ml/model/export_onnx.py
```

The model is a 3-layer network: `Linear(5→16) → ReLU → Linear(16→8) → ReLU → Linear(8→1) → Sigmoid`  
Input features: `packet_size, request_rate, port_category, protocol_type, payload_entropy`  
Output: probability > 0.5 = **SAFE**

---

### Step 2 — ZK Setup (run once)
```bash
bash scripts/setup_zk.sh
```

This does:
1. Compiles `auth_zkml.circom` → R1CS + WASM
2. Runs Groth16 trusted setup (Powers of Tau → zkey → final zkey → vk)
3. Runs full EZKL pipeline (compile circuit → get SRS → generate keys)

Or manually:
```bash
# Compile circuit
cd circuits
circom auth_zkml.circom --r1cs --wasm --sym -o build/
cd ..

# Powers of Tau (universal setup)
snarkjs powersoftau new bn128 12 zk-setup/pot12_0.ptau -v
snarkjs powersoftau contribute zk-setup/pot12_0.ptau zk-setup/pot12_1.ptau --name="zkShield++"
snarkjs powersoftau prepare phase2 zk-setup/pot12_1.ptau zk-setup/pot12_final.ptau

# Circuit-specific setup
snarkjs groth16 setup circuits/build/auth_zkml.r1cs zk-setup/pot12_final.ptau zk-setup/auth_zkml.zkey
snarkjs zkey contribute zk-setup/auth_zkml.zkey zk-setup/auth_zkml_final.zkey --name="zkShield++"
snarkjs zkey export verificationkey zk-setup/auth_zkml_final.zkey zk-setup/auth_zkml_vk.json

# EZKL setup
source venv/bin/activate
python3 ml/ezkl/run_ezkl.py
```

---

### Step 3 — Generate Proofs (per packet)
```bash
bash scripts/gen_proof.sh
```

Or manually:
```bash
# Compute Merkle inputs → writes circuits/auth_input.json
node scripts/compute_inputs.js

# Generate witness
cd circuits
node build/auth_zkml_js/generate_witness.js \
     build/auth_zkml_js/auth_zkml.wasm \
     auth_input.json \
     auth_witness.wtns
mv auth_witness.wtns ../proofs/
cd ..

# Generate Groth16 proof
snarkjs groth16 prove \
    zk-setup/auth_zkml_final.zkey \
    proofs/auth_witness.wtns \
    proofs/auth_proof.json \
    proofs/auth_public.json

# Generate EZKL ML proof
source venv/bin/activate
python3 ml/ezkl/run_ezkl.py
```

**Output:**
```
proofs/auth_proof.json    ← Groth16 identity proof
proofs/auth_public.json   ← public inputs (root, nullifier_hash)
ml/ezkl/proof.json        ← EZKL ML safety proof
```

---

### Step 4 — Verify (Firewall)
```bash
bash scripts/verify_proof.sh
```

Or manually:
```bash
# Verify Groth16 auth proof
snarkjs groth16 verify \
    zk-setup/auth_zkml_vk.json \
    proofs/auth_public.json \
    proofs/auth_proof.json

# Verify EZKL ML proof
source venv/bin/activate
python3 -c "
import ezkl
result = ezkl.verify('ml/ezkl/proof.json', 'ml/ezkl/settings.json', 'ml/ezkl/vk.key', srs_path='ml/ezkl/kzg.srs')
print('SAFE' if result else 'FAILED')
"
```

**Expected output:**
```
[INFO]  snarkJS: OK!
ML Proof: VERIFIED - Packet is SAFE
```

---

## Circuit Details

### `auth_zkml.circom` — Unified Auth Circuit

```
Private inputs:  sk, path[3], pathIndices[3]
Public inputs:   root, nullifier_hash

Constraints:
  c              = Poseidon(sk)                    ← commitment
  nullifier_hash = Poseidon(sk, 0)                 ← replay prevention
  Merkle path    → computed root === public root   ← authorization
```

**Stats:**
```
Non-linear constraints : 1197
Public inputs          : 2
Private inputs         : 7
Wires                  : 2497
```

**Groth16 verification equation (what the firewall checks):**
$$e(A, B) = e(\alpha, \beta) \cdot e(C, \gamma) \cdot e(\text{inputs}, \delta)$$

---

## Security Properties

| Threat | Mitigation |
|---|---|
| Identity spoofing | Poseidon commitment; attacker can't forge Merkle proof without `sk` |
| Proof replay | Nullifier `= Poseidon(sk, 0)` — duplicate nullifiers are rejected |
| Merkle manipulation | Circuit constrains computed root to equal public root |
| ML evasion | Model weights committed in EZKL circuit |
| Sender revocation | Admin publishes new Merkle root; old proofs immediately fail |

---

## Key Files Reference

| File | Description |
|---|---|
| `circuits/auth_zkml.circom` | Main ZK circuit (identity + nullifier + Merkle) |
| `scripts/compute_inputs.js` | Computes Poseidon hashes and writes `auth_input.json` |
| `scripts/compute_tree.js` | Prints Merkle tree for debugging |
| `ml/model/train_model.py` | Trains the packet safety classifier |
| `ml/model/export_onnx.py` | Exports PyTorch model to ONNX |
| `ml/ezkl/run_ezkl.py` | Full EZKL pipeline (setup + prove + verify) |
| `scripts/setup_zk.sh` | One-shot ZK setup |
| `scripts/gen_proof.sh` | One-shot proof generation |
| `scripts/verify_proof.sh` | One-shot firewall verification |
| `docs/architecture.md` | Full system architecture |
| `docs/protocol-spec.md` | Cryptographic variables and constraints |
| `docs/threat-model.md` | Full threat model and trust assumptions |

---

## Docs

- [Architecture](docs/architecture.md) — system design and data flow
- [Protocol Spec](docs/protocol-spec.md) — all circuit variables, constraints, and crypto primitives
- [Threat Model](docs/threat-model.md) — attack surface and mitigations
- [Commands Reference](docs/commands.md) — full command reference

---

## Tech Stack

| Component | Technology |
|---|---|
| ZK circuits | [Circom 2](https://docs.circom.io/) + [circomlib](https://github.com/iden3/circomlib) |
| Groth16 prover/verifier | [snarkjs](https://github.com/iden3/snarkjs) |
| Hash function | Poseidon (ZK-native, ~240 constraints) |
| ML framework | PyTorch + ONNX |
| ML ZK proofs | [EZKL](https://github.com/zkonduit/ezkl) (KZG polynomial commitments) |
| Elliptic curve | BN128 (BN254) |

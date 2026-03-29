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
├── frontend/                 ← Next.js dashboard (Generate/Verify UI)
│   └── app/api/workflow/     ← API routes wired to project scripts
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

## Frontend Dashboard (Integrated)

The `frontend/` app now calls real backend workflow scripts (not mock data).

### Run dashboard

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`:

- **Generate page** calls `POST /api/workflow/generate`
  - executes `scripts/gen_proof.sh`
  - returns proof statuses + `root` + `nullifier_hash` + logs
  - supports **Send Packet** to gateway using generated proofs

- **Verify page** calls `POST /api/workflow/verify`
  - executes `scripts/verify_proof.sh`
  - returns auth/ML verification status + PASS/DROP verdict + logs

- **Send API** (`POST /api/workflow/send`)
  - reads generated proof artifacts from disk
  - forwards payload + proofs to gateway `/packet`

The API routes are server-side Node handlers in:

- `frontend/app/api/workflow/generate/route.ts`
- `frontend/app/api/workflow/verify/route.ts`

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

---

## 🎯 CLI Tool (New!)

### Installation

The CLI provides a command-line interface for all zkShield++ operations without needing the browser UI.

```bash
# Install dependencies
pip install click click-help-colors requests

# Make executable
chmod +x cli.py
```

### Basic Usage

```bash
# Authorize (one-time)
python3 cli.py auth --secret-key mykey

# Send packet
python3 cli.py send --session-id <ID> --payload "hello"

# Check status
python3 cli.py status --check-gateway

# Generate proofs
python3 cli.py generate --secret-key mykey

# Verify locally
python3 cli.py verify
```

### Commands

| Command | Purpose |
|---------|---------|
| `auth` | Authorize with gateway (creates session) |
| `send` | Send authenticated packet through firewall |
| `generate` | Generate all proofs (auth + ML) |
| `status` | Check artifacts and gateway reachability |
| `verify` | Verify proofs locally |
| `config` | Manage configuration (~/.zkshield/config.json) |

**Full Documentation**: See [docs/CLI.md](docs/CLI.md)

### Example Workflow

```bash
# Terminal 1: Start gateway
python3 gateway/gateway.py

# Terminal 2: Authorize
SID=$(python3 cli.py auth | grep "session_id:" | cut -d' ' -f2)

# Send packets
for i in {1..5}; do
    python3 cli.py send --session-id "$SID" --payload "packet $i"
done

# Check status
python3 cli.py status --check-gateway
```

---

## 🚀 Gateway Server

The gateway is the firewall verifier. It receives packets and makes pass/drop decisions using the two ZK verification keys.

### Start Gateway

```bash
python3 gateway/gateway.py
```

Default: `http://127.0.0.1:5001`

**Routes:**
- `POST /auth` — Authorize user (creates session)
- `POST /packet` — Send packet (requires valid session + ML proof)
- `GET /health` — Health check

**Request/Response Examples:**

Auth:
```bash
curl -X POST http://127.0.0.1:5001/auth \
  -H "Content-Type: application/json" \
  -d '{ "auth_proof": {...}, "auth_public": [...] }'
# Response: { "session_id": "...", "user_nullifier": "..." }
```

Send Packet:
```bash
curl -X POST http://127.0.0.1:5001/packet \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "hello",
    "session_id": "...",
    "ml_proof": {...}
  }'
# Response: { "status": "PASS", "message": "...", "payload": "hello" }
```

---

## 📚 Documentation

| Document | Contents |
|----------|----------|
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | Full protocol specification, cryptography, API details |
| [docs/CLI.md](docs/CLI.md) | CLI tool reference with examples and workflows |
| [docs/SETUP.md](docs/SETUP.md) | Development setup, local testing, production deployment |
| [docs/architecture.md](docs/architecture.md) | System design and data flow |
| [docs/protocol-spec.md](docs/protocol-spec.md) | Circuit details and crypto primitives |
| [docs/threat-model.md](docs/threat-model.md) | Security analysis and attack surface |

---

## 🔄 Complete End-to-End Demo

Run all phases automatically:

```bash
bash scripts/demo.sh
```

Or step by step:

```bash
# 1. ML pipeline (dataset → train → export)
python3 ml/dataset/generate_dataset.py
python3 ml/model/train_model.py
python3 ml/model/export_onnx.py
python3 ml/ezkl/run_ezkl.py

# 2. ZK setup (compile → trusted setup)
bash scripts/setup_zk.sh

# 3. Start gateway
python3 gateway/gateway.py &

# 4. Frontend
cd frontend && npm run dev &

# 5. CLI test
python3 cli.py auth && python3 cli.py send --session-id <SID>
```

---

## 🐳 Docker Deployment (New!)

### Quick Start

```bash
docker-compose up -d
```

Includes:
- Gateway (Python)
- Frontend (Next.js)
- Redis (session state)
- Nginx (reverse proxy)

For production deployment instructions, see [docs/SETUP.md](docs/SETUP.md).

---

## 📊 Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Auth proof generation | 2-5s | snarkjs on laptop CPU |
| ML proof generation | 10-30s | EZKL/model-dependent |
| Auth verification | <100ms | Pairing equations |
| ML verification | <100ms | KZG commitment check |
| Packet throughput | 100-500/sec | Per session, HW-dependent |

---

## 🔧 Troubleshooting

### Gateway not starting
```bash
# Check port usage
lsof -i :5001

# Kill existing process
kill -9 <PID>

# Try different port
GATEWAY_PORT=5002 python3 gateway/gateway.py
```

### Proof generation fails
```bash
# Reinstall Node tools
npm install -g snarkjs circom

# Regenerate artifacts
bash scripts/setup_zk.sh
```

### EZKL import error
```bash
# Upgrade EZKL
pip install --upgrade ezkl

# Test directly
python3 ml/ezkl/run_ezkl.py
```

For more issues, see [docs/SETUP.md#troubleshooting](docs/SETUP.md#troubleshooting).

---

## 📄 License

Apache 2.0 — See LICENSE for details.

---

## 🤝 Contributing

Contributions welcome! See CONTRIBUTING.md for guidelines.

---

**Version**: 0.1.0  
**Status**: Alpha — actively developed  
**Maintained by**: zkShield++ Team

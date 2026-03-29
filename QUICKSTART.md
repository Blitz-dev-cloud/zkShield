# zkShield++ Quick Start Guide

Get the zkShield++ protocol running in 15 minutes.

---

## Prerequisites (5 minutes)

### Install System Tools

```bash
# Node.js 18+ and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3.10+
sudo apt install -y python3.10 python3.10-venv python3-pip

# Global CLI tools
npm install -g snarkjs circom
```

### Clone & Navigate

```bash
git clone https://github.com/zkshield/zkshield-pp.git
cd zkshield-pp
```

---

## Setup (5 minutes)

### 1. Python Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Node Packages

```bash
npm install &
cd circuits && npm install &
cd frontend && npm install &
wait
```

### 3. ZK Setup

```bash
bash scripts/setup_zk.sh
```

This generates:
- `zk-setup/auth_zkml_final.zkey` (~50 MB)
- `zk-setup/auth_zkml_vk.json` (verification key)
- `ml/ezkl/vk.key` (ML verification key)

### 4. Generate Test Proofs

```bash
python3 cli.py generate --secret-key testuser
```

---

## Run (5 minutes)

### Terminal 1: Start Gateway

```bash
python3 gateway/gateway.py
# Output: Running on http://127.0.0.1:5001
```

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
# Open http://localhost:3000 in browser
```

### Terminal 3: Try CLI

```bash
# Authorize
python3 cli.py auth --secret-key testuser --save-session

# Send packet
python3 cli.py send --payload "Hello firewall!"

# Check status
python3 cli.py status --check-gateway
```

---

## What You Just Did

```
SENDER                           GATEWAY                    FIREWALL VK
──────────────                   ──────────                 ────────────
secret key      ──────────────►  /auth endpoint  ─────────► Groth16 verify
Merkle proof    generates auth                             (checks nullifier, root)
                ◄──────────────  session_id + nullifier
                
                Packet + ML proof ────────────────────────► KZG verify
                /packet endpoint                          (checks ML safety)
                ◄──────────────────────────────────────── PASS/DROP
```

**You created:**
1. **Auth Proof** — Your identity commitment (without revealing your secret)
2. **Session** — Permission to send multiple packets
3. **ML Proof** — Proof that packet is safe (without revealing the model)
4. **Decision** — PASS or DROP from the firewall

---

## Next Steps

### Option A: Browser UI

1. Open http://localhost:3000
2. Go to "Transfer" page
3. Click "Authorize Once"
4. Send packets via "Send Packet" button

### Option B: CLI Tool (Recommended for automation)

```bash
# Send multiple packets
for i in {1..10}; do
  python3 cli.py send --payload "Packet $i"
done

# Load testing
./scripts/load_test.py --packets 100 --threads 4

# Monitor
python3 cli.py status --check-gateway --verbose
```

### Option C: Direct Gateway API

```bash
# Authorize
curl -X POST http://127.0.0.1:5001/auth \
  -H "Content-Type: application/json" \
  -d @proofs/auth_proof.json

# Send packet
curl -X POST http://127.0.0.1:5001/packet \
  -H "Content-Type: application/json" \
  -d '{"payload":"test", "session_id":"...", "ml_proof":...}'
```

---

## Documentation

| Link | Content |
|------|---------|
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | Full protocol spec & cryptography |
| [docs/CLI.md](docs/CLI.md) | CLI reference with all commands |
| [docs/SETUP.md](docs/SETUP.md) | Production deployment guide |
| [README.md](README.md) | Architecture & overview |

---

## Common Commands

```bash
# Authorization (one-time)
python3 cli.py auth --secret-key mykey --save-session

# Send packet
python3 cli.py send --payload "data"

# Generate new proofs
python3 cli.py generate

# Check gateway
python3 cli.py status --check-gateway

# Save configuration
python3 cli.py config set gateway_url http://my-gateway:5001

# View logs
python3 cli.py auth --verbose
python3 cli.py send --verbose
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `snarkjs: command not found` | `npm install -g snarkjs` |
| `ModuleNotFoundError: click_help_colors` | `pip install click-help-colors` |
| Port 5001 in use | `lsof -i :5001` then `kill -9 <PID>` |
| `venv` not found | `python3 -m venv .venv` then `source .venv/bin/activate` |
| Gateway unreachable | Check if running: `curl http://127.0.0.1:5001/health` |

For more help, see [docs/SETUP.md#troubleshooting](docs/SETUP.md#troubleshooting).

---

## Architecture at a Glance

```
zkShield++ (This Protocol)
├── Layer 1: Identity (Groth16 + Merkle)
│   • Proves you're authorized
│   • Prevents replay attacks
│   • Hides your identity
│
├── Layer 2: Safety (EZKL + Neural Network)
│   • Proves packet is safe
│   • Hides model weights
│   • Checks 5 packet features
│
├── Gateway (Verifier)
│   • Checks both proofs
│   • Forwards safe packets
│   • Drops suspicious ones
│
└── Stateless Firewall
    • No session storage after auth
    • Fast (100-500 packets/sec)
    • Scalable (can replicate verifiers)
```

---

## Key Files

| Path | Purpose |
|------|---------|
| `cli.py` | Command-line interface |
| `gateway/gateway.py` | Firewall server |
| `frontend/` | Browser dashboard |
| `circuits/auth_zkml.circom` | ZK circuit (identity) |
| `ml/model/` | Neural network (safety) |
| `scripts/gen_proof.sh` | Proof generation |
| `docs/` | Full documentation |

---

## Performance

- **Auth proof generation**: 2-5 seconds
- **ML proof generation**: 10-30 seconds
- **Proof verification**: <100ms each
- **Throughput**: 100-500 packets/second

---

## What's Next?

1. **Read [docs/PROTOCOL.md](docs/PROTOCOL.md)** for cryptographic details
2. **Try [docs/CLI.md](docs/CLI.md)** for full command reference
3. **Deploy to production** with [docs/SETUP.md](docs/SETUP.md)
4. **Integrate** with your application (forward packets via `/packet` endpoint)

---

## Support

- 📖 [Full Documentation](docs/)
- 🐛 [Report Issues](https://github.com/zkshield/zkshield-pp/issues)
- 💬 [Discussions](https://github.com/zkshield/zkshield-pp/discussions)

---

**Ready to secure your network with zero-knowledge proofs!** 🔒

```
"A firewall where every packet proves it's safe — without revealing anything."
```

# zkShield++ CLI Tool Guide

Command-line interface for the zkShield++ zero-knowledge network firewall protocol.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Command Reference](#command-reference)
4. [Workflows](#workflows)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites

- Python 3.8+
- Node.js 14+ (for proof generation)
- pip (Python package manager)

### Step 1: Install Python Dependencies

```bash
cd /path/to/zkShield++
pip install click click-help-colors requests
```

### Step 2: Make CLI Executable

```bash
chmod +x cli.py
```

### Step 3 (Optional): Add to PATH

For system-wide access:

```bash
sudo ln -s /path/to/zkShield++/cli.py /usr/local/bin/zkshield-cli
```

Then use anywhere:
```bash
zkshield-cli --version
```

Or run locally from project directory:
```bash
python3 cli.py --version
./cli.py --version
```

---

## Quick Start

### 1-Minute Demo

```bash
# Terminal 1: Start gateway (once)
python3 gateway/gateway.py
# Output: Running on http://127.0.0.1:5001

# Terminal 2: Authorize yourself
python3 cli.py auth

# Output should show:
#   ok: True
#   session_id: abc123...
#   user_nullifier: 0x...

# Copy session_id and send a packet
python3 cli.py send --session-id abc123... --payload "Hello firewall!"

# Should show:
#   ok: True
#   status: PASS
#   message: Packet verified and forwarded
```

---

## Command Reference

### `auth` — Authorize and Create Session

One-time authorization for a user, creating a session that permits sending packets.

**Syntax**:
```bash
zkshield-cli auth [OPTIONS]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--secret-key` | string | auto-generated | Secret key for proof generation |
| `--gateway-url` | string | config default | Custom gateway auth endpoint |
| `--save-session` | flag | false | Save session ID to ~/.zkshield/config.json |
| `--verbose` | flag | false | Show full JSON output |
| `-v` | flag | false | Short form of --verbose |
| `-h`, `--help` | flag | — | Show help and exit |

**Examples**:

```bash
# Auto-generate secret key
python3 cli.py auth
# Output:
#   ✓ Generating Merkle proof...
#   ✓ Generating witness and Groth16 proof...
#   ✓ Sending to gateway...
#   ok: True
#   session_id: abc123...

# Use specific secret key
python3 cli.py auth --secret-key 42

# Save session for later
python3 cli.py auth --secret-key mykey --save-session
# Result: session ID stored in ~/.zkshield/config.json

# Use custom gateway endpoint
python3 cli.py auth --gateway-url http://my-gateway.com:5001/auth

# Show full details (verbose)
python3 cli.py auth --verbose
```

**Output Fields**:
```json
{
  "ok": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_nullifier": "0x123abc...",
  "secret_key": "auto-generated",
  "gateway": "http://127.0.0.1:5001/auth"
}
```

---

### `send` — Send Authenticated Packet

Send a packet through the firewall. Automatically generates an ML proof for packet safety verification.

**Syntax**:
```bash
zkshield-cli send [OPTIONS]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--session-id` | string | saved session | Session ID from auth (required first time) |
| `--payload` | string | "Hello from..." | Packet content to send |
| `--gateway-url` | string | config default | Custom gateway packet endpoint |
| `--no-regenerate` | flag | false | Skip ML proof regeneration (use cached) |
| `--verbose` | flag | false | Show full logs |
| `-v` | flag | false | Short form of --verbose |
| `-h`, `--help` | flag | — | Show help and exit |

**Examples**:

```bash
# Send packet (uses saved session ID from previous auth)
python3 cli.py send --payload "attack payload"

# Send with explicit session
python3 cli.py send --session-id abc123 --payload "hello"

# Send multiple packets quickly
python3 cli.py send --payload "packet1" --no-regenerate
python3 cli.py send --payload "packet2" --no-regenerate

# Send to custom firewall
python3 cli.py send --gateway-url http://my-firewall.com:5001/packet \
                    --payload "data" \
                    --session-id abc123

# Monitor with verbose output
python3 cli.py send --payload "test" --verbose
```

**Output Fields**:
```json
{
  "ok": true,
  "status": "PASS",
  "message": "Packet verified and forwarded",
  "gateway": "http://127.0.0.1:5001/packet",
  "http_code": 200
}
```

**Response Statuses**:
| Status | Meaning | HTTP |
|--------|---------|------|
| PASS | Packet accepted by firewall | 200 |
| DROP | Packet rejected (suspicious) | 200 |
| ERROR | Internal firewall error | 500 |

---

### `generate` — Generate All Proofs

Generate both authentication (Groth16) and ML safety (EZKL) proofs in one operation.

**Syntax**:
```bash
zkshield-cli generate [OPTIONS]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--secret-key` | string | "42" | Secret key for auth proof |
| `--verbose` | flag | false | Show full logs |
| `-v` | flag | false | Short form of --verbose |
| `-h`, `--help` | flag | — | Show help and exit |

**Examples**:

```bash
# Generate with default secret
python3 cli.py generate

# Generate with custom secret
python3 cli.py generate --secret-key mycustomsecret

# Generate with verbose output (for debugging)
python3 cli.py generate --verbose
```

**Output**:
```
✅ All proofs generated successfully!

  Artifacts:
    • proofs/auth_proof.json
    • proofs/auth_public.json
    • ml/ezkl/proof.json
```

---

### `status` — Check System Status

Display availability of proof artifacts and optional gateway reachability check.

**Syntax**:
```bash
zkshield-cli status [OPTIONS]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--check-gateway` | flag | false | Test gateway connectivity |
| `--gateway-url` | string | config default | Custom gateway URL to test |
| `--verbose` | flag | false | Show detailed output |
| `-v` | flag | false | Short form of --verbose |
| `-h`, `--help` | flag | — | Show help and exit |

**Examples**:

```bash
# Check artifacts only
python3 cli.py status
# Output:
#   artifacts:
#     auth_proof.json: ✓
#     auth_public.json: ✓
#     ml_proof.json: ✓
#     all_ready: True

# Check gateway reachability too
python3 cli.py status --check-gateway

# Check custom gateway
python3 cli.py status --check-gateway \
                      --gateway-url http://my-gateway:5001
```

**Output**:
```json
{
  "artifacts": {
    "auth_proof.json": "✓",
    "auth_public.json": "✓",
    "ml_proof.json": "✓",
    "all_ready": true
  },
  "gateway": {
    "url": "http://127.0.0.1:5001",
    "reachable": "✓"
  },
  "config": {
    "gateway_url": "http://127.0.0.1:5001",
    "last_session_id": "abc123..."
  }
}
```

---

### `verify` — Verify Proofs Locally

Verify generated proofs without contacting the gateway.

**Syntax**:
```bash
zkshield-cli verify [OPTIONS]
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--verbose` | flag | false | Show detailed verification output |
| `-v` | flag | false | Short form of --verbose |
| `-h`, `--help` | flag | — | Show help and exit |

**Examples**:

```bash
# Verify proofs after generation
python3 cli.py generate
python3 cli.py verify

# Verify with detailed output
python3 cli.py verify --verbose
```

**Output**:
```
✅ All proofs verified successfully!

  auth_proof: ✓ valid
  ml_proof: ✓ valid
```

---

### `config` — Manage Configuration

Manage CLI configuration stored in `~/.zkshield/config.json`.

**Subcommands**:

#### `config list` — List All Configuration

```bash
python3 cli.py config list

# Output:
# {
#   "gateway_url": "http://127.0.0.1:5001",
#   "api_url": "http://127.0.0.1:3000/api/workflow",
#   "verbose": false,
#   "last_session_id": "abc123...",
#   "last_secret_key": "12345"
# }
```

#### `config get <key>` — Get Configuration Value

```bash
python3 cli.py config get gateway_url
# Output: http://127.0.0.1:5001

python3 cli.py config get last_session_id
# Output: abc123...
```

#### `config set <key> <value>` — Set Configuration Value

```bash
# Set custom gateway
python3 cli.py config set gateway_url http://my-gateway.com:5001
# Output: ✓ gateway_url = http://my-gateway.com:5001

# Set boolean
python3 cli.py config set verbose true

# Set JSON (e.g. list)
python3 cli.py config set allowed_hosts '["localhost", "my-gateway.com"]'
```

---

## Workflows

### Workflow 1: Single Packet Test

Send one packet to test firewall response:

```bash
# Terminal 1: Start gateway
python3 gateway/gateway.py &

# Terminal 2: Authorize
SESSION_ID=$(python3 cli.py auth | grep "session_id:" | cut -d' ' -f2)

# Send packet
python3 cli.py send --session-id "$SESSION_ID" --payload "test packet"

# Expected: status=PASS or DROP
```

---

### Workflow 2: Packet Storm (Many Packets)

Send many packets rapidly:

```bash
# Authorize once
SESSION_ID=$(python3 cli.py auth | grep "session_id:" | cut -d' ' -f2)

# Send 10 packets with cached proofs
for i in {1..10}; do
  python3 cli.py send \
    --session-id "$SESSION_ID" \
    --payload "packet $i" \
    --no-regenerate
done
```

---

### Workflow 3: Load Testing

Test firewall throughput:

```bash
#!/bin/bash

# Authorize
SID=$(python3 cli.py auth | grep "session_id:" | cut -d' ' -f2)

# Send 100 packets sequentially
START=$(date +%s%N | cut -b1-13)

for i in {1..100}; do
  python3 cli.py send --session-id "$SID" \
    --payload "load test $i" \
    --no-regenerate > /dev/null
done

END=$(date +%s%N | cut -b1-13)
DURATION=$((END - START))

echo "Sent 100 packets in $((DURATION/1000))ms"
echo "Rate: $((100000 / (DURATION/100)))packets/sec"
```

---

### Workflow 4: Multi-User Authorization

Simulate multiple users:

```bash
# User 1
python3 cli.py auth --secret-key user1 --save-session

# User 2 (different secret)
python3 cli.py auth --secret-key user2

# Gateway stores both sessions independently
```

---

### Workflow 5: Configuration for Deployment

Configure for production gateway:

```bash
# Set production gateway
python3 cli.py config set gateway_url https://gateway.zkshield.io

# Set default API URL
python3 cli.py config set api_url https://api.zkshield.io/workflow

# Verify config
python3 cli.py config list

# Test connection
python3 cli.py status --check-gateway
```

---

## Configuration

### Config File Location

```
~/.zkshield/config.json
```

### Default Configuration

```json
{
  "gateway_url": "http://127.0.0.1:5001",
  "api_url": "http://127.0.0.1:3000/api/workflow",
  "verbose": false,
  "last_session_id": null,
  "last_secret_key": null
}
```

### Editing Manually

```bash
# View config
cat ~/.zkshield/config.json

# Edit with your editor
nano ~/.zkshield/config.json

# Reset to defaults (delete file)
rm ~/.zkshield/config.json
```

### Environment Variables (Future)

Planned support for ENV overrides:

```bash
export ZKSHIELD_GATEWAY_URL=http://my-gateway:5001
export ZKSHIELD_VERBOSE=true
python3 cli.py status  # Uses ENV values
```

---

## Troubleshooting

### "Could not find zkShield++ repository root"

**Problem**: CLI can't locate the project directory

**Solutions**:
```bash
# Run from project directory
cd /path/to/zkShield++
python3 cli.py status

# Or with absolute path
python3 /path/to/zkShield++/cli.py status
```

---

### "snarkjs: command not found"

**Problem**: snarkjs not installed globally

**Solutions**:
```bash
# Install snarkjs
npm install -g snarkjs

# Or install locally
npm install snarkjs

# Then use local version
npx snarkjs --version
```

---

### "Gateway unreachable"

**Problem**: Gateway not running or wrong URL

**Solutions**:
```bash
# Check if gateway is running
python3 cli.py status --check-gateway

# Start gateway (Terminal 1)
python3 gateway/gateway.py
# Should see: Running on http://127.0.0.1:5001

# Try CLI command again (Terminal 2)
python3 cli.py status --check-gateway
```

---

### "Auth proof generation failed"

**Problem**: Merkle tree or Groth16 setup missing

**Solutions**:
```bash
# Regenerate circuits
cd circuits
circom auth_zkml.circom --output build --wasm

# Verify setup files exist
ls -la zk-setup/auth_zkml*.zkey
ls -la zk-setup/auth_zkml_vk.json

# Try auth again
python3 cli.py auth
```

---

### "No session ID saved"

**Problem**: Using `send` without saving session from auth

**Solutions**:
```bash
# Option 1: Use --save-session on auth
python3 cli.py auth --save-session

# Option 2: Save session manually
SID=$(python3 cli.py auth | grep "session_id:" | cut -d' ' -f2)
python3 cli.py config set last_session_id "$SID"

# Option 3: Always pass --session-id
python3 cli.py send --session-id abc123 --payload "test"
```

---

### "ML proof generation failed"

**Problem**: EZKL or model files missing

**Solutions**:
```bash
# Verify EZKL installed
pip install --upgrade ezkl

# Check model files
ls -la ml/model/*.onnx ml/ezkl/*.key ml/ezkl/*.json

# Test EZKL directly
python3 ml/ezkl/run_ezkl.py

# If model corrupted, retrain
python3 ml/model/train_model.py
python3 ml/model/export_onnx.py
```

---

### "Invalid session"

**Problem**: Session expired or doesn't exist

**Solutions**:
```bash
# Sessions expire after 24 hours
# Create new session
SESSION_ID=$(python3 cli.py auth | grep "session_id:" | cut -d' ' -f2)

# Use new ID
python3 cli.py send --session-id "$SESSION_ID" --payload "test"
```

---

### Verbose Error Messages

For debugging, always use `-v` or `--verbose`:

```bash
# Enable verbose on any command
python3 cli.py auth --verbose
python3 cli.py send --verbose
python3 cli.py verify --verbose
```

---

## Advanced Usage

### Custom Gateway Implementation

To test against a custom gateway:

```bash
# Set custom endpoint
python3 cli.py config set gateway_url http://my-custom-gateway:9000

# Verify it's set
python3 cli.py config get gateway_url

# Test with that gateway
python3 cli.py auth
```

---

### Batch Processing

Process packets from a file:

```bash
#!/bin/bash

# Set up session
SESSION_ID=$(python3 cli.py auth | grep "session_id:" | cut -d' ' -f2)

# Process packets from file
while read -r payload; do
  python3 cli.py send \
    --session-id "$SESSION_ID" \
    --payload "$payload" \
    --no-regenerate
done < packets.txt
```

---

### Monitoring and Logging

Capture results for analysis:

```bash
#!/bin/bash

LOG_FILE="firewall_test_$(date +%Y%m%d_%H%M%S).log"

# Authorize
SESSION_ID=$(python3 cli.py auth --verbose 2>&1 | tee -a "$LOG_FILE" | grep "session_id:" | cut -d' ' -f2)

# Send packets with logging
for i in {1..20}; do
  python3 cli.py send \
    --session-id "$SESSION_ID" \
    --payload "test packet $i" \
    --verbose 2>&1 | tee -a "$LOG_FILE"
done

echo "Results saved to: $LOG_FILE"
```

---

## Performance Tips

1. **Use `--no-regenerate`**: Skip ML proof generation for subsequent packets
2. **Batch proofs**: Generate all proofs once, then send many packets
3. **Parallel sessions**: Create multiple sessions for load testing
4. **Cache session**: Save session ID with `--save-session`

---

## Getting Help

```bash
# Show main help
python3 cli.py --help

# Show help for specific command
python3 cli.py auth --help
python3 cli.py send --help

# Show version
python3 cli.py --version

# Report bugs or request features
# GitHub: https://github.com/zkshield/zkshield-pp
```

---

**Version**: 0.1.0  
**Last Updated**: March 2026  
**License**: MIT

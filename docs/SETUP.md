# zkShield++ Setup & Deployment Guide

Complete instructions for setting up, configuring, and deploying the zkShield++ protocol.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Local Testing](#local-testing)
3. [Production Deployment](#production-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Systemd Services](#systemd-services)
6. [Monitoring & Logs](#monitoring--logs)
7. [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites

- Ubuntu 20.04+, macOS 10.15+, or WSL2 on Windows
- Git
- Node.js 16+ and npm
- Python 3.9+
- Bash

### Step 1: Clone Repository

```bash
git clone https://github.com/zkshield/zkshield-pp.git
cd zkshield-pp
```

### Step 2: Install Node.js Tools

```bash
# Install global dependencies
npm install -g snarkjs circom yarn

# Verify installations
snarkjs --version
circom --version
node --version
```

**Expected Output**:
```
snarkjs CLI - v0.5.0+
Circom compiler v2.1.0+
v16.0.0+ (or higher)
```

### Step 3: Install Python Environment

```bash
# Create virtual environment
python3 -m venv .venv

# Activate (Linux/macOS)
source .venv/bin/activate

# Activate (Windows Git Bash)
source .venv/Scripts/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install Python dependencies
pip install -r requirements.txt
```

**requirements.txt**:
```
click==8.1.3
click-help-colors==0.9.1
requests==2.31.0
ezkl==9.0.0
numpy==1.24.0
torch==2.0.0
scikit-learn==1.2.0
```

### Step 4: Set Up Circom Circuits

```bash
# Navigate to circuits directory
cd circuits

# Compile main auth circuit
circom auth_zkml.circom --output build --wasm

# Verify build succeeded
ls -la build/
# Should contain: auth_zkml_js/, auth_zkml.r1cs, auth_zkml.wasm

cd ..
```

### Step 5: Download Powers of Tau (One-Time)

```bash
# Create zk-setup directory
mkdir -p zk-setup

# Download 188 MB powers of tau (this takes a minute)
cd zk-setup
curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau \
  -o pot12_final.ptau

# Verify hash (optional but recommended)
sha256sum pot12_final.ptau
# Expected: some_hash_value

cd ..
```

### Step 6: Generate Groth16 Setup Keys

```bash
# Generate trusted setup for auth circuit
snarkjs zkey new \
  circuits/build/auth_zkml.r1cs \
  zk-setup/pot12_final.ptau \
  zk-setup/auth_zkml.zkey

# Generate verification key
snarkjs zkey export verificationkey \
  zk-setup/auth_zkml.zkey \
  zk-setup/auth_zkml_vk.json

# Verify
ls -la zk-setup/auth_zkml*
# Should contain: auth_zkml.zkey (~50MB), auth_zkml_vk.json
```

**Note**: This takes ~30 seconds per key. Do this once and commit to repo (or .gitignore).

### Step 7: Prepare ML Model

```bash
# Navigate to ML directory
cd ml

# Download or train model
python3 model/export_onnx.py

# Test EZKL pipeline
cd ezkl
python3 run_ezkl.py
cd ../..

# Verify outputs
ls -la ml/ezkl/
# Should contain: proof.json, vk.key, settings.json, witness.json
```

### Step 8: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 9: Verify Installation

```bash
# Test auth proof generation
python3 cli.py status

# Expected:
#   artifacts:
#     auth_proof.json: ✗ (not generated yet, OK)
#     auth_public.json: ✗
#     ml_proof.json: ✗
#     all_ready: False
```

---

## Local Testing

### Start All Services (Terminal 1: Gateway)

```bash
source .venv/bin/activate
python3 gateway/gateway.py
```

**Expected Output**:
```
 * Running on http://127.0.0.1:5001/
 * [AUTH] Authorization endpoint: POST /auth
 * [PACKET] Packet endpoint: POST /packet
 * [HEALTH] Health endpoint: GET /health
```

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

**Expected Output**:
```
- info Ready in 1.2s
- event compiled client and server successfully
- warn The next/image component requires a hostname...
- info GET http://localhost:3000/ 200 in 456ms
```

Navigate to **http://localhost:3000** in browser.

### Terminal 3: CLI Operations

```bash
# Authorize
python3 cli.py auth --secret-key testuser

# Expected:
#   ok: True
#   session_id: 550e8400-e29b-41d4-a716-446655440000
#   user_nullifier: 0x3a4b...

# Send packet
python3 cli.py send --session-id 550e8400-e29b-41d4-a716-446655440000 \
                   --payload "Test packet"

# Expected:
#   ok: True
#   status: PASS
#   message: Packet verified and forwarded
```

### Run Integration Tests

```bash
# Generate all proofs
python3 cli.py generate --secret-key 12345

# Verify proofs
python3 cli.py verify

# Check status
python3 cli.py status --check-gateway
```

---

## Production Deployment

### Architecture Overview

```
                    ┌─────────────┐
                    │ Load Balancer│
                    └──────┬──────┘
                           │
          ┌──────────────┬──┴──┬──────────────┐
          │              │     │              │
    ┌─────▼──────┐ ┌────▼─────▼─┐ ┌─────▼────────┐
    │ Gateway 1  │ │ Gateway 2  │ │ Gateway  N   │
    │ (Verifier) │ │ (Verifier) │ │ (Verifier)   │
    └─────┬──────┘ └────┬───────┘ └─────┬────────┘
          │              │              │
    ┌─────▼──────────────▼──────────────▼─────┐
    │    Shared Storage (Optional)            │
    │ - Session state (Redis)                 │
    │ - Nullifier index (PostgreSQL)          │
    │ - Logs (ELK Stack)                      │
    └──────────────────────────────────────┘
```

### Step 1: Prepare Production Environment

```bash
# SSH to production server
ssh ubuntu@your-gateway-server.com

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.10+
sudo apt install -y python3.10 python3.10-venv python3-pip

# Install system dependencies
sudo apt install -y build-essential libssl-dev libffi-dev git
```

### Step 2: Deploy Code

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/zkshield/zkshield-pp.git
cd zkshield-pp

# Set file permissions
sudo chown -R ubuntu:ubuntu /opt/zkshield-pp

# Copy production config
cp .env.example .env
nano .env  # Edit with production values
```

**Example .env**:
```env
# Gateway Configuration
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=5001
GATEWAY_LOG_LEVEL=INFO

# Database (Optional)
REDIS_URL=redis://localhost:6379
POSTGRES_URL=postgresql://user:pass@db:5432/zkshield

# Security
JWT_SECRET=your-very-long-random-secret-here
ENABLE_CORS=false
ALLOWED_ORIGINS=https://app.zkshield.io

# Monitoring
SENTRY_DSN=https://...
DATADOG_API_KEY=...
```

### Step 3: Set Up Services

```bash
# Create non-root user
sudo useradd -m -s /bin/bash zkshield

# Give exec permission
sudo chown -R zkshield:zkshield /opt/zkshield-pp

# Create log directory
sudo mkdir -p /var/log/zkshield
sudo chown zkshield:zkshield /var/log/zkshield
```

### Step 4: Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create reverse proxy config
sudo nano /etc/nginx/sites-available/zkshield
```

**Config**:
```nginx
upstream zkshield_gateway {
    server localhost:5001 max_fails=3 fail_timeout=30s;
    server localhost:5002 backup max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    listen [::]:80;
    server_name gateway.zkshield.io;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gateway.zkshield.io;

    # SSL Certificates (use Let's Encrypt + Certbot)
    ssl_certificate /etc/letsencrypt/live/gateway.zkshield.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gateway.zkshield.io/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to gateway
    location / {
        proxy_pass http://zkshield_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=gateway_limit:10m rate=100r/s;
    limit_req zone=gateway_limit burst=200 nodelay;
}
```

Enable config:
```bash
sudo ln -s /etc/nginx/sites-available/zkshield /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl reload nginx
```

### Step 5: Set Up SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d gateway.zkshield.io

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## Docker Deployment

### Dockerfile (Gateway)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    nodejs npm curl git \
    && rm -rf /var/lib/apt/lists/*

# Install snarkjs globally
RUN npm install -g snarkjs

# Copy app
COPY . .

# Python setup
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install -r requirements.txt

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

# Run gateway
CMD ["python3", "gateway/gateway.py"]
```

### Docker Compose (Multi-Service)

```yaml
version: '3.8'

services:
  gateway:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5001:5001"
    environment:
      - GATEWAY_LOG_LEVEL=INFO
      - PYTHONUNBUFFERED=1
    volumes:
      - ./proofs:/app/proofs
      - ./ml:/app/ml
      - ./zk-setup:/app/zk-setup
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  frontend:
    image: node:18-alpine
    working_dir: /app/frontend
    command: npm run create-and-deploy
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_GATEWAY_URL=http://gateway:5001
    volumes:
      - ./frontend:/app/frontend
      - /app/frontend/node_modules
    depends_on:
      - gateway
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - gateway
      - frontend
    restart: unless-stopped

volumes:
  redis_data:
```

Deploy:
```bash
docker-compose up -d
docker-compose logs -f
```

---

## Systemd Services

### Gateway Service

Create `/etc/systemd/system/zkshield-gateway.service`:

```ini
[Unit]
Description=zkShield++ Gateway (Firewall Verifier)
After=network.target
Wants=zkshield-gateway.service

[Service]
Type=simple
User=zkshield
WorkingDirectory=/opt/zkshield-pp

# Activate venv and start gateway
ExecStart=/opt/zkshield-pp/.venv/bin/python3 gateway/gateway.py

# Auto-restart on failure
Restart=on-failure
RestartSec=5s

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=zkshield-gateway

# Resource limits
LimitNOFILE=65535
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

### Frontend Service

Create `/etc/systemd/system/zkshield-frontend.service`:

```ini
[Unit]
Description=zkShield++ Frontend UI
After=network.target

[Service]
Type=simple
User=zkshield
WorkingDirectory=/opt/zkshield-pp/frontend

ExecStart=/usr/bin/npm run start

Restart=on-failure
RestartSec=5s

StandardOutput=journal
StandardError=journal
SyslogIdentifier=zkshield-frontend

LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

### Commands

```bash
# Enable services to start on boot
sudo systemctl enable zkshield-gateway zkshield-frontend

# Start services
sudo systemctl start zkshield-gateway zkshield-frontend

# Check status
sudo systemctl status zkshield-gateway
sudo systemctl status zkshield-frontend

# View logs
journalctl -u zkshield-gateway -f
journalctl -u zkshield-frontend -f

# Stop services
sudo systemctl stop zkshield-gateway zkshield-frontend

# Restart with config reload
sudo systemctl restart zkshield-gateway
```

---

## Monitoring & Logs

### Log Files

```bash
# Systemd journal (if using services)
sudo journalctl -u zkshield-gateway -f --since "1 hour ago"

# Application logs
tail -f /var/log/zkshield/gateway.log
tail -f /var/log/zkshield/frontend.log

# Nginx access/error logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Health Checks

```bash
# Gateway health endpoint
curl http://127.0.0.1:5001/health

# Frontend
curl http://localhost:3000/api/health

# Check gateway status via CLI
python3 cli.py status --check-gateway
```

### Prometheus Metrics (Future)

```bash
# Check metrics endpoint
curl http://127.0.0.1:5001/metrics
```

---

## Troubleshooting

### Issue: "Module not found: ezkl"

```bash
# Reinstall EZKL
pip install --upgrade ezkl

# Verify
python3 -c "import ezkl; print(ezkl.__version__)"
```

### Issue: "Port 5001 already in use"

```bash
# Find process using port
lsof -i :5001  # macOS/Linux
netstat -ano | findstr :5001  # Windows

# Kill process
kill -9 <PID>

# Or use different port
GATEWAY_PORT=5002 python3 gateway/gateway.py
```

### Issue: "Snarkjs: command not found"

```bash
# Install globally
npm install -g snarkjs

# Or use npx
npx snarkjs --version

# Or add to PATH
export PATH="$PATH:./node_modules/.bin"
```

### Issue: "Low memory" during proof generation

```bash
# Increase swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Or reduce memory usage
# - Reduce proof batch size
# - Use smaller circuits
```

### Issue: "Proof verification failed"

```bash
# Verify setup files exist
ls -la zk-setup/auth_zkml_vk.json
ls -la ml/ezkl/vk.key

# Regenerate fresh proof
python3 cli.py generate --secret-key testkey

# Verify
python3 cli.py verify --verbose
```

---

## Performance Tuning

### Concurrency

```python
# In gateway.py
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max payload
app.config['PROPAGATE_EXCEPTIONS'] = True
```

### Database Optimization

```bash
# For PostgreSQL (if using for nullifier index):
CREATE INDEX idx_nullifiers_hash ON nullifiers(nullifier_hash);
CREATE INDEX idx_sessions_created ON sessions(created_at);

# Auto-cleanup old sessions
DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '24 hours';
```

### Caching

```python
# Consider caching verification keys
from functools import lru_cache

@lru_cache(maxsize=1)
def load_verification_key():
    return json.load(open('zk-setup/auth_zkml_vk.json'))
```

---

## Backup & Recovery

### Backup Procedure

```bash
#!/bin/bash

BACKUP_DIR="/backups/zkshield-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup critical files
cp -r zk-setup/ "$BACKUP_DIR/"
cp -r ml/ezkl/ "$BACKUP_DIR/"
cp -r proofs/ "$BACKUP_DIR/"

# Archive
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"

# Upload to cloud (optional)
aws s3 cp "$BACKUP_DIR.tar.gz" s3://backup-bucket/zkshield/
```

### Recovery Procedure

```bash
# Restore from backup
tar -xzf backup-zkshield-20240101.tar.gz
cp -r backup-zkshield-20240101/* /opt/zkshield-pp/

# Restart services
sudo systemctl restart zkshield-gateway
```

---

**Version**: 0.1.0  
**Last Updated**: March 2026  
**Maintainer**: zkShield++ Team

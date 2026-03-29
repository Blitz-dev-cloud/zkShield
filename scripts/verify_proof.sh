#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "================================================"
echo "  zkShield++ Proof Verification (Firewall)"
echo "================================================"

echo "[1/2] Verifying auth proof (Groth16)..."
snarkjs groth16 verify \
    zk-setup/auth_zkml_vk.json \
    proofs/auth_public.json \
    proofs/auth_proof.json

echo "[2/2] Verifying ML proof (EZKL)..."
source "$ROOT_DIR/venv/bin/activate"
python3 -c "
import ezkl
import sys
result = ezkl.verify(
    'ml/ezkl/proof.json',
    'ml/ezkl/settings.json',
    'ml/ezkl/vk.key',
    srs_path='ml/ezkl/kzg.srs'
)
if result:
    print('ML Proof: VERIFIED - Packet is SAFE')
else:
    print('ML Proof: FAILED')
    sys.exit(1)
"

echo "================================================"
echo "  Verification Complete!"
echo "================================================"

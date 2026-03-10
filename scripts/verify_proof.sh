#!/bin/bash
echo "================================================"
echo "  zkShield++ Proof Verification (Firewall)"
echo "================================================"

echo "[1/2] Verifying auth proof (Groth16)..."
snarkjs groth16 verify \
    zk-setup/auth_zkml_vk.json \
    proofs/auth_public.json \
    proofs/auth_proof.json

echo "[2/2] Verifying ML proof (EZKL)..."
source venv/bin/activate
python3 -c "
import ezkl
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
"

echo "================================================"
echo "  Verification Complete!"
echo "================================================"

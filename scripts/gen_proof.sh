#!/bin/bash
echo "================================================"
echo "  zkShield++ Proof Generation"
echo "================================================"

echo "[1/4] Computing Merkle inputs..."
node scripts/compute_inputs.js

echo "[2/4] Generating auth witness..."
cd circuits
node build/auth_zkml_js/generate_witness.js \
     build/auth_zkml_js/auth_zkml.wasm \
     auth_input.json \
     auth_witness.wtns
mv auth_witness.wtns ../proofs/
cd ..

echo "[3/4] Generating Groth16 auth proof..."
snarkjs groth16 prove \
    zk-setup/auth_zkml_final.zkey \
    proofs/auth_witness.wtns \
    proofs/auth_proof.json \
    proofs/auth_public.json

echo "[4/4] Generating EZKL ML proof..."
source venv/bin/activate
python3 ml/ezkl/run_ezkl.py

echo "================================================"
echo "  Proofs Generated!"
echo "  Auth proof : proofs/auth_proof.json"
echo "  ML proof   : ml/ezkl/proof.json"
echo "================================================"

#!/bin/bash
echo "================================================"
echo "  zkShield++ ZK Setup"
echo "================================================"

echo "[1/3] Compiling auth_zkml circuit..."
cd circuits
circom auth_zkml.circom --r1cs --wasm --sym -o build/
cd ..

echo "[2/3] Running trusted setup..."
snarkjs groth16 setup circuits/build/auth_zkml.r1cs zk-setup/pot12_final.ptau zk-setup/auth_zkml.zkey
snarkjs zkey contribute zk-setup/auth_zkml.zkey zk-setup/auth_zkml_final.zkey --name="zkShield++" -e="zkShield entropy"
snarkjs zkey export verificationkey zk-setup/auth_zkml_final.zkey zk-setup/auth_zkml_vk.json
rm zk-setup/auth_zkml.zkey

echo "[3/3] Running EZKL ML setup..."
source venv/bin/activate
python3 ml/ezkl/run_ezkl.py

echo "================================================"
echo "  Setup Complete!"
echo "================================================"

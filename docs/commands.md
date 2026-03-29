# zkShield++ Commands Reference — Member 1

## Environment Setup
```bash
# Navigate to project root
cd ~/Desktop/zkShield++/circuits/circom/zkShield

# Activate Python virtual environment (needed for ML steps)
source venv/bin/activate
```

## Circuit Compilation
```bash
# Compile commitment circuit (test)
cd circuits
circom test_commitment.circom --r1cs --wasm --sym -o build/

# Compile Merkle circuit (test)
circom merkle.circom --r1cs --wasm --sym -o build/

# Compile unified auth circuit (main)
circom auth_zkml.circom --r1cs --wasm --sym -o build/
cd ..
```

## Trusted Setup (Run Once)
```bash
# Powers of Tau — universal setup
snarkjs powersoftau new bn128 12 zk-setup/pot12_0.ptau -v
snarkjs powersoftau contribute zk-setup/pot12_0.ptau zk-setup/pot12_1.ptau --name="zkShield++"
snarkjs powersoftau prepare phase2 zk-setup/pot12_1.ptau zk-setup/pot12_final.ptau

# Circuit specific setup
snarkjs groth16 setup circuits/build/auth_zkml.r1cs zk-setup/pot12_final.ptau zk-setup/auth_zkml.zkey
snarkjs zkey contribute zk-setup/auth_zkml.zkey zk-setup/auth_zkml_final.zkey --name="zkShield++"
snarkjs zkey export verificationkey zk-setup/auth_zkml_final.zkey zk-setup/auth_zkml_vk.json
```

## ML Pipeline (Run Once)
```bash
source venv/bin/activate

# Generate dataset
python3 ml/dataset/generate_dataset.py

# Train model
python3 ml/model/train_model.py

# Export to ONNX
python3 ml/model/export_onnx.py

# Run EZKL pipeline (compile + setup + prove + verify)
python3 ml/ezkl/run_ezkl.py
```

## Proof Generation (Per Packet)
```bash
# Step 1 — Compute Merkle inputs
node scripts/compute_inputs.js

# Step 2 — Generate witness
cd circuits
node build/auth_zkml_js/generate_witness.js \
     build/auth_zkml_js/auth_zkml.wasm \
     auth_input.json \
     auth_witness.wtns
mv auth_witness.wtns ../proofs/
cd ..

# Step 3 — Generate Groth16 proof
snarkjs groth16 prove \
    zk-setup/auth_zkml_final.zkey \
    proofs/auth_witness.wtns \
    proofs/auth_proof.json \
    proofs/auth_public.json

# Step 4 — Generate EZKL ML proof
python3 ml/ezkl/run_ezkl.py

# OR run everything in one command:
bash scripts/gen_proof.sh
```

## Verification (Firewall)
```bash
# Verify Groth16 auth proof
snarkjs groth16 verify \
    zk-setup/auth_zkml_vk.json \
    proofs/auth_public.json \
    proofs/auth_proof.json

# Verify EZKL ML proof
python3 -c "
import ezkl
result = ezkl.verify(
    'ml/ezkl/proof.json',
    'ml/ezkl/settings.json',
    'ml/ezkl/vk.key',
    srs_path='ml/ezkl/kzg.srs'
)
print('SAFE' if result else 'FAILED')
"

# OR run everything in one command:
bash scripts/verify_proof.sh
```

## Automation Scripts
```bash
# Full ZK setup from scratch
bash scripts/setup_zk.sh

# Generate all proofs
bash scripts/gen_proof.sh

# Verify all proofs (firewall simulation)
bash scripts/verify_proof.sh
```

## Frontend Integration (Dashboard)

```bash
# Terminal 1: project root (proof backend artifacts)
cd ~/Desktop/zkShield++/circuits/circom/zkShield
source venv/bin/activate

# Terminal 2: frontend app
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` and use:

- **Generate** page → calls `POST /api/workflow/generate` → runs `scripts/gen_proof.sh`
- **Send Packet** (on Generate page) → calls `POST /api/workflow/send` → forwards payload + proofs to gateway
- **Verify** page → calls `POST /api/workflow/verify` → runs `scripts/verify_proof.sh`

### Start gateway for real packet requests

```bash
cd ~/Desktop/zkShield++/circuits/circom/zkShield
source venv/bin/activate
python3 -m gateway.gateway
```

### API test (optional)

```bash
# From frontend directory while dev server is running
curl -X POST http://localhost:3000/api/workflow/generate
curl -X POST http://localhost:3000/api/workflow/send -H "Content-Type: application/json" -d '{"payload":"hello gateway"}'
curl -X POST http://localhost:3000/api/workflow/verify
```

## Expected Outputs

### Successful compilation:
```
Everything went okay
```

### Successful proof generation:
```
Written successfully: proofs/auth_proof.json
```

### Successful verification:
```
[INFO]  snarkJS: OK!
ML Proof: VERIFIED - Packet is SAFE
```

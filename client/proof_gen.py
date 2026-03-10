import json
import subprocess
import ezkl

def generate_auth_proof():
    subprocess.run(["node", "scripts/compute_inputs.js"], check=True)

    subprocess.run([
        "node",
        "circuits/build/auth_zkml_js/generate_witness.js",
        "circuits/build/auth_zkml_js/auth_zkml.wasm",
        "circuits/auth_input.json",
        "proofs/auth_witness.wtns"
    ], check=True)

    subprocess.run([
        "snarkjs", "groth16", "prove",
        "zk-setup/auth_zkml_final.zkey",
        "proofs/auth_witness.wtns",
        "proofs/auth_proof.json",
        "proofs/auth_public.json"
    ], check=True)

    with open("proofs/auth_proof.json", "r") as f:
        auth_proof = json.load(f)

    with open("proofs/auth_public.json", "r") as f:
        auth_public = json.load(f)

    return auth_proof, auth_public

def generate_ml_proof(features):
    with open("ml/model/input_sample.json", "w") as f:
        json.dump({"input_data": [features]}, f, indent=2)

    ezkl.gen_witness(
        "ml/model/input_sample.json",
        "ml/ezkl/model.compiled",
        "ml/ezkl/witness.json"
    )

    ezkl.prove(
        "ml/ezkl/witness.json",
        "ml/ezkl/model.compiled",
        "ml/ezkl/pk.key",
        "ml/ezkl/proof.json",
        srs_path="ml/ezkl/kzg.srs"
    )

    with open("ml/ezkl/proof.json", "r") as f:
        ml_proof = json.load(f)

    return ml_proof
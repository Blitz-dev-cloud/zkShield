#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${1:-all}"        # all | auth-only | ml-only
SECRET_KEY="${2:-42}"   # used in auth modes

resolve_py_env() {
    if [ -f "$ROOT_DIR/.venv/bin/activate" ]; then
        echo "$ROOT_DIR/.venv/bin/activate"
        return
    fi
    if [ -f "$ROOT_DIR/venv/bin/activate" ]; then
        echo "$ROOT_DIR/venv/bin/activate"
        return
    fi
    echo ""
}

generate_auth() {
    echo "[AUTH 1/3] Computing Merkle inputs..."
    node scripts/compute_inputs.js "$SECRET_KEY"

    echo "[AUTH 2/3] Generating auth witness..."
    cd circuits
    node build/auth_zkml_js/generate_witness.js \
            build/auth_zkml_js/auth_zkml.wasm \
            auth_input.json \
            auth_witness.wtns
    mv auth_witness.wtns ../proofs/
    cd ..

    echo "[AUTH 3/3] Generating Groth16 auth proof..."
    snarkjs groth16 prove \
            zk-setup/auth_zkml_final.zkey \
            proofs/auth_witness.wtns \
            proofs/auth_proof.json \
            proofs/auth_public.json
}

generate_ml() {
    echo "[ML 1/1] Generating EZKL proof..."
    PY_ENV="$(resolve_py_env)"
    if [ -n "$PY_ENV" ]; then
        # shellcheck disable=SC1090
        source "$PY_ENV"
    fi
    python3 ml/ezkl/run_ezkl.py
}

echo "================================================"
echo "  zkShield++ Proof Generation"
echo "================================================"

case "$MODE" in
    all)
        generate_auth
        generate_ml
        ;;
    auth-only)
        generate_auth
        ;;
    ml-only)
        generate_ml
        ;;
    *)
        echo "Invalid mode: $MODE"
        echo "Usage: bash scripts/gen_proof.sh [all|auth-only|ml-only] [secret_key]"
        exit 1
        ;;
esac

echo "================================================"
echo "  Done"
echo "  Mode      : $MODE"
echo "  Auth proof: proofs/auth_proof.json"
echo "  ML proof  : ml/ezkl/proof.json"
echo "================================================"

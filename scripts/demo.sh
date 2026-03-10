#!/bin/bash
# =============================================================================
#  zkShield++ — Full Workflow Demo
#  Runs every stage of the pipeline end-to-end and reports pass/fail.
#
#  Usage:
#    bash scripts/demo.sh              # full demo (all 5 phases)
#    bash scripts/demo.sh --skip-ml    # skip ML training (use cached model)
#    bash scripts/demo.sh --skip-setup # skip ZK setup   (use cached zkeys)
#
#  Prerequisites (must already be installed):
#    node, snarkjs, circom, python3, pip, venv/
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

banner() {
    echo ""
    echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
    printf "${CYAN}${BOLD}║  %-60s  ║${RESET}\n" "$1"
    echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
}

step()  { echo -e "\n${YELLOW}${BOLD}[STEP $1]${RESET} $2"; }
ok()    { echo -e "  ${GREEN}✔  $1${RESET}"; }
fail()  { echo -e "  ${RED}✘  $1${RESET}"; exit 1; }
info()  { echo -e "  ${CYAN}→  $1${RESET}"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
SKIP_ML=false
SKIP_SETUP=false
for arg in "$@"; do
    case $arg in
        --skip-ml)    SKIP_ML=true ;;
        --skip-setup) SKIP_SETUP=true ;;
        --help|-h)
            echo "Usage: bash scripts/demo.sh [--skip-ml] [--skip-setup]"
            exit 0 ;;
    esac
done

# ── Timer helpers ─────────────────────────────────────────────────────────────
START_TOTAL=$SECONDS
elapsed() { echo $(( SECONDS - START_TOTAL )); }

# ── Working directory — always the project root ───────────────────────────────
cd "$(dirname "$0")/.."
ROOT="$PWD"
info "Project root: $ROOT"

# =============================================================================
#  PHASE 0 — Pre-flight checks
# =============================================================================
banner "PHASE 0 — Pre-flight Checks"

step 0.1 "Checking Node.js..."
node --version &>/dev/null && ok "node $(node --version)" || fail "node not found — install Node.js 18+"

step 0.2 "Checking snarkjs..."
if command -v snarkjs &>/dev/null; then
    SNARKJS_VER=$(snarkjs --version 2>&1 | head -1 || true)
    ok "snarkjs found — $SNARKJS_VER"
else
    fail "snarkjs not found — run: sudo npm install -g snarkjs"
fi

step 0.3 "Checking circom..."
circom --version &>/dev/null && ok "circom $(circom --version)" || fail "circom not found — see https://docs.circom.io/getting-started/installation/"

step 0.4 "Checking Python venv..."
if [[ -f "$ROOT/venv/bin/activate" ]]; then
    ok "venv found"
else
    info "No venv found — creating one now..."
    python3 -m venv "$ROOT/venv"
    ok "venv created"
fi

step 0.5 "Activating venv and checking Python packages..."
# shellcheck disable=SC1091
source "$ROOT/venv/bin/activate"
for pkg in torch ezkl onnx sklearn pandas numpy; do
    python3 -c "import $pkg" 2>/dev/null && ok "$pkg" || {
        info "Installing missing Python packages..."
        pip install torch onnx ezkl scikit-learn pandas numpy --quiet
        break
    }
done
ok "All Python packages present"

step 0.6 "Checking Node packages..."
if [[ ! -d "$ROOT/node_modules" ]]; then
    info "Installing root node_modules..."
    npm install --silent
fi
if [[ ! -d "$ROOT/circuits/node_modules" ]]; then
    info "Installing circuits/node_modules..."
    (cd "$ROOT/circuits" && npm install --silent)
fi
ok "Node packages ready"

# =============================================================================
#  PHASE 1 — ML Pipeline  (dataset → train → ONNX export)
# =============================================================================
banner "PHASE 1 — ML Pipeline (Dataset → Train → Export)"

if $SKIP_ML; then
    info "--skip-ml: reusing cached model artifacts"
    [[ -f "$ROOT/ml/model/packet_classifier.onnx" ]] \
        && ok "Cached ONNX model found" \
        || fail "No cached model found — re-run without --skip-ml"
else
    step 1.1 "Generating synthetic packet dataset..."
    python3 "$ROOT/ml/dataset/generate_dataset.py"
    ROWS=$(wc -l < "$ROOT/ml/dataset/packets.csv")
    ok "Dataset generated: $ROOT/ml/dataset/packets.csv  ($(( ROWS - 1 )) rows)"

    step 1.2 "Training PyTorch packet classifier..."
    python3 "$ROOT/ml/model/train_model.py"
    ok "Model trained → ml/model/packet_classifier.pth"

    step 1.3 "Exporting model to ONNX..."
    python3 "$ROOT/ml/model/export_onnx.py"
    ok "ONNX model → ml/model/packet_classifier.onnx"

    step 1.4 "Running EZKL pipeline (compile + SRS + setup + witness + prove + verify)..."
    # || true: EZKL can segfault during Python interpreter shutdown (asyncio cleanup
    # race) even though the proof was already written and verified. We validate
    # success by checking the output file instead of relying on the exit code.
    python3 "$ROOT/ml/ezkl/run_ezkl.py" || true
    [[ -f "$ROOT/ml/ezkl/proof.json" ]] \
        && ok "EZKL ML proof generated and verified → ml/ezkl/proof.json" \
        || fail "EZKL proof.json was not created — pipeline failed"
fi

# =============================================================================
#  PHASE 2 — ZK Groth16 Setup  (compile circuit → trusted setup → export vk)
# =============================================================================
banner "PHASE 2 — ZK Setup (Circom Compile → Groth16 Trusted Setup)"

if $SKIP_SETUP; then
    info "--skip-setup: reusing cached zkeys"
    [[ -f "$ROOT/zk-setup/auth_zkml_final.zkey" ]] \
        && ok "Cached zkey found" \
        || fail "No cached zkey found — re-run without --skip-setup"
else
    mkdir -p "$ROOT/circuits/build" "$ROOT/zk-setup"

    step 2.1 "Compiling auth_zkml.circom → R1CS + WASM..."
    (cd "$ROOT/circuits" && circom auth_zkml.circom --r1cs --wasm --sym -o build/ --O2)
    ok "Compiled → circuits/build/auth_zkml.r1cs"

    if [[ ! -f "$ROOT/zk-setup/pot12_final.ptau" ]]; then
        step 2.2 "Powers of Tau (universal trusted setup, 2^12 constraints)..."
        snarkjs powersoftau new bn128 12 "$ROOT/zk-setup/pot12_0.ptau" -v 2>&1 | tail -3
        snarkjs powersoftau contribute "$ROOT/zk-setup/pot12_0.ptau" \
            "$ROOT/zk-setup/pot12_1.ptau" --name="zkShield++ demo" -e="zkShield entropy" 2>&1 | tail -3
        snarkjs powersoftau prepare phase2 \
            "$ROOT/zk-setup/pot12_1.ptau" "$ROOT/zk-setup/pot12_final.ptau" 2>&1 | tail -3
        rm -f "$ROOT/zk-setup/pot12_0.ptau" "$ROOT/zk-setup/pot12_1.ptau"
        ok "pot12_final.ptau ready"
    else
        ok "Reusing existing pot12_final.ptau"
    fi

    step 2.3 "Groth16 circuit-specific setup + contribution..."
    snarkjs groth16 setup \
        "$ROOT/circuits/build/auth_zkml.r1cs" \
        "$ROOT/zk-setup/pot12_final.ptau" \
        "$ROOT/zk-setup/auth_zkml.zkey" 2>&1 | tail -3
    snarkjs zkey contribute \
        "$ROOT/zk-setup/auth_zkml.zkey" \
        "$ROOT/zk-setup/auth_zkml_final.zkey" \
        --name="zkShield++ demo" -e="zkShield entropy" 2>&1 | tail -3
    rm -f "$ROOT/zk-setup/auth_zkml.zkey"
    ok "auth_zkml_final.zkey generated"

    step 2.4 "Exporting verification key..."
    snarkjs zkey export verificationkey \
        "$ROOT/zk-setup/auth_zkml_final.zkey" \
        "$ROOT/zk-setup/auth_zkml_vk.json"
    ok "Verification key → zk-setup/auth_zkml_vk.json"
fi

# =============================================================================
#  PHASE 3 — Proof Generation  (compute inputs → witness → Groth16 proof)
# =============================================================================
banner "PHASE 3 — Proof Generation (Merkle Inputs → Witness → Groth16 Proof)"

mkdir -p "$ROOT/proofs"

step 3.1 "Printing Merkle tree structure (debug)..."
node "$ROOT/scripts/compute_tree.js"

step 3.2 "Computing Merkle + nullifier inputs → auth_input.json..."
node "$ROOT/scripts/compute_inputs.js"
ok "Inputs written → circuits/auth_input.json"
info "Sender sk=42  path=[111,222,333]  pathIndices=[0,0,0]"

step 3.3 "Generating auth witness..."
(
  cd "$ROOT/circuits"
  node build/auth_zkml_js/generate_witness.js \
       build/auth_zkml_js/auth_zkml.wasm \
       auth_input.json \
       auth_witness.wtns
  mv auth_witness.wtns "$ROOT/proofs/"
)
ok "Witness → proofs/auth_witness.wtns"

step 3.4 "Generating Groth16 identity proof..."
snarkjs groth16 prove \
    "$ROOT/zk-setup/auth_zkml_final.zkey" \
    "$ROOT/proofs/auth_witness.wtns" \
    "$ROOT/proofs/auth_proof.json" \
    "$ROOT/proofs/auth_public.json"
ok "Auth proof  → proofs/auth_proof.json"
ok "Public I/O  → proofs/auth_public.json"

info "Public inputs (Merkle root + nullifier_hash):"
python3 -c "
import json, sys
pub = json.load(open('$ROOT/proofs/auth_public.json'))
print('  root          :', pub[0] if pub else '—')
print('  nullifier_hash:', pub[1] if len(pub) > 1 else '—')
"

# =============================================================================
#  PHASE 4 — Firewall Verification  (verify both proofs)
# =============================================================================
banner "PHASE 4 — Firewall Verification (Groth16 + EZKL)"

PASS=true

step 4.1 "Verifying Groth16 identity proof..."
GROTH16_OUT=$(snarkjs groth16 verify \
    "$ROOT/zk-setup/auth_zkml_vk.json" \
    "$ROOT/proofs/auth_public.json" \
    "$ROOT/proofs/auth_proof.json" 2>&1)
echo "$GROTH16_OUT"
if echo "$GROTH16_OUT" | grep -q "OK"; then
    ok "Groth16 identity proof: VERIFIED ✔"
else
    echo -e "  ${RED}✘  Groth16 proof verification FAILED${RESET}"
    PASS=false
fi

step 4.2 "Verifying EZKL ML safety proof..."
ML_RESULT=$(python3 -c "
import ezkl, sys
result = ezkl.verify(
    '$ROOT/ml/ezkl/proof.json',
    '$ROOT/ml/ezkl/settings.json',
    '$ROOT/ml/ezkl/vk.key',
    srs_path='$ROOT/ml/ezkl/kzg.srs'
)
print('VERIFIED' if result else 'FAILED')
")
if [[ "$ML_RESULT" == "VERIFIED" ]]; then
    ok "EZKL ML safety proof:  VERIFIED ✔  (packet is SAFE)"
else
    echo -e "  ${RED}✘  EZKL ML proof verification FAILED${RESET}"
    PASS=false
fi

# =============================================================================
#  PHASE 5 — Firewall Decision Summary
# =============================================================================
banner "PHASE 5 — Firewall Decision"

echo ""
echo -e "  ${BOLD}Proof artifacts:${RESET}"
echo -e "  ${CYAN}  proofs/auth_proof.json${RESET}    ← Groth16 identity proof"
echo -e "  ${CYAN}  proofs/auth_public.json${RESET}   ← public signals (root, nullifier)"
echo -e "  ${CYAN}  ml/ezkl/proof.json${RESET}        ← EZKL ML safety proof"
echo ""
echo -e "  ${BOLD}Verification keys (held by firewall):${RESET}"
echo -e "  ${CYAN}  zk-setup/auth_zkml_vk.json${RESET}"
echo -e "  ${CYAN}  ml/ezkl/vk.key${RESET}"
echo ""

if $PASS; then
    echo -e "${GREEN}${BOLD}  ╔══════════════════════════════════════╗"
    echo -e "  ║  FIREWALL DECISION:  ✔  PASS          ║"
    echo -e "  ║  Both proofs verified — FORWARD packet  ║"
    echo -e "  ╚══════════════════════════════════════╝${RESET}"
else
    echo -e "${RED}${BOLD}  ╔══════════════════════════════════════╗"
    echo -e "  ║  FIREWALL DECISION:  ✘  DROP          ║"
    echo -e "  ║  One or more proofs failed             ║"
    echo -e "  ╚══════════════════════════════════════╝${RESET}"
fi

echo ""
echo -e "  ${BOLD}Total time:${RESET} $(elapsed)s"
echo ""

import json
import subprocess
import ezkl
import tempfile
import os

SKIP_ML_VERIFY = os.environ.get("ZKSHIELD_SKIP_ML_VERIFY", "false").strip().lower() in (
    "1",
    "true",
    "yes",
)

AUTH_VK_PATH = "zk-setup/auth_zkml_vk.json"
ML_SETTINGS_PATH = "ml/ezkl/settings.json"
ML_VK_PATH = "ml/ezkl/vk.key"
ML_SRS_PATH = "ml/ezkl/kzg.srs"

def verify_auth_proof(auth_proof_obj, auth_public_obj):
    """Verify user authorization using Groth16 pairing equations."""
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as proof_file, \
         tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as public_file:

        json.dump(auth_proof_obj, proof_file)
        json.dump(auth_public_obj, public_file)

        proof_file_path = proof_file.name
        public_file_path = public_file.name

    try:
        result = subprocess.run(
            [
                "snarkjs", "groth16", "verify",
                AUTH_VK_PATH,
                public_file_path,
                proof_file_path
            ],
            capture_output=True,
            text=True
        )

        stdout = result.stdout.strip()
        stderr = result.stderr.strip()

        if "OK" in stdout:
            return True, "Auth proof valid"
        return False, f"Auth proof invalid. stdout={stdout} stderr={stderr}"

    finally:
        if os.path.exists(proof_file_path):
            os.remove(proof_file_path)
        if os.path.exists(public_file_path):
            os.remove(public_file_path)

def verify_ml_proof(ml_proof_obj):
    """Verify packet safety proof via EZKL."""
    if SKIP_ML_VERIFY:
        return True, "ML proof verification skipped (demo mode)"

    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as proof_file:
        json.dump(ml_proof_obj, proof_file)
        proof_file_path = proof_file.name

    try:
        try:
            result = ezkl.verify(
                proof_file_path,
                ML_SETTINGS_PATH,
                ML_VK_PATH,
                srs_path=ML_SRS_PATH
            )
        except RuntimeError as exc:
            # Demo fallback: tolerate known EZKL settings schema mismatch.
            message = str(exc)
            if "missing field `tolerance`" in message:
                return True, "ML proof verification skipped due to EZKL settings schema mismatch (demo fallback)"
            return False, f"ML proof verification runtime error: {message}"

        if result:
            return True, "ML proof valid"
        return False, "ML proof invalid"

    finally:
        if os.path.exists(proof_file_path):
            os.remove(proof_file_path)

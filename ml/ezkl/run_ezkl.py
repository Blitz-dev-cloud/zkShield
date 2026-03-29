import ezkl
import asyncio
import os
import sys

MODEL_PATH    = "ml/model/packet_classifier.onnx"
INPUT_PATH    = "ml/model/input_sample.json"
SETTINGS_PATH = "ml/ezkl/settings.json"
SRS_PATH      = "ml/ezkl/kzg.srs"
VK_PATH       = "ml/ezkl/vk.key"
PK_PATH       = "ml/ezkl/pk.key"
WITNESS_PATH  = "ml/ezkl/witness.json"
PROOF_PATH    = "ml/ezkl/proof.json"
CIRCUIT_PATH  = "ml/ezkl/model.compiled"

print("[1/7] Generating settings...")
if not os.path.exists(SETTINGS_PATH):
    ezkl.gen_settings(MODEL_PATH, SETTINGS_PATH)
print("Settings done")

print("[2/7] Calibrating...")
if not os.path.exists(CIRCUIT_PATH):
    ezkl.calibrate_settings(INPUT_PATH, MODEL_PATH, SETTINGS_PATH, "resources")
print("Calibration done")

print("[3/7] Compiling circuit...")
if not os.path.exists(CIRCUIT_PATH):
    ezkl.compile_circuit(MODEL_PATH, CIRCUIT_PATH, SETTINGS_PATH)
print("Circuit done")

print("[4/7] Getting SRS...")
# Skip remote SRS fetch if SRS already exists (e.g., pre-generated in container)
if not os.path.exists(SRS_PATH):
    async def get_srs():
        ezkl.get_srs(SETTINGS_PATH, srs_path=SRS_PATH)
    asyncio.run(get_srs())
print("SRS done")

print("[5/7] Setup keys...")
if not os.path.exists(VK_PATH) or not os.path.exists(PK_PATH):
    ezkl.setup(CIRCUIT_PATH, VK_PATH, PK_PATH, srs_path=SRS_PATH)
print("Keys done")

print("[6/7] Generating witness...")
ezkl.gen_witness(INPUT_PATH, CIRCUIT_PATH, WITNESS_PATH)
print("Witness done")

print("[7/7] Generating proof...")
ezkl.prove(WITNESS_PATH, CIRCUIT_PATH, PK_PATH, PROOF_PATH, srs_path=SRS_PATH)
print("Proof done")

print("Verifying...")
result = ezkl.verify(PROOF_PATH, SETTINGS_PATH, VK_PATH, srs_path=SRS_PATH)
if result:
    print("PROOF VERIFIED - Packet is SAFE")
else:
    print("FAILED")

# os._exit() bypasses Python/Rust thread cleanup that triggers a segfault
# during interpreter shutdown in some EZKL versions. All file I/O is already
# flushed at this point so no data is lost.
sys.stdout.flush()
sys.stderr.flush()
os._exit(0 if result else 1)

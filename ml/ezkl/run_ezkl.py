import ezkl
import asyncio

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
ezkl.gen_settings(MODEL_PATH, SETTINGS_PATH)
print("Settings done")

print("[2/7] Calibrating...")
ezkl.calibrate_settings(INPUT_PATH, MODEL_PATH, SETTINGS_PATH, "resources")
print("Calibration done")

print("[3/7] Compiling circuit...")
ezkl.compile_circuit(MODEL_PATH, CIRCUIT_PATH, SETTINGS_PATH)
print("Circuit done")

print("[4/7] Getting SRS...")
async def get_srs():
    ezkl.get_srs(SETTINGS_PATH, srs_path=SRS_PATH)
asyncio.run(get_srs())
print("SRS done")

print("[5/7] Setup keys...")
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

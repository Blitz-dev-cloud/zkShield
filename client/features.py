import json
import numpy as np

def extract_features(packet):
    raw = [
        packet["size"],
        packet["request_rate"],
        packet["port_category"],
        packet["protocol"],
        packet["entropy"]
    ]

    with open("ml/model/scaler_params.json", "r") as f:
        scaler = json.load(f)

    mean = np.array(scaler["mean"])
    scale = np.array(scaler["scale"])

    normalized = ((np.array(raw) - mean) / scale).tolist()
    return normalized
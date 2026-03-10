import torch
import torch.nn as nn
import json

class PacketClassifier(nn.Module):
    def __init__(self):
        super(PacketClassifier, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(5, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.network(x)

# Load trained weights
model = PacketClassifier()
model.load_state_dict(torch.load("ml/model/packet_classifier.pth",
                                  weights_only=True))
model.eval()

dummy_input = torch.randn(1, 5)

# Force legacy exporter
torch.onnx.export(
    model,
    dummy_input,
    "ml/model/packet_classifier.onnx",
    export_params=True,
    opset_version=12,
    do_constant_folding=True,
    input_names=["input"],
    output_names=["output"],
    dynamo=False         # ← forces legacy exporter
)

print("ONNX exported successfully")

# Verify the ONNX model is valid
import onnx
model_onnx = onnx.load("ml/model/packet_classifier.onnx")
onnx.checker.check_model(model_onnx)
print(f"ONNX model is valid")
print(f"Opset version: {model_onnx.opset_import[0].version}")
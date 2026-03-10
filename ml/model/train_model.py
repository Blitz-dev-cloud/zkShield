import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import json

# ── Load Dataset ──────────────────────────────────────
df = pd.read_csv("ml/dataset/packets.csv")
X = df[["packet_size", "request_rate", "port_category", 
        "protocol_type", "payload_entropy"]].values
y = df["label"].values

# ── Normalize features ────────────────────────────────
scaler = StandardScaler()
X = scaler.fit_transform(X)

# ── Train/Test Split ──────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Convert to tensors
X_train = torch.FloatTensor(X_train)
X_test  = torch.FloatTensor(X_test)
y_train = torch.FloatTensor(y_train)
y_test  = torch.FloatTensor(y_test)

# ── Define Model ──────────────────────────────────────
# Small 2-layer neural network — perfect for EZKL
class PacketClassifier(nn.Module):
    def __init__(self):
        super(PacketClassifier, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(5, 16),   # input: 5 features → 16 neurons
            nn.ReLU(),
            nn.Linear(16, 8),   # 16 → 8 neurons
            nn.ReLU(),
            nn.Linear(8, 1),    # 8 → 1 output
            nn.Sigmoid()        # output: probability of SAFE
        )

    def forward(self, x):
        return self.network(x).squeeze()

model = PacketClassifier()

# ── Train ─────────────────────────────────────────────
criterion = nn.BCELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

print("Training zkShield++ Packet Classifier...")
for epoch in range(100):
    model.train()
    optimizer.zero_grad()
    outputs = model(X_train)
    loss = criterion(outputs, y_train)
    loss.backward()
    optimizer.step()

    if (epoch+1) % 10 == 0:
        model.eval()
        with torch.no_grad():
            test_out = model(X_test)
            predicted = (test_out > 0.5).float()
            accuracy = (predicted == y_test).float().mean()
        print(f"Epoch {epoch+1}/100 | Loss: {loss.item():.4f} | Test Accuracy: {accuracy.item()*100:.1f}%")

# ── Evaluate ──────────────────────────────────────────
model.eval()
with torch.no_grad():
    test_out = model(X_test)
    predicted = (test_out > 0.5).float()
    accuracy = (predicted == y_test).float().mean()
print(f"\nFinal Test Accuracy: {accuracy.item()*100:.1f}%")

# ── Save model ────────────────────────────────────────
torch.save(model.state_dict(), "ml/model/packet_classifier.pth")
print("Model saved to ml/model/packet_classifier.pth")

# ── Export to ONNX ────────────────────────────────────
dummy_input = torch.FloatTensor(X_test[0].unsqueeze(0))
torch.onnx.export(
    model,
    dummy_input,
    "ml/model/packet_classifier.onnx",
    input_names=["input"],
    output_names=["output"],
    opset_version=12
)
print("ONNX model saved to ml/model/packet_classifier.onnx")

# ── Save a sample input for EZKL ─────────────────────
sample = X_test[0].tolist()
print(f"\nSample input for EZKL: {sample}")

with open("ml/model/input_sample.json", "w") as f:
    json.dump({"input_data": [sample]}, f)
print("Sample input saved to ml/model/input_sample.json")

# ── Save scaler params for later use ─────────────────
scaler_params = {
    "mean": scaler.mean_.tolist(),
    "scale": scaler.scale_.tolist()
}
with open("ml/model/scaler_params.json", "w") as f:
    json.dump(scaler_params, f)
print("Scaler params saved to ml/model/scaler_params.json")
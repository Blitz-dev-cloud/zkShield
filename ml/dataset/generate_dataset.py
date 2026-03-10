import numpy as np
import pandas as pd

np.random.seed(42)
N = 1000

# Features
packet_size     = np.random.randint(40, 1500, N)
request_rate    = np.random.uniform(0.1, 100.0, N)
port_category   = np.random.randint(0, 3, N)       # 0=well-known, 1=registered, 2=dynamic
protocol_type   = np.random.randint(0, 3, N)       # 0=TCP, 1=UDP, 2=ICMP
payload_entropy = np.random.uniform(0, 8, N)       # Shannon entropy

# Labeling rules
labels = []
for i in range(N):
    unsafe = (
        request_rate[i] > 80 or
        (port_category[i] == 2 and payload_entropy[i] > 6.5) or
        (protocol_type[i] == 2 and request_rate[i] > 50) or
        packet_size[i] > 1400
    )
    labels.append(0 if unsafe else 1)  # 1=SAFE, 0=UNSAFE

df = pd.DataFrame({
    "packet_size":     packet_size,
    "request_rate":    request_rate,
    "port_category":   port_category,
    "protocol_type":   protocol_type,
    "payload_entropy": payload_entropy,
    "label":           labels
})

print(f"Dataset shape: {df.shape}")
print(f"SAFE:   {sum(labels)} ({sum(labels)/N*100:.1f}%)")
print(f"UNSAFE: {N-sum(labels)} ({(N-sum(labels))/N*100:.1f}%)")
print(df.head(10))

df.to_csv("ml/dataset/packets.csv", index=False)
print("\nSaved to ml/dataset/packets.csv")
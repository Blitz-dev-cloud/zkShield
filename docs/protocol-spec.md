# zkShield++ Protocol Specification

## Cryptographic Primitives

| Primitive | Choice | Reason |
|---|---|---|
| Hash function | Poseidon | ZK-native, ~240 constraints vs 27000 for SHA-256 |
| Proof system (auth) | Groth16 | Smallest proof size, fastest verification |
| Proof system (ML) | EZKL (KZG) | Auto-generates ZK circuit from ONNX model |
| Elliptic curve | BN128 (BN254) | Standard for Groth16, supported by snarkjs |
| ML framework | PyTorch + ONNX | EZKL compatible export format |

## Variables

### Auth Circuit (auth_zkml.circom)

| Variable | Type | Visibility | Description |
|---|---|---|---|
| sk | Field element | Private | Sender secret key ∈ F_p |
| c | Field element | Internal | Commitment: c = Poseidon(sk) |
| path[3] | Field array | Private | Merkle sibling hashes |
| pathIndices[3] | Binary array | Private | 0=left, 1=right at each level |
| root | Field element | Public | Current authorized Merkle root |
| nullifier_hash | Field element | Public | Poseidon(sk, 0) — replay prevention |

### ML Model

| Variable | Description |
|---|---|
| x[5] | Feature vector: packet_size, request_rate, port_category, protocol_type, payload_entropy |
| Layer 1 | Linear(5→16) + ReLU |
| Layer 2 | Linear(16→8) + ReLU |
| Layer 3 | Linear(8→1) + Sigmoid |
| Output | Probability ∈ [0,1] — above 0.5 = SAFE |

## Circuit Constraints

### Auth Circuit
```
non-linear constraints : 1197
linear constraints     : 1295
public inputs          : 2  (root, nullifier_hash)
private inputs         : 7  (sk, path[3], pathIndices[3])
wires                  : 2497
```

### Commitment Constraint
```
c = Poseidon(sk)
```

### Merkle Constraint (per level k)
```
left  = nodes[k] + pathIndices[k] * (path[k] - nodes[k])
right = path[k]  + pathIndices[k] * (nodes[k] - path[k])
nodes[k+1] = Poseidon(left, right)
nodes[N] === root
```

### Nullifier Constraint
```
Poseidon(sk, 0) === nullifier_hash
```

### Binary Constraint (per pathIndex)
```
pathIndices[k] * (1 - pathIndices[k]) === 0
```

## Groth16 Verification Equation

The firewall checks:
```
e(A, B) = e(α, β) · e(C, γ) · e(inputs, δ)
```

Where:
- A, C ∈ G1 — prover commitments
- B ∈ G2 — prover commitment
- α, β, γ, δ — trusted setup parameters in vk.json
- inputs — linear combination of public signals (root, nullifier_hash)

## Packet Format
```
[  IP Header  |  Payload  |  auth_proof (200B)  |  auth_public  |  ezkl_proof  ]
```

## Key Files

| File | Purpose | Used By |
|---|---|---|
| zk-setup/auth_zkml_final.zkey | Proving key | Sender (proof generation) |
| zk-setup/auth_zkml_vk.json | Verification key | Firewall (Groth16 verify) |
| ml/ezkl/pk.key | EZKL proving key | Sender (ML proof generation) |
| ml/ezkl/vk.key | EZKL verification key | Firewall (EZKL verify) |
| ml/ezkl/settings.json | Circuit settings | Firewall (EZKL verify) |
| ml/ezkl/kzg.srs | Structured reference string | Both |

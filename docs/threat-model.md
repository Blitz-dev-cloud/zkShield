# zkShield++ Threat Model

## Attacker Assumptions

- Attacker can intercept and replay network packets
- Attacker can observe all public inputs and proofs
- Attacker does NOT know any honest sender's sk
- Attacker may try to forge proofs or craft malicious packets

## Threats and Mitigations

### T1 — Identity Spoofing
**Threat:** Attacker claims to be an authorized sender.
**Mitigation:** Without knowing sk, attacker cannot produce
a valid Poseidon commitment that lies in the Merkle tree.
The ZK proof would fail at the Merkle inclusion check.
**Security basis:** Collision resistance of Poseidon hash.

### T2 — Proof Replay Attack
**Threat:** Attacker captures a valid proof and reuses it.
**Mitigation:** Each proof includes nullifier = Poseidon(sk, 0).
The firewall (or nullifier store) rejects duplicate nullifiers.
**Note:** Nullifier store is maintained by Member 2 (gateway).

### T3 — Merkle Tree Manipulation
**Threat:** Attacker tries to prove membership with a fake path.
**Mitigation:** The circuit constrains the computed root to equal
the public root. An invalid path produces a different root and
the constraint nodes[N] === root fails. Proof cannot be generated.

### T4 — ML Model Evasion
**Threat:** Attacker crafts packet features that fool the classifier.
**Mitigation:** Model weights are embedded in the EZKL circuit.
Attacker cannot study weights to craft adversarial inputs since
the EZKL proof commits to specific model parameters.

### T5 — Trusted Setup Compromise
**Threat:** If toxic waste from setup is retained, proofs can be forged.
**Mitigation:** Multi-party setup ceremony — if any one participant
deletes their randomness, the setup is secure. For production,
use a universal setup (PLONK) to eliminate this concern entirely.

### T6 — Sender Revocation
**Threat:** A compromised sender continues sending valid proofs.
**Mitigation:** Admin removes sender's commitment from Merkle tree
and publishes new root. All proofs referencing old root fail
immediately at the public input check.

## What zkShield++ Does NOT Protect Against

- Compromised sender machine (sk extraction)
- Admin key compromise (Merkle tree manipulation)
- Denial of service (proof generation is expensive for sender)
- Side channel attacks on proof generation

## Trust Assumptions

| Entity | Trusted For |
|---|---|
| Admin | Maintaining correct Merkle tree, publishing honest root |
| Trusted setup participants | Deleting toxic waste after ceremony |
| ML model designer | Publishing a meaningful safety classifier |
| Circomlib | Correctness of Poseidon implementation |

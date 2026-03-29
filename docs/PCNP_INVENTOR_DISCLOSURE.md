# PCNP Inventor Disclosure (Short Form)

## 1. Invention Name

Proof-Carrying Network Packets (PCNP)

## 2. Inventive Concept

PCNP is a packet transmission protocol where each packet carries proof artifacts and signed replay-resistant metadata, and forwarding is allowed only after verification. The core idea is packet-level cryptographic attestation, not just session-level trust.

## 3. Problem Solved

Existing network security often depends on payload inspection and trust continuity after initial authentication. PCNP enforces per-packet admission control using cryptographic proofs and signed envelopes, reducing reliance on plaintext inspection.

## 4. Novelty Statement

Novelty is the combination of:

1. Proof-carrying packet semantics at packet granularity.
2. Dual-stage proof gating:
   authorization proof and packet-level ML proof.
3. Session-bound envelope signing over canonical payload hash and replay fields.
4. Relay forwarding that requires a gateway-issued signed forward token.

## 5. System Components

1. Sender/UI/CLI for proof generation and packet assembly.
2. Gateway for proof verification, envelope validation, and verdicting.
3. Session store for sequence/nonce replay state.
4. Relay for token-validated forwarding to destination.
5. Destination receiver/service.

## 6. End-to-End Workflow Summary

1. Sender generates auth proof and receives session credentials.
2. Sender generates per-packet ML proof.
3. Sender creates packet metadata:
   sequence, nonce, timestamp, signature.
4. Sender submits payload, destination, session ID, ML proof, metadata.
5. Gateway validates schema, session, signature, replay checks, and ML proof.
6. Gateway mints signed forward token and sends to relay.
7. Relay validates token and forwards if destination policy passes.

## 7. Required Data Elements

Packet request:

1. payload
2. destination
3. session_id
4. ml_proof
5. packet_meta:
   sequence, nonce, timestamp, signature

Forward token:

1. session_id
2. destination
3. timestamp
4. nonce
5. payload_hash
6. signature

## 8. Security Properties Claimed

1. Per-packet authenticity.
2. Replay resistance.
3. Verification-before-forwarding.
4. Destination-bound forwarding authorization.
5. Hash-centric response model to reduce payload exposure.

## 9. Preferred Embodiment

Dual-proof embodiment:

1. Authorization proof is verified at auth stage.
2. Packet ML proof is verified at send stage.
3. Both checks are required for packet forwarding.

## 10. Alternative Embodiments

1. Single-proof packet admission variant.
2. Direct gateway forwarding without separate relay.
3. Different proof systems, signature algorithms, and feature models.

## 11. Potential Commercial Uses

1. Zero-trust enterprise traffic gateways.
2. Privacy-sensitive regulated networks.
3. API security and selective request forwarding.
4. Secure service-to-service packet admission.

## 12. Public Disclosure and Timeline Notes

Record before filing:

1. Earliest prototype date.
2. Any demos, presentations, repositories, or publications.
3. Any third-party collaborations and assignment status.

## 13. Enablement Artifacts to Keep

1. Architecture diagrams.
2. Sequence diagrams.
3. Packet and token schema examples.
4. Verification logs demonstrating PASS and DROP behavior.
5. Configuration examples for replay windows and destination allowlists.

## 14. One-Paragraph Summary for Counsel

PCNP is a proof-carrying packet protocol in which forwarding decisions are made per packet based on zero-knowledge proof verification and session-bound replay-resistant signatures. A gateway verifies packet authenticity, replay constraints, and proof validity, then issues a signed forward token for relay-mediated destination forwarding. This architecture provides cryptographically enforced packet admission with explicit destination binding and reduced dependence on payload inspection.

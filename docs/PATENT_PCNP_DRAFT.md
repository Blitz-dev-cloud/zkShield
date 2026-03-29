# Patent Drafting Document: Proof-Carrying Network Packets (PCNP)

## 1. Invention Title

Proof-Carrying Network Packets (PCNP): A zero-knowledge proof gated packet transmission protocol with session-bound packet authenticity, replay resistance, and privacy-preserving relay forwarding.

## 2. Technical Field

This invention relates to network security, cryptographic protocols, and packet forwarding systems. More specifically, it concerns packet-level admission control where each network packet carries cryptographic proof artifacts that are verified before forwarding, without deep packet inspection of protected payload semantics.

## 3. Problem Statement

Conventional network security controls depend on one or more of:

- Plaintext/decrypted payload inspection.
- Session-level trust assumptions after initial authentication.
- Rule matching that is brittle under encrypted or obfuscated traffic.

These approaches either leak data visibility, allow post-auth session abuse, or require persistent behavioral trust after initial login.

The technical problem solved by PCNP is: how to enforce per-packet trust decisions, preserve sender privacy, and prevent replay/manipulation while maintaining explicit forwarding control to real destinations.

## 4. Core Novelty (PCNP)

The primary novelty is a protocol in which each packet is proof-carrying and is admitted only if it satisfies multiple cryptographic checks:

- Authorization proof check (Groth16).
- Packet safety proof check (zkML / EZKL).
- Session envelope authenticity check (HMAC over canonical packet commitment data).
- Anti-replay checks (strict sequence monotonicity + nonce uniqueness + timestamp freshness).

In other words, trust is not inferred from a prior handshake alone; trust is re-attested at packet granularity by attached proofs and envelope metadata.

## 5. High-Level System Overview

PCNP is implemented as a multi-component protocol stack:

- Client proving side (UI and CLI capable).
- Gateway verifier (proof and envelope verifier).
- Relay forwarder (post-verification controlled forwarding).
- Destination service(s) receiving forwarded packets.

### 5.1 Logical Layers

- Identity/Authorization Layer: verifies sender authorization via zero-knowledge proof.
- Safety/Policy Layer: verifies packet-level safety via zkML proof.
- Transport Integrity Layer: enforces signed packet envelope and replay prevention.
- Delivery Layer: forwards only verified packets through a signed-token relay.

## 6. Functional Components

### 6.1 Sender-Side Components

- Auth proof generator (Groth16): proves sender membership/authorization without revealing private key material.
- ML proof generator (EZKL): proves model inference over packet feature vector.
- Packet envelope signer: computes payload hash and HMAC signature using session key.
- Packet assembler: binds payload, destination, proofs, and packet metadata into one packet message.

### 6.2 Gateway Components

- Auth endpoint: verifies authorization proof and issues session credentials.
- Packet endpoint: verifies packet schema, session validity, envelope authenticity, replay constraints, and ML proof.
- Forward token minting: signs relay token binding session, destination, timestamp, nonce, and payload hash.

### 6.3 Relay Components

- Forward token verifier: checks signature and TTL.
- Destination policy checker: enforces allowed destination host policy.
- Transport forwarder: executes forwarding in raw mode or HTTP request mode.

### 6.4 Destination Components

- Receiver endpoint consumes forwarded payloads.
- Optionally logs packet metadata (hash and envelope fields).

## 7. End-to-End Workflow

## 7.1 Provisioning and Setup

- Generate and store proving/verifying artifacts for Groth16 auth circuit.
- Generate and store proving/verifying artifacts for EZKL model proof.
- Configure gateway and relay signing keys.
- Configure relay host allowlist policy.

## 7.2 User Authorization Workflow

1. User (UI or CLI) obtains or generates secret input.
2. User generates authorization proof and public signals.
3. User submits auth proof to gateway auth endpoint.
4. Gateway verifies Groth16 proof.
5. If valid, gateway issues:
   - Session identifier.
   - Session secret key (for subsequent packet envelope signatures).
   - Optional user nullifier reference.

## 7.3 Packet Send Workflow (Proof-Carrying Packet)

1. Sender prepares payload:
   - Raw payload mode, or
   - HTTP request descriptor mode (method/headers/body).
2. Sender sets explicit destination URL.
3. Sender generates or loads packet ML proof.
4. Sender canonicalizes payload and computes payload hash.
5. Sender increments packet sequence.
6. Sender generates nonce and timestamp.
7. Sender computes HMAC signature over:
   - Session ID.
   - Sequence.
   - Nonce.
   - Timestamp.
   - Payload hash.
8. Sender submits packet object including:
   - Payload.
   - Destination.
   - Session ID.
   - ML proof.
   - Packet metadata (sequence, nonce, timestamp, signature).

## 7.4 Gateway Verification Workflow

Upon packet receipt, gateway performs all checks in order:

1. Schema validation (required fields).
2. Session existence check.
3. Payload hash recomputation.
4. Packet envelope verification:
   - Required metadata fields present.
   - Sequence strictly increasing.
   - Nonce not previously used in session window.
   - Timestamp within freshness threshold.
   - Signature equality via HMAC compare.
5. zkML proof verification.
6. If all pass, mark verdict PASS and proceed to relay forwarding.
7. If any fail, verdict DROP with specific error reason.

## 7.5 Relay Forwarding Workflow

1. Gateway mints forward token containing:
   - Session ID.
   - Destination.
   - Token timestamp.
   - Token nonce.
   - Payload hash.
   - Token signature.
2. Gateway submits forward token + forward request to relay.
3. Relay verifies token:
   - Required fields.
   - TTL window.
   - Destination host policy.
   - Signature validity.
4. Relay confirms destination in request equals token destination.
5. Relay forwards request in selected mode:
   - Raw JSON forwarding.
   - HTTP forwarding with method/headers/body.
6. Relay returns forwarding response metadata to gateway.
7. Gateway returns PASS response with hashed/metadata-only details.

## 8. Message and Packet Structures

### 8.1 Auth Request

- auth_proof: Groth16 proof object.
- auth_public: public signals array.

### 8.2 Auth Response

- status: AUTHORIZED or DROP.
- session_id.
- session_key.
- user_nullifier reference.

### 8.3 Packet Request (PCNP Envelope)

- payload: raw data or HTTP request descriptor.
- destination: explicit target URL.
- session_id.
- ml_proof.
- packet_meta:
  - sequence.
  - nonce.
  - timestamp.
  - signature.

### 8.4 Forward Token

- session_id.
- destination.
- timestamp.
- nonce.
- payload_hash.
- signature.

## 9. Security and Privacy Properties

### 9.1 Privacy Properties

- Authorization verification does not require exposing private key material.
- Proof checks are performed without plaintext policy inspection of protected semantics.
- Responses may expose payload hash and metadata rather than full payload body.

### 9.2 Integrity Properties

- Per-packet authenticity via HMAC envelope signing.
- Payload binding through canonical hash included in signature input.
- Relay-bound forwarding token prevents unauthorized relay invocation.

### 9.3 Replay Resistance

- Strictly increasing sequence per session.
- Nonce uniqueness cache/window.
- Timestamp freshness threshold.

### 9.4 Access-Control Properties

- No packet forwarding occurs unless all verification stages pass.
- Destination must be explicit and policy-allowed.

## 10. Functional Modes

### 10.1 Raw Payload Mode

- Used for generic packet payload transfer.
- Relay forwards JSON object containing payload and selected packet metadata.

### 10.2 HTTP Request Mode

- Payload represents an HTTP operation (method, headers, body).
- Gateway verifies packet proofs first, then relay performs actual HTTP request.

## 11. Supported Interfaces and Operational Surface

### 11.1 User Interfaces

- Frontend-based workflow for auth and send operations.
- CLI-based workflow for scriptable auth and send operations.

### 11.2 Protocol Endpoints

- Auth endpoint for one-time authorization proof validation.
- Packet endpoint for per-packet verification and dispatch.
- Relay forward endpoint for controlled post-verification forwarding.
- Health endpoints for availability checks.

### 11.3 Outputs and Telemetry

- PASS/DROP verdicts.
- Destination and forwarding status metadata.
- Hash-centric observability fields.

## 12. Implementation-Specific Functional Inventory

The implemented system currently includes the following concrete functionality:

- Groth16 auth proof verification at authorization stage.
- EZKL proof verification at packet stage.
- Session issuance and persistence.
- Session-bound HMAC packet signatures.
- Sequence/nonce/timestamp anti-replay checks.
- Destination-required packet schema.
- Dual forwarding modes (raw, HTTP request).
- Relay mediation with signed forward tokens.
- Destination allowlist policy in relay.
- API and frontend orchestration for proof generation and packet send.
- CLI support for protocol interaction.

## 13. Distinguishing Features Relative to Conventional Systems

PCNP is not merely a secure tunnel or firewall rule engine. Distinguishing aspects include:

- Proof-carrying packet semantics (proof attached at packet granularity).
- Multi-proof gating (authorization proof and packet-safety proof).
- Cryptographic envelope binding packet metadata and payload hash.
- Verification-before-forwarding across explicit destination semantics.
- Relay forwarding that itself requires gateway-issued cryptographic token.

## 14. Potential Independent Claim Concepts (Drafting Aids)

The following are drafting aids for counsel, not legal claims:

1. A method for packet transmission where each packet includes at least one zero-knowledge proof and is forwarded only after proof verification.
2. A method combining authorization proof verification and machine-learning inference proof verification for packet admission control.
3. A method binding packet authenticity to session-bound signature inputs including sequence, nonce, timestamp, and payload hash.
4. A method of post-verification relay forwarding requiring a signed forward token tied to packet commitment data.
5. A system implementing dual packet modes (raw payload and HTTP descriptor) under the same proof-carrying verification policy.

## 15. Potential Dependent Claim Concepts (Drafting Aids)

1. Enforcing strict monotonic sequence progression per session.
2. Enforcing nonce uniqueness within bounded replay window.
3. Enforcing timestamp freshness threshold.
4. Enforcing destination host allowlist at relay.
5. Returning hash-only observability metadata to reduce payload exposure.
6. Using canonicalized payload serialization for signature consistency.

## 16. Example Operational Sequence

1. Sender authenticates once with Groth16 proof and obtains session credentials.
2. Sender generates packet ML proof for current packet features.
3. Sender constructs PCNP packet envelope and signs packet metadata.
4. Gateway verifies envelope and ML proof, then issues relay forward token.
5. Relay validates token and forwards packet to explicit destination.
6. Gateway reports PASS and forwarding metadata.

## 17. Deployment and Commercialization Notes

### 17.1 Deployment Variants

- Single-node test deployment (gateway + relay + destination locally).
- Distributed deployment (gateway and relay separated across trust zones).
- Multi-tenant deployment (shared relay with per-tenant keys and allowlists).

### 17.2 Commercial Value Propositions

- Zero-knowledge enforced packet admission in privacy-sensitive networks.
- Compliance-friendly reduced payload inspection.
- Fine-grained cryptographic control over packet forwarding.
- Compatible with API-oriented and raw data transports.

## 18. Known Constraints and Engineering Considerations

- Proof generation latency and computational cost at sender side.
- Key management requirements for session and forwarding secrets.
- Relay allowlist and timeout tuning for production reliability.
- Storage/rotation policy for session and replay state.

## 19. Patent Drafting Checklist

Use this checklist when converting this technical draft into formal patent text:

- Define terms: packet, proof-carrying packet, gateway verifier, relay token.
- Include at least one independent system claim and one method claim.
- Capture both raw and HTTP mode embodiments.
- Capture both single-proof and dual-proof embodiments, with dual-proof as preferred embodiment.
- Include anti-replay mechanisms as required/optional dependent features.
- Include destination allowlist as policy control embodiment.
- Include canonical payload hashing/signature binding details.
- Include operational sequence diagrams and component block diagrams.

## 20. Figure Suggestions for Patent Filing

1. System block diagram (Sender, Gateway, Relay, Destination).
2. Authorization sequence diagram.
3. Packet verification and forwarding sequence diagram.
4. Packet envelope data structure diagram.
5. Relay token validation flowchart.
6. Replay protection state machine diagram.

## 21. Executive Summary for Patent Team

PCNP introduces a proof-carrying packet architecture where packets are accepted and forwarded only if they carry valid cryptographic evidence of authorization and packet safety, and only if their signed envelope metadata satisfies anti-replay and authenticity checks. A relay stage further requires a gateway-minted signed forward token, enabling explicit, policy-controlled destination forwarding without requiring traditional payload inspection as the primary decision mechanism.

This document is intended as the technical foundation for drafting a formal patent application.
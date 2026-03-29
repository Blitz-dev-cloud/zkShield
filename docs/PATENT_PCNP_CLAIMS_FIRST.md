# PCNP Claims-First Draft

## Claim Set A: Method Claims

### 1. Independent Method Claim
1. A computer-implemented method for proof-gated packet transmission, the method comprising:
   receiving, at a gateway verifier, a packet request comprising a payload, a destination identifier, a session identifier, a machine-learning zero-knowledge proof, and packet metadata;
   recomputing, by the gateway verifier, a payload hash from a canonical representation of the payload;
   validating, by the gateway verifier, a session-bound cryptographic envelope using the session identifier, the payload hash, and the packet metadata;
   verifying, by the gateway verifier, the machine-learning zero-knowledge proof;
   generating, by the gateway verifier responsive to successful validation and verification, a forward token cryptographically bound to the destination identifier and the payload hash; and
   causing forwarding, through a relay service that validates the forward token, of the payload toward the destination identifier.

### 2. Dependent Method Claim
2. The method of claim 1, wherein validating the session-bound cryptographic envelope comprises enforcing a strictly increasing sequence value per session.

### 3. Dependent Method Claim
3. The method of claim 1, wherein validating the session-bound cryptographic envelope comprises rejecting a nonce previously used in the session.

### 4. Dependent Method Claim
4. The method of claim 1, wherein validating the session-bound cryptographic envelope comprises rejecting packet metadata having a timestamp outside a freshness window.

### 5. Dependent Method Claim
5. The method of claim 1, wherein validating the session-bound cryptographic envelope comprises comparing an HMAC signature against an expected signature derived from the session identifier, sequence, nonce, timestamp, and payload hash.

### 6. Dependent Method Claim
6. The method of claim 1, further comprising, before receiving the packet request, authorizing a sender by verifying an authorization zero-knowledge proof and issuing the session identifier and a session secret key.

### 7. Dependent Method Claim
7. The method of claim 6, wherein the authorization zero-knowledge proof is a Groth16 proof.

### 8. Dependent Method Claim
8. The method of claim 1, wherein the machine-learning zero-knowledge proof is generated from an inference circuit compiled from a neural-network model.

### 9. Dependent Method Claim
9. The method of claim 1, wherein forwarding comprises raw payload forwarding in JSON format including selected packet metadata.

### 10. Dependent Method Claim
10. The method of claim 1, wherein forwarding comprises HTTP request forwarding according to a method, headers, and body represented in the payload.

### 11. Dependent Method Claim
11. The method of claim 1, wherein the relay service validates that a destination in a forwarding request exactly matches the destination identifier in the forward token.

### 12. Dependent Method Claim
12. The method of claim 1, wherein the relay service enforces a destination host allowlist.

### 13. Dependent Method Claim
13. The method of claim 1, wherein a response to a sender includes metadata and hash information without returning plaintext payload content.

## Claim Set B: System Claims

### 14. Independent System Claim
14. A proof-carrying packet network system comprising:
   a sender-side packet constructor configured to generate packet metadata and a packet-level machine-learning zero-knowledge proof;
   a gateway verifier configured to validate a session-bound cryptographic envelope and verify the packet-level machine-learning zero-knowledge proof;
   a relay service configured to validate a gateway-issued forward token and conditionally forward to a destination; and
   a session store maintaining per-session replay-protection state,
   wherein the gateway verifier is configured to permit forwarding only when both envelope validation and proof verification succeed.

### 15. Dependent System Claim
15. The system of claim 14, further comprising an authorization verifier configured to verify an authorization zero-knowledge proof and issue session credentials.

### 16. Dependent System Claim
16. The system of claim 15, wherein the authorization zero-knowledge proof proves sender membership in a commitment structure.

### 17. Dependent System Claim
17. The system of claim 14, wherein the session store tracks at least one of: last accepted sequence, nonce history, and session creation time.

### 18. Dependent System Claim
18. The system of claim 14, wherein the forward token includes session identifier, destination identifier, timestamp, nonce, payload hash, and token signature.

### 19. Dependent System Claim
19. The system of claim 14, wherein the relay service rejects forwarding if a token age exceeds a configured time-to-live threshold.

### 20. Dependent System Claim
20. The system of claim 14, wherein the sender-side packet constructor supports both a raw payload mode and an HTTP request descriptor mode.

## Claim Set C: Computer-Readable Medium Claims

### 21. Independent Medium Claim
21. A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause operations comprising:
   receiving a packet request including payload, destination, session identifier, machine-learning zero-knowledge proof, and packet metadata;
   computing a canonical payload hash;
   validating a session-bound signature and replay constraints using packet metadata;
   verifying the machine-learning zero-knowledge proof;
   generating a cryptographically signed forward token bound to destination and payload hash; and
   forwarding through a relay that independently validates the forward token.

### 22. Dependent Medium Claim
22. The medium of claim 21, wherein validating replay constraints includes both sequence monotonicity and nonce uniqueness checks.

### 23. Dependent Medium Claim
23. The medium of claim 21, wherein forwarding is denied unless token destination and request destination are identical.

### 24. Dependent Medium Claim
24. The medium of claim 21, wherein the machine-learning zero-knowledge proof attests to an inference result computed over network-packet feature values.

## Fallback Embodiment Set

1. Single-proof embodiment:
   one proof is required per packet, and the second proof is optional.
2. Dual-proof preferred embodiment:
   an authorization proof gates session issuance, and a machine-learning proof gates each packet.
3. Relay-optional embodiment:
   forwarding can be performed directly by gateway under the same envelope and proof checks.

## Drafting Notes for Counsel

1. Keep novelty emphasis on packet granularity proof-carrying semantics.
2. Preserve broad terms:
   cryptographic envelope, packet metadata, proof verifier, forwarding authority token.
3. Avoid over-limiting claim language to one proof library, one curve, or one ML architecture.
4. Include at least one claim that explicitly recites both:
   verification-before-forwarding and per-packet replay checks.

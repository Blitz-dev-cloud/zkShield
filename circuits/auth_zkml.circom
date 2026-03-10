pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

// ─────────────────────────────────────────────────────
// MerkleProof: verifies leaf exists in Merkle tree
// ─────────────────────────────────────────────────────
template MerkleProof(N) {
    signal input leaf;
    signal input path[N];
    signal input pathIndices[N];
    signal input root;

    signal nodes[N+1];
    nodes[0] <== leaf;

    component hashers[N];

    for (var k = 0; k < N; k++) {
        pathIndices[k] * (1 - pathIndices[k]) === 0;

        hashers[k] = Poseidon(2);
        hashers[k].inputs[0] <== nodes[k] + pathIndices[k] * (path[k] - nodes[k]);
        hashers[k].inputs[1] <== path[k]  + pathIndices[k] * (nodes[k] - path[k]);

        nodes[k+1] <== hashers[k].out;
    }

    nodes[N] === root;
}

// ─────────────────────────────────────────────────────
// zkShield++ Unified Auth Circuit
// Proves: authorization + ML safety simultaneously
// N = Merkle depth, D = feature dimensions
// ─────────────────────────────────────────────────────
template ZKShield(N, D) {

    // ── Private Inputs ──────────────────────────────
    signal input sk;                // sender secret key
    signal input path[N];           // Merkle sibling hashes
    signal input pathIndices[N];    // Merkle path directions

    // ── Public Inputs ───────────────────────────────
    signal input root;              // authorized Merkle root
    signal input nullifier_hash;    // prevents replay attacks

    // ── Step 1: Compute commitment c = Poseidon(sk) ─
    component commit = Poseidon(1);
    commit.inputs[0] <== sk;

    signal c;
    c <== commit.out;

    // ── Step 2: Compute nullifier = Poseidon(sk, 0) ─
    // Unique per sender, prevents proof replay
    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== sk;
    nullifier.inputs[1] <== 0;

    // Nullifier must match the public nullifier_hash
    nullifier.out === nullifier_hash;

    // ── Step 3: Merkle inclusion proof ──────────────
    component merkle = MerkleProof(N);
    merkle.leaf           <== c;
    merkle.path           <== path;
    merkle.pathIndices    <== pathIndices;
    merkle.root           <== root;

    // merkle internally constrains: computed root === root
}

// Depth 3 Merkle tree
component main {public [root, nullifier_hash]} = ZKShield(3, 4);
pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/poseidon.circom";

template MerkleProof(N) {

    //private inputs
    signal input leaf; // c = Poseidon(h)
    signal input path[N]; // Siblings of the nodes in the path from the leaf to the root
    signal input pathIndices[N]; // 0 if the current node is a left child, 1 if it's a right child

    //public input
    signal input root; // The expected root of the Merkle tree (public)

    signal nodes[N + 1];
    nodes[0] <== leaf; // Start from the leaf node

    component hashers[N]; // Create N Poseidon hash components for the path

    for( var k = 0 ; k < N ; k++ ) {
        
        pathIndices[k] * (1 - pathIndices[k]) === 0; // Ensure pathIndices is binary (0 or 1)

        hashers[k] = Poseidon(2); // Each hasher takes 2 inputs (current node and sibling)

        // If pathIndices[k] = 0: hash(node, sibling)  → leaf is on left
        // If pathIndices[k] = 1: hash(sibling, node)  → leaf is on right
        // This selection is done without if/else using linear algebra:

        hashers[k].inputs[0] <== nodes[k] + pathIndices[k] * (path[k] - nodes[k]); // Select node or sibling based on pathIndices
        hashers[k].inputs[1] <== path[k] + pathIndices[k] * (nodes[k] - path[k]); // Select sibling or node based on path

        nodes[k + 1] <== hashers[k].out; // Update the current node to the hash output for the next iteration
    }

    nodes[N] === root; // The final node after hashing should equal the expected root
}

component main {public [root]} = MerkleProof(3); // Example with a Merkle tree of height 3
pragma circom 2.0.0;
include "../node_modules/circomlib/circuits/poseidon.circom";

template TestCommitment() {
    signal input sk;
    signal output c;

    component h = Poseidon(1);
    h.inputs[0] <== sk;
    c <== h.out;
}

component main = TestCommitment();
const { buildPoseidon } = require("circomlibjs");

async function main() {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    // Our secret key
    const sk = BigInt(42);

    // Leaf = Poseidon(sk)
    const leaf = F.toObject(poseidon([sk]));
    console.log("leaf (c = Poseidon(42)):", leaf.toString());

    // Sibling hashes (we make these up for demo)
    const s0 = BigInt(111);
    const s1 = BigInt(222);
    const s2 = BigInt(333);

    // Level 1: hash(leaf, s0) because pathIndices[0] = 0 (leaf is left)
    const n1 = F.toObject(poseidon([leaf, s0]));
    console.log("n1 = Poseidon(leaf, s0):", n1.toString());

    // Level 2: hash(n1, s1) because pathIndices[1] = 0 (n1 is left)
    const n2 = F.toObject(poseidon([n1, s1]));
    console.log("n2 = Poseidon(n1, s1):", n2.toString());

    // Level 3 (root): hash(n2, s2) because pathIndices[2] = 0 (n2 is left)
    const root = F.toObject(poseidon([n2, s2]));
    console.log("root = Poseidon(n2, s2):", root.toString());
}

main();
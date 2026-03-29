const { buildPoseidon } = require("circomlibjs");

async function main() {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    const skArg = process.argv[2];
    const sk = skArg ? BigInt(skArg) : BigInt(42);

    // commitment
    const c = F.toObject(poseidon([sk]));
    console.log("leaf (c):", c.toString());

    // siblings
    const s0 = BigInt(111);
    const s1 = BigInt(222);
    const s2 = BigInt(333);

    // merkle path
    const n1 = F.toObject(poseidon([c, s0]));
    const n2 = F.toObject(poseidon([n1, s1]));
    const root = F.toObject(poseidon([n2, s2]));
    console.log("root:", root.toString());

    // nullifier = Poseidon(sk, 0)
    const nullifier = F.toObject(poseidon([sk, BigInt(0)]));
    console.log("nullifier_hash:", nullifier.toString());

    // write input.json
    const input = {
        sk: sk.toString(),
        path: [s0.toString(), s1.toString(), s2.toString()],
        pathIndices: ["0", "0", "0"],
        root: root.toString(),
        nullifier_hash: nullifier.toString()
    };

    const fs = require("fs");
    fs.writeFileSync("circuits/auth_input.json", JSON.stringify(input, null, 2));
    console.log("\nSaved to circuits/auth_input.json");
    console.log("secret_key:", sk.toString());
    console.log(JSON.stringify(input, null, 2));
}

main();

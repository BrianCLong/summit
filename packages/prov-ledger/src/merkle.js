"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Hex = sha256Hex;
exports.leafHash = leafHash;
exports.buildMerkle = buildMerkle;
exports.proofForLeaf = proofForLeaf;
exports.verifyProof = verifyProof;
const crypto_1 = require("crypto");
function sha256Hex(buf) {
    const h = (0, crypto_1.createHash)('sha256');
    h.update(buf);
    return h.digest('hex');
}
// Deterministic leaf encoding for a step
function leafHash(step) {
    const s = JSON.stringify(step, Object.keys(step).sort());
    return sha256Hex(Buffer.from(s));
}
function buildMerkle(leavesHex) {
    if (leavesHex.length === 0)
        return { root: sha256Hex(Buffer.from('EMPTY')), layers: [[]] };
    let layer = leavesHex.slice();
    const layers = [layer];
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const a = layer[i];
            const b = i + 1 < layer.length ? layer[i + 1] : layer[i]; // duplicate last if odd
            next.push(sha256Hex(Buffer.from(a + b)));
        }
        layer = next;
        layers.push(layer);
    }
    return { root: layer[0], layers };
}
function proofForLeaf(index, layers) {
    const path = [];
    let idx = index;
    for (let L = 0; L < layers.length - 1; L++) {
        const layer = layers[L];
        const isRight = idx % 2 === 1;
        const siblingIdx = isRight
            ? idx - 1
            : idx + 1 >= layer.length
                ? idx
                : idx + 1;
        const dir = isRight ? 'L' : 'R';
        path.push({ dir, hash: layer[siblingIdx] });
        idx = Math.floor(idx / 2);
    }
    return path;
}
function verifyProof(leaf, path, expectedRoot) {
    let h = leaf;
    for (const p of path) {
        h =
            p.dir === 'L'
                ? sha256Hex(Buffer.from(p.hash + h))
                : sha256Hex(Buffer.from(h + p.hash));
    }
    return h === expectedRoot;
}

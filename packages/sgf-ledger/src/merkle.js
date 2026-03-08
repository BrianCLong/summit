"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.h = h;
exports.merkleRoot = merkleRoot;
const crypto_1 = require("crypto");
function h(x) {
    return (0, crypto_1.createHash)("sha256").update(x).digest();
}
function merkleRoot(leaves) {
    if (leaves.length === 0)
        return h(Buffer.from("EMPTY"));
    let level = leaves.map(h);
    while (level.length > 1) {
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = i + 1 < level.length ? level[i + 1] : level[i]; // dup last
            next.push(h(Buffer.concat([left, right])));
        }
        level = next;
    }
    return level[0];
}

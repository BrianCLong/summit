"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSimilarityHash = computeSimilarityHash;
function computeSimilarityHash(tree) {
    const leaves = [];
    (function walk(n) {
        if (!n.children || n.children.length === 0) {
            leaves.push(n.hash);
            return;
        }
        for (const c of n.children) {
            walk(c);
        }
    })(tree);
    leaves.sort();
    return `simhash_stub_${leaves.slice(0, 8).join("_")}`;
}

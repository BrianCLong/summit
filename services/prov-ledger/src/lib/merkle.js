"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMerkleTree = buildMerkleTree;
exports.renderTree = renderTree;
// @ts-nocheck
const canonical_js_1 = require("./canonical.js");
function buildMerkleTree(leaves) {
    const sortedLeaves = [...leaves].sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`));
    const initialLayer = sortedLeaves.map((leaf) => (0, canonical_js_1.sha256)(`${leaf.type}:${leaf.id}:${leaf.hash}`));
    const layers = [initialLayer];
    let current = initialLayer;
    while (current.length > 1) {
        const next = [];
        for (let i = 0; i < current.length; i += 2) {
            const left = current[i];
            const right = i + 1 < current.length ? current[i + 1] : left;
            next.push((0, canonical_js_1.sha256)(`${left}|${right}`));
        }
        layers.push(next);
        current = next;
    }
    return {
        root: current[0] || (0, canonical_js_1.sha256)(''),
        layers,
        leaves: sortedLeaves,
    };
}
function renderTree(tree) {
    return (0, canonical_js_1.canonicalStringify)({
        root: tree.root,
        layers: tree.layers,
        leaves: tree.leaves.map((leaf) => ({ id: leaf.id, type: leaf.type, hash: leaf.hash })),
    });
}

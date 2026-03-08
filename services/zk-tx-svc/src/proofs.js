"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeOverlapProof = makeOverlapProof;
function makeOverlapProof(a, b) {
    return {
        id: "pr_" + Date.now(),
        type: "overlap",
        selectorHashA: a,
        selectorHashB: b,
        proof: "zk-stub"
    };
}

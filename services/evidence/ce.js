"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha = sha;
exports.merkleLeaves = merkleLeaves;
exports.root = root;
exports.proof = proof;
const crypto_1 = __importDefault(require("crypto"));
function sha(s) {
    return crypto_1.default.createHash('sha256').update(s).digest('hex');
}
function merkleLeaves(obligations) {
    return Object.keys(obligations)
        .sort()
        .map((k) => ({ k, h: sha(JSON.stringify({ k, v: obligations[k] })) }));
}
function root(leaves) {
    let layer = leaves.map((x) => x.h);
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const a = layer[i], b = layer[i + 1] || a;
            next.push(sha(a + b));
        }
        layer = next;
    }
    return layer[0];
}
function proof(idx, leaves) {
    const path = [];
    let i = idx, layer = leaves.slice();
    while (layer.length > 1) {
        const sib = i ^ 1;
        path.push(layer[sib] || layer[i]);
        const next = [];
        for (let j = 0; j < layer.length; j += 2) {
            next.push(sha((layer[j] || '') + (layer[j + 1] || layer[j] || '')));
        }
        layer = next;
        i = Math.floor(i / 2);
    }
    return path;
}

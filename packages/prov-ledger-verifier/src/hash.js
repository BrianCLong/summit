"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.sha256File = sha256File;
exports.hashLeaf = hashLeaf;
exports.buildMerkleRoot = buildMerkleRoot;
const crypto_1 = require("crypto");
const promises_1 = __importDefault(require("fs/promises"));
function sha256(input) {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(input);
    return hash.digest('hex');
}
async function sha256File(path) {
    const data = await promises_1.default.readFile(path);
    return sha256(data);
}
function hashLeaf(id, contentHash) {
    return sha256(`${id}:${contentHash}`);
}
function buildMerkleRoot(leaves) {
    if (leaves.length === 0) {
        return { root: '', layers: [[]] };
    }
    let layer = leaves.slice();
    const layers = [layer];
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const left = layer[i];
            const right = layer[i + 1] ?? layer[i];
            next.push(sha256(left + right));
        }
        layer = next;
        layers.push(layer);
    }
    return { root: layer[0] ?? '', layers };
}

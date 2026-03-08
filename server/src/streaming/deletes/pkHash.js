"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stablePkJson = stablePkJson;
exports.computePkHash = computePkHash;
const crypto_1 = require("crypto");
function stablePkJson(key) {
    // Sort keys to ensure deterministic JSON string
    const sortedKeys = Object.keys(key).sort();
    const sortedObj = {};
    for (const k of sortedKeys) {
        sortedObj[k] = key[k];
    }
    return JSON.stringify(sortedObj);
}
function computePkHash(pkJson) {
    return (0, crypto_1.createHash)('sha256').update(pkJson).digest('hex');
}

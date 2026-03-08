"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalStringify = canonicalStringify;
exports.sha256Hex = sha256Hex;
exports.buildEvidFromInputs = buildEvidFromInputs;
const node_crypto_1 = require("node:crypto");
function normalize(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => normalize(entry));
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort((a, b) => a.localeCompare(b))
            .reduce((acc, key) => {
            acc[key] = normalize(value[key]);
            return acc;
        }, {});
    }
    if (typeof value === 'number') {
        return Number(value.toFixed(6));
    }
    return value;
}
function canonicalStringify(value) {
    return JSON.stringify(normalize(value));
}
function sha256Hex(value) {
    return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
}
function buildEvidFromInputs(inputManifest, dateStamp) {
    const manifest = canonicalStringify(inputManifest);
    const inputManifestSha256 = sha256Hex(manifest);
    return {
        evid: `EVID-${dateStamp}-${inputManifestSha256.slice(0, 8)}`,
        inputManifestSha256,
    };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
// Mock data generation for MWS
const match = {
    rfpId: 'rfp-123',
    vendorId: 'vendor-456',
    score: 95.5
};
const artifact = {
    match,
    recommendation: 'AWARD',
    justification: 'Highest score and compliance verified.'
};
// Stable stringify manually to ensure determinism (sorting keys)
function stableStringify(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(stableStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}
const content = stableStringify(artifact);
const hash = (0, crypto_1.createHash)('sha256').update(content).digest('hex');
const output = {
    meta: {
        generatedAt: new Date().toISOString(),
        version: '1.0'
    },
    artifact,
    signature: {
        hash,
        algo: 'sha256'
    }
};
const outDir = 'artifacts/factgov';
(0, fs_1.mkdirSync)(outDir, { recursive: true });
const outfile = (0, path_1.join)(outDir, `award_${hash}.json`);
(0, fs_1.writeFileSync)(outfile, JSON.stringify(output, null, 2));
console.log(`Generated artifact: ${outfile}`);

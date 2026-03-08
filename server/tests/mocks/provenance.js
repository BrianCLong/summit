"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProvenanceRecord = void 0;
const crypto_1 = require("crypto");
const createProvenanceRecord = (input, algo, version, timestamp) => {
    const inputHash = (0, crypto_1.createHash)('sha256').update(`${algo}:${input}`).digest('hex');
    const signature = (0, crypto_1.createHmac)('sha256', 'test-key')
        .update(`${inputHash}:${version}:${timestamp}`)
        .digest('hex');
    return {
        inputHash,
        signature,
    };
};
exports.createProvenanceRecord = createProvenanceRecord;
exports.default = { createProvenanceRecord: exports.createProvenanceRecord };

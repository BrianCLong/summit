"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProvenanceRecord = createProvenanceRecord;
const crypto_1 = require("crypto");
const SECRET = process.env.PROVENANCE_SECRET || 'dev-secret';
function createProvenanceRecord(data, algorithm = 'SHA-256', version = '1', timestamp = new Date().toISOString()) {
    const hash = (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    const signature = (0, crypto_1.createHmac)('sha256', SECRET)
        .update(`${hash}|${algorithm}|${version}|${timestamp}`)
        .digest('hex');
    return { inputHash: hash, algorithm, version, timestamp, signature };
}

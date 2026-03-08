"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEvidenceId = generateEvidenceId;
const crypto_1 = require("crypto");
function generateEvidenceId(prefix = 'EVD-OPS') {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const random = (0, crypto_1.randomBytes)(4).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

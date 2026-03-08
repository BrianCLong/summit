"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyPII = classifyPII;
exports.hash = hash;
const crypto_1 = require("crypto");
function classifyPII(value) {
    if (/@/.test(value)) {
        return 'email';
    }
    if (/\+?\d[\d\s-]{7,}/.test(value)) {
        return 'phone';
    }
    return 'none';
}
function hash(s) {
    return (0, crypto_1.createHash)('sha256').update(s).digest('hex');
}

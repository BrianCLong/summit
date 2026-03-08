"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySnapshot = verifySnapshot;
const crypto_1 = require("crypto");
function verifySnapshot(bytes, digest, _hubCert, _signature) {
    const d = 'sha256:' + (0, crypto_1.createHash)('sha256').update(bytes).digest('hex');
    if (d !== digest)
        throw new Error('snapshot digest mismatch');
    return true;
}

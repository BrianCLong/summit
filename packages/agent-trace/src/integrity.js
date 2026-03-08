"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signRecord = signRecord;
exports.verifyRecord = verifyRecord;
exports.computeContentHash = computeContentHash;
const crypto_1 = require("crypto");
function signRecord(record, privateKey) {
    const data = JSON.stringify(record);
    const sign = (0, crypto_1.createSign)('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'hex');
}
function verifyRecord(record, signature, publicKey) {
    const data = JSON.stringify(record);
    const verify = (0, crypto_1.createVerify)('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
}
function computeContentHash(content) {
    return 'sha256:' + (0, crypto_1.createHash)('sha256').update(content).digest('hex');
}

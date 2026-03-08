"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hash = hash;
exports.sign = sign;
exports.verify = verify;
const crypto_1 = require("crypto");
function hash(content) {
    return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
}
function sign(assertionHash, epoch, subjectToken, privatePem, signer = 'aer @intelgraph') {
    const s = (0, crypto_1.createSign)('RSA-SHA256');
    s.update(`${assertionHash}.${epoch}.${subjectToken}`);
    return {
        signer,
        signature: s.sign(privatePem, 'base64'),
        algo: 'RSA-SHA256',
    };
}
function verify(aer, publicPem) {
    const v = (0, crypto_1.createVerify)('RSA-SHA256');
    v.update(`${aer.assertionHash}.${aer.epoch}.${aer.subjectToken}`);
    return v.verify(publicPem, Buffer.from(aer.signature, 'base64'));
}

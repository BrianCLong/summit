"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPayload = signPayload;
exports.verifyPayload = verifyPayload;
const crypto_1 = require("crypto");
function signPayload(payload, privateKey, algorithm) {
    const data = Buffer.from(payload);
    if (algorithm === 'ed25519') {
        return (0, crypto_1.sign)(null, data, privateKey).toString('base64');
    }
    const signer = (0, crypto_1.createSign)('RSA-SHA256');
    signer.update(data);
    signer.end();
    return signer.sign(privateKey, 'base64');
}
function verifyPayload(payload, signature, publicKey, algorithm) {
    const data = Buffer.from(payload);
    const sig = Buffer.from(signature, 'base64');
    if (algorithm === 'ed25519') {
        return (0, crypto_1.verify)(null, data, publicKey, sig);
    }
    const verifier = (0, crypto_1.createVerify)('RSA-SHA256');
    verifier.update(data);
    verifier.end();
    return verifier.verify(publicKey, sig);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPayload = signPayload;
exports.verifyPayload = verifyPayload;
const node_crypto_1 = require("node:crypto");
function signPayload(payload, privateKeyPem) {
    const key = (0, node_crypto_1.createPrivateKey)(privateKeyPem);
    const signature = (0, node_crypto_1.sign)(null, Buffer.from(payload, 'utf8'), key);
    return signature.toString('base64');
}
function verifyPayload(payload, publicKeyPem, signatureB64) {
    const key = (0, node_crypto_1.createPublicKey)(publicKeyPem);
    return (0, node_crypto_1.verify)(null, Buffer.from(payload, 'utf8'), key, Buffer.from(signatureB64, 'base64'));
}

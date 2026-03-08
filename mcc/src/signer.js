"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signCanonicalPayload = signCanonicalPayload;
exports.verifySignature = verifySignature;
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
function loadPrivateKey(privateKeyPath) {
    const pem = (0, node_fs_1.readFileSync)(privateKeyPath, 'utf8');
    return (0, node_crypto_1.createPrivateKey)(pem);
}
function resolvePublicKey(privateKeyPath, publicKeyPath) {
    if (publicKeyPath) {
        return (0, node_fs_1.readFileSync)(publicKeyPath, 'utf8');
    }
    const privateKey = loadPrivateKey(privateKeyPath);
    const publicKey = (0, node_crypto_1.createPublicKey)(privateKey);
    return publicKey.export({ type: 'spki', format: 'pem' }).toString();
}
function signCanonicalPayload(canonicalPayload, privateKeyPath, publicKeyPath) {
    const privateKey = loadPrivateKey(privateKeyPath);
    const signature = (0, node_crypto_1.sign)(null, Buffer.from(canonicalPayload), privateKey);
    const publicKey = resolvePublicKey(privateKeyPath, publicKeyPath);
    return {
        algorithm: 'ed25519',
        publicKey,
        value: signature.toString('base64'),
    };
}
function verifySignature(canonicalPayload, signature) {
    const publicKey = (0, node_crypto_1.createPublicKey)(signature.publicKey);
    return (0, node_crypto_1.verify)(null, Buffer.from(canonicalPayload), publicKey, Buffer.from(signature.value, 'base64'));
}

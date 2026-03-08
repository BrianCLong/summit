"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptSigner = void 0;
const crypto_1 = require("crypto");
class ReceiptSigner {
    keyId;
    privateKey;
    publicKey;
    constructor(keyId = 'kms-default') {
        this.keyId = keyId;
        const pair = (0, crypto_1.generateKeyPairSync)('ed25519');
        this.privateKey = pair.privateKey;
        this.publicKey = pair.publicKey
            .export({ type: 'spki', format: 'der' })
            .toString('base64');
    }
    signPayload(payload, requestedKeyId) {
        const signedAt = new Date().toISOString();
        const buffer = /^[a-f0-9]{64}$/i.test(payload) && payload.length === 64
            ? Buffer.from(payload, 'hex')
            : Buffer.from(payload);
        const value = (0, crypto_1.sign)(null, buffer, this.privateKey).toString('base64');
        return {
            algorithm: 'ed25519',
            keyId: requestedKeyId ?? this.keyId,
            publicKey: this.publicKey,
            value,
            signedAt,
        };
    }
    verify(payload, signed) {
        const buffer = /^[a-f0-9]{64}$/i.test(payload) && payload.length === 64
            ? Buffer.from(payload, 'hex')
            : Buffer.from(payload);
        return (0, crypto_1.verify)(null, buffer, {
            key: Buffer.from(signed.publicKey, 'base64'),
            format: 'der',
            type: 'spki',
        }, Buffer.from(signed.value, 'base64'));
    }
    getPublicKey() {
        return this.publicKey;
    }
}
exports.ReceiptSigner = ReceiptSigner;

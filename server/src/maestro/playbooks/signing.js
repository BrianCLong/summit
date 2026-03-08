"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybookSigner = void 0;
const crypto_1 = require("crypto");
const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
class PlaybookSigner {
    static createPayload(playbook) {
        const { signature, ...unsigned } = playbook;
        return unsigned;
    }
    static sign(playbook, privateKeyPem) {
        if (!playbook.version || !SEMVER_REGEX.test(playbook.version)) {
            throw new Error('Playbook version must be valid semver');
        }
        const payload = Buffer.from(JSON.stringify(this.createPayload(playbook)));
        const privateKey = (0, crypto_1.createPrivateKey)(privateKeyPem);
        const publicKey = (0, crypto_1.createPublicKey)(privateKey);
        const signatureBuffer = (0, crypto_1.sign)(null, payload, privateKey);
        const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
        return {
            algorithm: 'ed25519',
            signature: Buffer.from(signatureBuffer).toString('base64'),
            publicKey: Buffer.from(publicKeyPem).toString('base64'),
            signedAt: new Date().toISOString(),
        };
    }
    static verify(playbook, signature) {
        const payload = Buffer.from(JSON.stringify(this.createPayload(playbook)));
        const publicKeyPem = Buffer.from(signature.publicKey, 'base64').toString('utf-8');
        return (0, crypto_1.verify)(null, payload, (0, crypto_1.createPublicKey)(publicKeyPem), Buffer.from(signature.signature, 'base64'));
    }
}
exports.PlaybookSigner = PlaybookSigner;

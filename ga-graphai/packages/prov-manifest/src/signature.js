"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeManifest = canonicalizeManifest;
exports.hashManifest = hashManifest;
exports.signManifest = signManifest;
exports.verifyManifestSignature = verifyManifestSignature;
const node_crypto_1 = __importDefault(require("node:crypto"));
function sortObject(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sortObject(item));
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
            acc[key] = sortObject(value[key]);
            return acc;
        }, {});
    }
    return value;
}
function canonicalizeManifest(manifest) {
    const { signature: _signature, ...rest } = manifest;
    const sorted = sortObject(rest);
    return JSON.stringify(sorted);
}
function hashManifest(manifest) {
    return node_crypto_1.default.createHash('sha256').update(canonicalizeManifest(manifest)).digest('hex');
}
function signManifest(manifest, options) {
    const payload = Buffer.from(canonicalizeManifest(manifest));
    const signatureBuffer = node_crypto_1.default.sign(null, payload, options.privateKeyPem);
    const publicKey = options.publicKeyPem
        ? node_crypto_1.default.createPublicKey(options.publicKeyPem).export({ type: 'spki', format: 'pem' }).toString()
        : node_crypto_1.default.createPublicKey(options.privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();
    const signature = {
        algorithm: 'ed25519',
        keyId: options.keyId,
        publicKey,
        signature: signatureBuffer.toString('base64'),
        signedAt: options.signedAt ?? new Date().toISOString(),
    };
    return {
        manifestHash: hashManifest(manifest),
        signature,
    };
}
function verifyManifestSignature(manifest, signatureFile, publicKeyOverride) {
    const payload = Buffer.from(canonicalizeManifest(manifest));
    const expectedHash = hashManifest(manifest);
    if (signatureFile.manifestHash !== expectedHash) {
        return { valid: false, reason: 'Manifest hash mismatch' };
    }
    const publicKey = publicKeyOverride ?? signatureFile.signature.publicKey;
    if (!publicKey) {
        return { valid: false, reason: 'Public key missing' };
    }
    const signature = Buffer.from(signatureFile.signature.signature, 'base64');
    const ok = node_crypto_1.default.verify(null, payload, publicKey, signature);
    return ok ? { valid: true } : { valid: false, reason: 'Signature invalid' };
}

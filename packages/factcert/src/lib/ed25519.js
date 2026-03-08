"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEd25519KeyPair = generateEd25519KeyPair;
exports.sign = sign;
exports.verify = verify;
const node_crypto_1 = require("node:crypto");
function base64UrlToHex(str) {
    return Buffer.from(str, 'base64url').toString('hex');
}
function hexToBase64Url(str) {
    return Buffer.from(str, 'hex').toString('base64url');
}
/**
 * Generate a new Ed25519 key pair.
 * @returns The key pair in hex format.
 */
function generateEd25519KeyPair() {
    const { privateKey, publicKey } = (0, node_crypto_1.generateKeyPairSync)('ed25519');
    const privJwk = privateKey.export({ format: 'jwk' });
    const pubJwk = publicKey.export({ format: 'jwk' });
    if (!privJwk.d || !pubJwk.x) {
        throw new Error('Failed to export JWK keys');
    }
    const d = base64UrlToHex(privJwk.d);
    const x = base64UrlToHex(pubJwk.x);
    return {
        privateKey: d + x, // Concatenate d and x to form a self-contained private key string
        publicKey: x
    };
}
/**
 * Sign a message using an Ed25519 private key.
 * @param message The message to sign (string).
 * @param privateKeyHex The private key in hex format (must be 128 chars / 64 bytes: d + x).
 * @returns The signature in hex format.
 */
function sign(message, privateKeyHex) {
    // We expect privateKeyHex to contain both d and x (concatenated).
    // Length check: 128 hex chars.
    if (privateKeyHex.length !== 128) {
        throw new Error('Invalid private key length. Expected 128 hex characters (d + x).');
    }
    const dHex = privateKeyHex.slice(0, 64);
    const xHex = privateKeyHex.slice(64);
    const jwk = {
        kty: 'OKP',
        crv: 'Ed25519',
        d: hexToBase64Url(dHex),
        x: hexToBase64Url(xHex)
    };
    try {
        const privateKey = (0, node_crypto_1.createPrivateKey)({
            key: jwk,
            format: 'jwk'
        });
        const signature = (0, node_crypto_1.sign)(null, Buffer.from(message), privateKey);
        return signature.toString('hex');
    }
    catch (error) {
        throw new Error(`Signing failed: ${error.message}`);
    }
}
/**
 * Verify a signature using an Ed25519 public key.
 * @param message The message that was signed.
 * @param signatureHex The signature in hex format.
 * @param publicKeyHex The public key in hex format.
 * @returns True if valid, false otherwise.
 */
function verify(message, signatureHex, publicKeyHex) {
    const jwk = {
        kty: 'OKP',
        crv: 'Ed25519',
        x: hexToBase64Url(publicKeyHex)
    };
    const publicKey = (0, node_crypto_1.createPublicKey)({
        key: jwk,
        format: 'jwk'
    });
    return (0, node_crypto_1.verify)(null, Buffer.from(message), publicKey, Buffer.from(signatureHex, 'hex'));
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyManifest = verifyManifest;
// packages/extension-sdk/src/manifest.ts
const node_crypto_1 = require("node:crypto");
function verifyManifest(m, pubKey) {
    // Construct payload same as signing (excluding signature)
    const payload = JSON.stringify({ ...m, signature: undefined });
    const signature = Buffer.from(m.signature, 'base64');
    // Verify using Ed25519
    // Assuming pubKey is a PEM encoded public key string
    return (0, node_crypto_1.verify)(null, Buffer.from(payload), pubKey, signature);
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.signManifest = signManifest;
// @ts-nocheck
const node_buffer_1 = require("node:buffer");
/**
 * Signs a manifest object.
 *
 * @param manifest The JSON object to sign.
 * @param options Signing options.
 * @returns The signature string. Format depends on signer.
 *          - none: "none:<base64-manifest>"
 *          - ed25519: "ed25519:<base64-signature>"
 */
async function signManifest(manifest, options = {}) {
    const { signerType = 'none', privateKey } = options;
    // Canonicalize via JSON.stringify for this stub.
    // In production, use a deterministic canonicalization (RFC 8785).
    const payload = JSON.stringify(manifest);
    if (signerType === 'none') {
        // For 'none', we just confirm we "signed" it by returning a deterministic string.
        // The prompt says "none signer produces predictable output".
        // We'll append a fixed string or just encode the payload.
        // Let's create a "signature" that is just the hash of the payload prefixed with "none:".
        // Or even simpler as per common JWT 'none' alg patterns (but this is not JWT).
        // Let's return "none:<base64(payload)>" effectively binding it to the content
        // but without cryptographic security.
        return `none:${node_buffer_1.Buffer.from(payload).toString('base64')}`;
    }
    if (signerType === 'ed25519') {
        // Check if enabled.
        if (process.env.EVIDENCE_SIGNING_ENABLED !== 'true') {
            // If the flag is explicitly strictly required to be true, we block.
            // The prompt says "supports ... behind flag ...=false".
            // We'll assume this means it is disabled by default.
            throw new Error('EVIDENCE_SIGNING_ENABLED is not enabled');
        }
        if (!privateKey) {
            throw new Error('Private key is required for ed25519 signing');
        }
        // Node 18+ Web Crypto API
        // We expect privateKey to be a PEM string for createPrivateKey, or we handle raw keys.
        // For this stub, let's assume `privateKey` is passed as a PEM string.
        try {
            const { createPrivateKey, sign } = await Promise.resolve().then(() => __importStar(require('node:crypto')));
            const key = createPrivateKey(privateKey);
            // ed25519 signing
            const signature = sign(null, node_buffer_1.Buffer.from(payload), key);
            return `ed25519:${signature.toString('base64')}`;
        }
        catch (err) {
            throw new Error(`Failed to sign with ed25519: ${err.message}`);
        }
    }
    throw new Error(`Unsupported signer type: ${signerType}`);
}

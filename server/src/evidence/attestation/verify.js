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
exports.verifyManifest = verifyManifest;
const node_buffer_1 = require("node:buffer");
/**
 * Verifies a manifest signature.
 *
 * @param manifest The manifest object that was supposedly signed.
 * @param signature The signature string returned by signManifest.
 * @param options Verification options.
 * @returns boolean indicating if signature is valid.
 */
async function verifyManifest(manifest, signature, options = {}) {
    const { signerType = 'none', publicKey } = options;
    const payload = JSON.stringify(manifest);
    if (signerType === 'none') {
        // Re-create the expected signature
        const expected = `none:${node_buffer_1.Buffer.from(payload).toString('base64')}`;
        return signature === expected;
    }
    if (signerType === 'ed25519') {
        if (!signature.startsWith('ed25519:')) {
            return false;
        }
        if (!publicKey) {
            throw new Error('Public key is required for ed25519 verification');
        }
        const rawSignature = node_buffer_1.Buffer.from(signature.replace('ed25519:', ''), 'base64');
        try {
            const { createPublicKey, verify } = await Promise.resolve().then(() => __importStar(require('node:crypto')));
            const key = createPublicKey(publicKey);
            const isVerified = verify(null, node_buffer_1.Buffer.from(payload), key, rawSignature);
            return isVerified;
        }
        catch (err) {
            console.warn('Verification error:', err);
            return false;
        }
    }
    throw new Error(`Unsupported signer type: ${signerType}`);
}

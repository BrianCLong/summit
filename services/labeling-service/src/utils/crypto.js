"use strict";
/**
 * Cryptographic utilities for signing audit trail entries
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKeyPair = generateKeyPair;
exports.signData = signData;
exports.verifySignature = verifySignature;
exports.generateHash = generateHash;
exports.generateChecksum = generateChecksum;
exports.computeMerkleRoot = computeMerkleRoot;
exports.buildMerkleTree = buildMerkleTree;
exports.generateLabelId = generateLabelId;
exports.generateReviewId = generateReviewId;
exports.generateQueueId = generateQueueId;
exports.generateAdjudicationId = generateAdjudicationId;
exports.generateAuditId = generateAuditId;
exports.generateExportId = generateExportId;
const crypto_1 = __importDefault(require("crypto"));
const ed25519 = __importStar(require("@noble/ed25519"));
/**
 * Generate a new Ed25519 key pair for signing
 */
async function generateKeyPair() {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = await ed25519.getPublicKeyAsync(privateKey);
    return {
        privateKey: Buffer.from(privateKey).toString('hex'),
        publicKey: Buffer.from(publicKey).toString('hex'),
    };
}
// ============================================================================
// Signing and Verification
// ============================================================================
/**
 * Sign data with Ed25519 private key
 */
async function signData(data, privateKeyHex) {
    const message = JSON.stringify(data, Object.keys(data).sort());
    const messageHash = crypto_1.default.createHash('sha256').update(message).digest();
    const privateKey = Buffer.from(privateKeyHex, 'hex');
    const signature = await ed25519.signAsync(messageHash, privateKey);
    return Buffer.from(signature).toString('hex');
}
/**
 * Verify Ed25519 signature
 */
async function verifySignature(data, signatureHex, publicKeyHex) {
    try {
        const message = JSON.stringify(data, Object.keys(data).sort());
        const messageHash = crypto_1.default.createHash('sha256').update(message).digest();
        const signature = Buffer.from(signatureHex, 'hex');
        const publicKey = Buffer.from(publicKeyHex, 'hex');
        return await ed25519.verifyAsync(signature, messageHash, publicKey);
    }
    catch {
        return false;
    }
}
// ============================================================================
// Hashing
// ============================================================================
/**
 * Generate deterministic hash of data
 */
function generateHash(data) {
    return crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(data, Object.keys(data).sort()))
        .digest('hex');
}
/**
 * Generate checksum with specified algorithm
 */
function generateChecksum(content, algorithm = 'sha256') {
    const hash = crypto_1.default.createHash(algorithm);
    if (Buffer.isBuffer(content)) {
        hash.update(content);
    }
    else if (typeof content === 'string') {
        hash.update(content);
    }
    else {
        hash.update(JSON.stringify(content));
    }
    return hash.digest('hex');
}
// ============================================================================
// Merkle Tree
// ============================================================================
/**
 * Compute Merkle root from array of hashes
 */
function computeMerkleRoot(hashes) {
    if (hashes.length === 0)
        return '';
    if (hashes.length === 1)
        return hashes[0];
    const newLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
            const combined = hashes[i] + hashes[i + 1];
            newLevel.push(generateChecksum(combined));
        }
        else {
            newLevel.push(hashes[i]);
        }
    }
    return computeMerkleRoot(newLevel);
}
/**
 * Build Merkle tree and return all levels
 */
function buildMerkleTree(hashes) {
    if (hashes.length === 0)
        return [[]];
    const tree = [hashes];
    let currentLevel = hashes;
    while (currentLevel.length > 1) {
        const newLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            if (i + 1 < currentLevel.length) {
                const combined = currentLevel[i] + currentLevel[i + 1];
                newLevel.push(generateChecksum(combined));
            }
            else {
                newLevel.push(currentLevel[i]);
            }
        }
        tree.push(newLevel);
        currentLevel = newLevel;
    }
    return tree;
}
// ============================================================================
// ID Generation
// ============================================================================
function generateLabelId() {
    return `label_${crypto_1.default.randomUUID()}`;
}
function generateReviewId() {
    return `review_${crypto_1.default.randomUUID()}`;
}
function generateQueueId() {
    return `queue_${crypto_1.default.randomUUID()}`;
}
function generateAdjudicationId() {
    return `adj_${crypto_1.default.randomUUID()}`;
}
function generateAuditId() {
    return `audit_${crypto_1.default.randomUUID()}`;
}
function generateExportId() {
    return `export_${crypto_1.default.randomUUID()}`;
}

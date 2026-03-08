"use strict";
/**
 * Hash Utility
 *
 * Content hashing and comparison utilities for PVE.
 *
 * @module pve/utils/hash
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashString = hashString;
exports.hashObject = hashObject;
exports.shortHash = shortHash;
exports.contentEquals = contentEquals;
exports.generateContentId = generateContentId;
exports.verifyHash = verifyHash;
const node_crypto_1 = __importDefault(require("node:crypto"));
/**
 * Hash a string using the specified algorithm
 */
function hashString(content, algorithm = 'sha256') {
    return node_crypto_1.default.createHash(algorithm).update(content, 'utf-8').digest('hex');
}
/**
 * Hash an object by serializing it to JSON first
 */
function hashObject(obj, algorithm = 'sha256') {
    const serialized = JSON.stringify(obj, Object.keys(obj).sort());
    return hashString(serialized, algorithm);
}
/**
 * Create a short hash (first N characters)
 */
function shortHash(content, length = 8, algorithm = 'sha256') {
    return hashString(content, algorithm).slice(0, length);
}
/**
 * Compare two content strings for equality using hashes
 */
function contentEquals(a, b) {
    return hashString(a) === hashString(b);
}
/**
 * Generate a unique ID based on content and timestamp
 */
function generateContentId(content) {
    const timestamp = Date.now().toString(36);
    const contentHash = shortHash(content, 8);
    return `${timestamp}-${contentHash}`;
}
/**
 * Verify content against a known hash
 */
function verifyHash(content, expectedHash, algorithm = 'sha256') {
    const actualHash = hashString(content, algorithm);
    return node_crypto_1.default.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

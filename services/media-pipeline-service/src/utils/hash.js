"use strict";
/**
 * Hashing Utilities
 *
 * Provides cryptographic hashing for checksums and integrity verification.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashString = hashString;
exports.hashBuffer = hashBuffer;
exports.hashFile = hashFile;
exports.hashObject = hashObject;
exports.generateId = generateId;
exports.verifyChecksum = verifyChecksum;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
/**
 * Compute SHA256 hash of a string
 */
function hashString(input) {
    return (0, crypto_1.createHash)('sha256').update(input, 'utf8').digest('hex');
}
/**
 * Compute SHA256 hash of a buffer
 */
function hashBuffer(buffer) {
    return (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
}
/**
 * Compute SHA256 hash of a file by streaming
 */
async function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = (0, crypto_1.createHash)('sha256');
        const stream = (0, fs_1.createReadStream)(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}
/**
 * Compute SHA256 hash of JSON object (deterministic)
 */
function hashObject(obj) {
    const normalized = JSON.stringify(obj, Object.keys(obj).sort());
    return hashString(normalized);
}
/**
 * Generate a new UUID v4
 */
function generateId() {
    return (0, crypto_1.randomUUID)();
}
/**
 * Verify checksum matches expected value
 */
function verifyChecksum(data, expectedChecksum) {
    const actualChecksum = typeof data === 'string' ? hashString(data) : hashBuffer(data);
    return actualChecksum === expectedChecksum;
}

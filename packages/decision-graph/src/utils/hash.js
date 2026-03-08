"use strict";
/**
 * Cryptographic hash utilities for content integrity
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHash = generateHash;
exports.generateContentHash = generateContentHash;
exports.verifyHash = verifyHash;
exports.computeMerkleRoot = computeMerkleRoot;
exports.generateMerkleProof = generateMerkleProof;
exports.verifyMerkleProof = verifyMerkleProof;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate SHA-256 hash of content
 */
function generateHash(content) {
    const normalized = typeof content === 'string'
        ? content
        : JSON.stringify(content, Object.keys(content).sort());
    return crypto_1.default
        .createHash('sha256')
        .update(normalized)
        .digest('hex');
}
/**
 * Generate content hash with specified algorithm
 */
function generateContentHash(content, algorithm = 'sha256') {
    const hash = crypto_1.default.createHash(algorithm);
    if (Buffer.isBuffer(content)) {
        hash.update(content);
    }
    else if (typeof content === 'string') {
        hash.update(content, 'utf8');
    }
    else {
        hash.update(JSON.stringify(content, Object.keys(content).sort()));
    }
    return hash.digest('hex');
}
/**
 * Verify content against expected hash
 */
function verifyHash(content, expectedHash, algorithm = 'sha256') {
    const actualHash = typeof content === 'string' || Buffer.isBuffer(content)
        ? generateContentHash(content, algorithm)
        : generateHash(content);
    return actualHash === expectedHash;
}
/**
 * Compute Merkle root from list of hashes
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
            newLevel.push(generateContentHash(combined));
        }
        else {
            // Odd number of hashes, carry the last one up
            newLevel.push(hashes[i]);
        }
    }
    return computeMerkleRoot(newLevel);
}
/**
 * Generate Merkle proof for a hash at given index
 */
function generateMerkleProof(hashes, index) {
    if (index < 0 || index >= hashes.length) {
        throw new Error('Index out of bounds');
    }
    const proof = [];
    const directions = [];
    let currentIndex = index;
    let currentLevel = [...hashes];
    while (currentLevel.length > 1) {
        const isRightNode = currentIndex % 2 === 1;
        const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
        if (siblingIndex < currentLevel.length) {
            proof.push(currentLevel[siblingIndex]);
            directions.push(isRightNode ? 'left' : 'right');
        }
        // Move to next level
        const newLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            if (i + 1 < currentLevel.length) {
                newLevel.push(generateContentHash(currentLevel[i] + currentLevel[i + 1]));
            }
            else {
                newLevel.push(currentLevel[i]);
            }
        }
        currentLevel = newLevel;
        currentIndex = Math.floor(currentIndex / 2);
    }
    return { proof, directions };
}
/**
 * Verify Merkle proof
 */
function verifyMerkleProof(hash, proof, directions, merkleRoot) {
    let currentHash = hash;
    for (let i = 0; i < proof.length; i++) {
        const sibling = proof[i];
        currentHash = directions[i] === 'left'
            ? generateContentHash(sibling + currentHash)
            : generateContentHash(currentHash + sibling);
    }
    return currentHash === merkleRoot;
}

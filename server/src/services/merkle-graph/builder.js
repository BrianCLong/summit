"use strict";
/**
 * MERKLE-GRAPH: Cryptographic Graph Merkle Tree
 *
 * Generates Merkle proofs for graph integrity verification.
 * Every graph mutation produces a Merkle root that can be
 * cryptographically verified by adversarial auditors.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleTreeBuilder = void 0;
const crypto_1 = __importDefault(require("crypto"));
class MerkleTreeBuilder {
    /**
     * Computes Merkle root for a batch of mutations
     */
    computeRoot(entityHashes) {
        if (entityHashes.length === 0) {
            throw new Error('Cannot compute root for empty set');
        }
        if (entityHashes.length === 1) {
            return entityHashes[0];
        }
        // Build tree bottom-up
        let currentLevel = entityHashes;
        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
                const combined = this.hashPair(left, right);
                nextLevel.push(combined);
            }
            currentLevel = nextLevel;
        }
        return currentLevel[0];
    }
    /**
     * Generates Merkle proof for a specific leaf
     */
    generateProof(leafHash, allLeaves) {
        const index = allLeaves.indexOf(leafHash);
        if (index === -1) {
            throw new Error('Leaf not found in tree');
        }
        const siblings = [];
        const path = [];
        let currentLevel = allLeaves;
        let currentIndex = index;
        while (currentLevel.length > 1) {
            const isLeft = currentIndex % 2 === 0;
            const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;
            if (siblingIndex < currentLevel.length) {
                siblings.push(currentLevel[siblingIndex]);
                path.push(isLeft ? 'right' : 'left');
            }
            // Move up to next level
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
                nextLevel.push(this.hashPair(left, right));
            }
            currentLevel = nextLevel;
            currentIndex = Math.floor(currentIndex / 2);
        }
        return {
            leafHash,
            rootHash: currentLevel[0],
            siblings,
            path,
        };
    }
    /**
     * Verifies a Merkle proof
     */
    verifyProof(proof) {
        let currentHash = proof.leafHash;
        for (let i = 0; i < proof.siblings.length; i++) {
            const sibling = proof.siblings[i];
            const isLeft = proof.path[i] === 'left';
            currentHash = isLeft
                ? this.hashPair(sibling, currentHash)
                : this.hashPair(currentHash, sibling);
        }
        return currentHash === proof.rootHash;
    }
    hashPair(left, right) {
        const combined = Buffer.concat([
            Buffer.from(left, 'hex'),
            Buffer.from(right, 'hex'),
        ]);
        return crypto_1.default.createHash('sha256').update(combined).digest('hex');
    }
    /**
     * Hashes an entity to create a leaf
     */
    hashEntity(entity) {
        const canonical = JSON.stringify(entity, Object.keys(entity).sort());
        return crypto_1.default.createHash('sha256').update(canonical).digest('hex');
    }
}
exports.MerkleTreeBuilder = MerkleTreeBuilder;

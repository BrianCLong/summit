"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitmentGenerator = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Commitment Generator for Zero-Knowledge Deconfliction
 * Uses salted hashing to create commitments without revealing raw values
 */
class CommitmentGenerator {
    algorithm;
    constructor(algorithm = 'sha256') {
        this.algorithm = algorithm;
    }
    /**
     * Generate a random salt for a tenant
     */
    generateSalt(tenantId) {
        const saltBytes = crypto_1.default.randomBytes(32);
        const salt = saltBytes.toString('hex');
        return {
            tenantId,
            salt,
            createdAt: new Date().toISOString(),
        };
    }
    /**
     * Create commitment (salted hash) for a single value
     */
    commit(value, salt) {
        const hash = crypto_1.default
            .createHash(this.algorithm)
            .update(salt + value)
            .digest('hex');
        return {
            hash,
            metadata: {
                algorithm: this.algorithm,
            },
        };
    }
    /**
     * Create commitment set for multiple values
     */
    commitSet(values, tenantId, salt) {
        const commitments = values.map((value) => this.commit(value, salt));
        // Build Merkle root for the set
        const merkleRoot = this.buildMerkleRoot(commitments.map((c) => c.hash));
        return {
            tenantId,
            commitments,
            count: commitments.length,
            merkleRoot,
        };
    }
    /**
     * Build Merkle root from hashes
     */
    buildMerkleRoot(hashes) {
        if (hashes.length === 0)
            return '';
        if (hashes.length === 1)
            return hashes[0];
        const tree = [...hashes];
        while (tree.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < tree.length; i += 2) {
                const left = tree[i];
                const right = i + 1 < tree.length ? tree[i + 1] : left;
                const combined = crypto_1.default
                    .createHash(this.algorithm)
                    .update(left + right)
                    .digest('hex');
                nextLevel.push(combined);
            }
            tree.splice(0, tree.length, ...nextLevel);
        }
        return tree[0];
    }
    /**
     * Verify a value against a commitment
     */
    verify(value, salt, commitment) {
        const recomputed = this.commit(value, salt);
        return recomputed.hash === commitment.hash;
    }
}
exports.CommitmentGenerator = CommitmentGenerator;

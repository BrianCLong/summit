"use strict";
/**
 * Data Pool Manager - Core data pool operations with content-addressed storage
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataPoolManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
class DataPoolManager {
    contributions = new Map();
    accessTokens = new Map();
    merkleRoots = new Map();
    async addContribution(contribution) {
        const contributionId = crypto_1.default.randomUUID();
        const contentAddress = this.computeContentAddress(contribution.data);
        const timestamp = new Date();
        const stored = {
            id: contributionId,
            poolId: contribution.poolId,
            contributorId: contribution.contributorId,
            contentHash: contribution.metadata.contentHash,
            metadata: contribution.metadata,
            timestamp,
        };
        const poolContributions = this.contributions.get(contribution.poolId) || [];
        poolContributions.push(stored);
        this.contributions.set(contribution.poolId, poolContributions);
        // Update Merkle root
        const merkleProof = this.updateMerkleTree(contribution.poolId, contentAddress);
        return {
            contributionId,
            merkleProof,
            contentAddress,
            timestamp,
        };
    }
    async requestAccess(request) {
        // Verify requester attestations
        const verified = await this.verifyAttestations(request.attestations || []);
        if (!verified) {
            return { granted: false, reason: 'Attestation verification failed' };
        }
        // Generate access token
        const accessToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        this.accessTokens.set(accessToken, {
            poolId: request.poolId,
            userId: request.requesterId,
            expiresAt,
        });
        return {
            granted: true,
            accessToken,
            expiresAt,
        };
    }
    async verifyAccessToken(poolId, token) {
        const tokenData = this.accessTokens.get(token);
        if (!tokenData) {
            return false;
        }
        if (tokenData.poolId !== poolId) {
            return false;
        }
        if (tokenData.expiresAt < new Date()) {
            this.accessTokens.delete(token);
            return false;
        }
        return true;
    }
    async queryData(poolId, query) {
        const contributions = this.contributions.get(poolId) || [];
        if (!query) {
            return contributions;
        }
        // Simple filtering (in production, use proper query engine)
        return contributions.filter((c) => JSON.stringify(c).includes(query));
    }
    async getPoolStats(poolId) {
        const contributions = this.contributions.get(poolId) || [];
        const contributors = new Set(contributions.map((c) => c.contributorId));
        return {
            totalContributions: contributions.length,
            totalContributors: contributors.size,
            totalSize: contributions.reduce((sum, c) => sum + (c.metadata?.size || 0), 0),
            lastUpdated: contributions.length > 0
                ? contributions[contributions.length - 1].timestamp
                : new Date(),
        };
    }
    getMerkleRoot(poolId) {
        return this.merkleRoots.get(poolId);
    }
    computeContentAddress(data) {
        const hash = crypto_1.default.createHash('sha256');
        hash.update(JSON.stringify(data));
        return hash.digest('hex');
    }
    updateMerkleTree(poolId, newContentAddress) {
        // Simplified Merkle proof generation
        const contributions = this.contributions.get(poolId) || [];
        const hashes = contributions.map((c) => c.contentHash);
        hashes.push(newContentAddress);
        // Compute Merkle root (simplified)
        let currentLevel = hashes;
        const proof = [];
        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = currentLevel[i + 1] || left;
                const hash = crypto_1.default.createHash('sha256');
                hash.update(left + right);
                nextLevel.push(hash.digest('hex'));
                if (i === currentLevel.length - 1 || i === currentLevel.length - 2) {
                    proof.push(i % 2 === 0 ? right : left);
                }
            }
            currentLevel = nextLevel;
        }
        this.merkleRoots.set(poolId, currentLevel[0] || '');
        return proof;
    }
    async verifyAttestations(attestations) {
        // In production, verify against attestation service
        return attestations.length >= 0; // Permissive for now
    }
}
exports.DataPoolManager = DataPoolManager;

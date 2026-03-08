"use strict";
/**
 * Contribution Tracker - Tracks and verifies data contributions for provenance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributionTracker = void 0;
const crypto_1 = __importDefault(require("crypto"));
class ContributionTracker {
    contributions = new Map();
    contributorStats = new Map();
    poolContributions = new Map();
    async track(contribution, result) {
        const tracked = {
            contributionId: result.contributionId,
            poolId: contribution.poolId,
            contributorId: contribution.contributorId,
            contentHash: contribution.metadata.contentHash,
            merkleProof: result.merkleProof,
            timestamp: new Date(),
            verified: await this.verifyContribution(contribution),
            rewardEligible: true,
        };
        this.contributions.set(result.contributionId, tracked);
        // Update pool index
        const poolContribs = this.poolContributions.get(contribution.poolId) || [];
        poolContribs.push(result.contributionId);
        this.poolContributions.set(contribution.poolId, poolContribs);
        // Update contributor stats
        await this.updateContributorStats(contribution);
        return tracked;
    }
    async getContributions(poolId) {
        const contributionIds = this.poolContributions.get(poolId) || [];
        return contributionIds
            .map((id) => this.contributions.get(id))
            .filter((c) => c !== undefined);
    }
    async getContributorStats(contributorId) {
        return this.contributorStats.get(contributorId);
    }
    async verifyContributionProof(contributionId, merkleRoot) {
        const contribution = this.contributions.get(contributionId);
        if (!contribution) {
            return false;
        }
        // Verify Merkle proof against root
        return this.verifyMerkleProof(contribution.contentHash, contribution.merkleProof, merkleRoot);
    }
    async calculateRewards(poolId) {
        const rewards = new Map();
        const contributions = await this.getContributions(poolId);
        for (const contrib of contributions) {
            if (!contrib.rewardEligible) {
                continue;
            }
            const current = rewards.get(contrib.contributorId) || 0;
            // Simple reward calculation based on contribution
            rewards.set(contrib.contributorId, current + 1);
        }
        return rewards;
    }
    async verifyContribution(contribution) {
        // Verify signature
        if (!contribution.signature) {
            return false;
        }
        // Verify content hash matches
        const computedHash = crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(contribution.data))
            .digest('hex');
        return computedHash === contribution.metadata.contentHash;
    }
    async updateContributorStats(contribution) {
        const existing = this.contributorStats.get(contribution.contributorId) || {
            contributorId: contribution.contributorId,
            totalContributions: 0,
            totalSize: 0,
            rewardsEarned: 0,
            reputation: 50, // Start with base reputation
        };
        existing.totalContributions++;
        existing.totalSize += contribution.metadata.size;
        existing.reputation = Math.min(100, existing.reputation + 1);
        this.contributorStats.set(contribution.contributorId, existing);
    }
    verifyMerkleProof(contentHash, proof, root) {
        let currentHash = contentHash;
        for (const sibling of proof) {
            const combined = currentHash < sibling ? currentHash + sibling : sibling + currentHash;
            currentHash = crypto_1.default.createHash('sha256').update(combined).digest('hex');
        }
        return currentHash === root;
    }
}
exports.ContributionTracker = ContributionTracker;

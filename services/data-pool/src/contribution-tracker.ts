/**
 * Contribution Tracker - Tracks and verifies data contributions for provenance
 */

import crypto from 'crypto';
import type { Contribution } from './index.js';

interface TrackedContribution {
  contributionId: string;
  poolId: string;
  contributorId: string;
  contentHash: string;
  merkleProof: string[];
  timestamp: Date;
  verified: boolean;
  rewardEligible: boolean;
}

interface ContributorStats {
  contributorId: string;
  totalContributions: number;
  totalSize: number;
  rewardsEarned: number;
  reputation: number;
}

export class ContributionTracker {
  private contributions: Map<string, TrackedContribution> = new Map();
  private contributorStats: Map<string, ContributorStats> = new Map();
  private poolContributions: Map<string, string[]> = new Map();

  async track(
    contribution: Contribution,
    result: { contributionId: string; merkleProof: string[] },
  ): Promise<TrackedContribution> {
    const tracked: TrackedContribution = {
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

  async getContributions(poolId: string): Promise<TrackedContribution[]> {
    const contributionIds = this.poolContributions.get(poolId) || [];
    return contributionIds
      .map((id) => this.contributions.get(id))
      .filter((c): c is TrackedContribution => c !== undefined);
  }

  async getContributorStats(contributorId: string): Promise<ContributorStats | undefined> {
    return this.contributorStats.get(contributorId);
  }

  async verifyContributionProof(
    contributionId: string,
    merkleRoot: string,
  ): Promise<boolean> {
    const contribution = this.contributions.get(contributionId);
    if (!contribution) return false;

    // Verify Merkle proof against root
    return this.verifyMerkleProof(
      contribution.contentHash,
      contribution.merkleProof,
      merkleRoot,
    );
  }

  async calculateRewards(poolId: string): Promise<Map<string, number>> {
    const rewards = new Map<string, number>();
    const contributions = await this.getContributions(poolId);

    for (const contrib of contributions) {
      if (!contrib.rewardEligible) continue;

      const current = rewards.get(contrib.contributorId) || 0;
      // Simple reward calculation based on contribution
      rewards.set(contrib.contributorId, current + 1);
    }

    return rewards;
  }

  private async verifyContribution(contribution: Contribution): Promise<boolean> {
    // Verify signature
    if (!contribution.signature) return false;

    // Verify content hash matches
    const computedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(contribution.data))
      .digest('hex');

    return computedHash === contribution.metadata.contentHash;
  }

  private async updateContributorStats(contribution: Contribution): Promise<void> {
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

  private verifyMerkleProof(
    contentHash: string,
    proof: string[],
    root: string,
  ): boolean {
    let currentHash = contentHash;

    for (const sibling of proof) {
      const combined = currentHash < sibling ? currentHash + sibling : sibling + currentHash;
      currentHash = crypto.createHash('sha256').update(combined).digest('hex');
    }

    return currentHash === root;
  }
}

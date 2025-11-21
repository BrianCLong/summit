/**
 * Data Pool Manager - Core data pool operations with content-addressed storage
 */

import crypto from 'crypto';
import type { Contribution, AccessRequest } from './index.js';

interface ContributionResult {
  contributionId: string;
  merkleProof: string[];
  contentAddress: string;
  timestamp: Date;
}

interface AccessResult {
  granted: boolean;
  accessToken?: string;
  expiresAt?: Date;
  reason?: string;
}

interface PoolStats {
  totalContributions: number;
  totalContributors: number;
  totalSize: number;
  lastUpdated: Date;
}

interface StoredContribution {
  id: string;
  poolId: string;
  contributorId: string;
  contentHash: string;
  metadata: unknown;
  timestamp: Date;
}

export class DataPoolManager {
  private contributions: Map<string, StoredContribution[]> = new Map();
  private accessTokens: Map<string, { poolId: string; userId: string; expiresAt: Date }> =
    new Map();
  private merkleRoots: Map<string, string> = new Map();

  async addContribution(contribution: Contribution): Promise<ContributionResult> {
    const contributionId = crypto.randomUUID();
    const contentAddress = this.computeContentAddress(contribution.data);
    const timestamp = new Date();

    const stored: StoredContribution = {
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

  async requestAccess(request: AccessRequest): Promise<AccessResult> {
    // Verify requester attestations
    const verified = await this.verifyAttestations(request.attestations || []);
    if (!verified) {
      return { granted: false, reason: 'Attestation verification failed' };
    }

    // Generate access token
    const accessToken = crypto.randomBytes(32).toString('hex');
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

  async verifyAccessToken(poolId: string, token: string): Promise<boolean> {
    const tokenData = this.accessTokens.get(token);
    if (!tokenData) return false;
    if (tokenData.poolId !== poolId) return false;
    if (tokenData.expiresAt < new Date()) {
      this.accessTokens.delete(token);
      return false;
    }
    return true;
  }

  async queryData(poolId: string, query?: string): Promise<StoredContribution[]> {
    const contributions = this.contributions.get(poolId) || [];
    if (!query) return contributions;

    // Simple filtering (in production, use proper query engine)
    return contributions.filter((c) => JSON.stringify(c).includes(query));
  }

  async getPoolStats(poolId: string): Promise<PoolStats> {
    const contributions = this.contributions.get(poolId) || [];
    const contributors = new Set(contributions.map((c) => c.contributorId));

    return {
      totalContributions: contributions.length,
      totalContributors: contributors.size,
      totalSize: contributions.reduce(
        (sum, c) => sum + ((c.metadata as { size?: number })?.size || 0),
        0,
      ),
      lastUpdated:
        contributions.length > 0
          ? contributions[contributions.length - 1].timestamp
          : new Date(),
    };
  }

  getMerkleRoot(poolId: string): string | undefined {
    return this.merkleRoots.get(poolId);
  }

  private computeContentAddress(data: unknown): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  private updateMerkleTree(poolId: string, newContentAddress: string): string[] {
    // Simplified Merkle proof generation
    const contributions = this.contributions.get(poolId) || [];
    const hashes = contributions.map((c) => c.contentHash);
    hashes.push(newContentAddress);

    // Compute Merkle root (simplified)
    let currentLevel = hashes;
    const proof: string[] = [];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        const hash = crypto.createHash('sha256');
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

  private async verifyAttestations(attestations: string[]): Promise<boolean> {
    // In production, verify against attestation service
    return attestations.length >= 0; // Permissive for now
  }
}

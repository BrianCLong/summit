import crypto from 'crypto';
import type { Commitment, CommitmentSet, Salt } from './types.js';

/**
 * Commitment Generator for Zero-Knowledge Deconfliction
 * Uses salted hashing to create commitments without revealing raw values
 */

export class CommitmentGenerator {
  private algorithm: string;

  constructor(algorithm: string = 'sha256') {
    this.algorithm = algorithm;
  }

  /**
   * Generate a random salt for a tenant
   */
  generateSalt(tenantId: string): Salt {
    const saltBytes = crypto.randomBytes(32);
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
  commit(value: string, salt: string): Commitment {
    const hash = crypto
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
  commitSet(values: string[], tenantId: string, salt: string): CommitmentSet {
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
  private buildMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const tree = [...hashes];
    while (tree.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < tree.length; i += 2) {
        const left = tree[i];
        const right = i + 1 < tree.length ? tree[i + 1] : left;
        const combined = crypto
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
  verify(value: string, salt: string, commitment: Commitment): boolean {
    const recomputed = this.commit(value, salt);
    return recomputed.hash === commitment.hash;
  }
}

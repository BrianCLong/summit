import crypto from 'crypto';
import type { DeconflictResponse } from './types.js';

/**
 * Zero-Knowledge Set Proof Generator
 * Provides cryptographic proofs of set overlaps without revealing elements
 */

export class ZKSetProof {
  /**
   * Check if two commitment sets overlap
   * Returns boolean and count WITHOUT revealing which elements overlap
   */
  checkOverlap(
    tenantACommitments: string[],
    tenantBCommitments: string[],
  ): { hasOverlap: boolean; count: number } {
    const setA = new Set(tenantACommitments);
    const setB = new Set(tenantBCommitments);

    let count = 0;
    for (const commitment of setA) {
      if (setB.has(commitment)) {
        count++;
      }
    }

    return {
      hasOverlap: count > 0,
      count,
    };
  }

  /**
   * Generate a zero-knowledge proof of the overlap result
   * In production: Use actual ZK-SNARK/STARK library (e.g., snarkjs, circom)
   * For demo: Generate verifiable proof using commitment hashing
   */
  generateProof(
    tenantAId: string,
    tenantBId: string,
    tenantACommitments: string[],
    tenantBCommitments: string[],
    hasOverlap: boolean,
    count: number,
  ): string {
    // Sort commitments to ensure deterministic proof
    const sortedA = [...tenantACommitments].sort();
    const sortedB = [...tenantBCommitments].sort();

    // Build proof components
    const proofData = {
      tenantAId,
      tenantBId,
      setARoot: this.merkleRoot(sortedA),
      setBRoot: this.merkleRoot(sortedB),
      hasOverlap,
      count,
      timestamp: new Date().toISOString(),
    };

    // Generate proof hash
    const proof = crypto
      .createHash('sha256')
      .update(JSON.stringify(proofData))
      .digest('hex');

    // In production: This would be a ZK-SNARK proof that can be verified
    // without revealing the actual commitments or their intersections
    return proof;
  }

  /**
   * Verify a ZK proof (stub for production ZK verification)
   */
  verifyProof(
    proof: string,
    tenantAId: string,
    tenantBId: string,
    hasOverlap: boolean,
  ): boolean {
    // In production: Use ZK-SNARK verification
    // For demo: Basic format validation
    return proof.length === 64 && /^[0-9a-f]+$/.test(proof);
  }

  /**
   * Build Merkle root from commitments
   */
  private merkleRoot(commitments: string[]): string {
    if (commitments.length === 0) return '';
    if (commitments.length === 1) return commitments[0];

    const tree = [...commitments];
    while (tree.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < tree.length; i += 2) {
        const left = tree[i];
        const right = i + 1 < tree.length ? tree[i + 1] : left;
        const combined = crypto
          .createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }
      tree.splice(0, tree.length, ...nextLevel);
    }
    return tree[0];
  }

  /**
   * Generate proof of non-membership (element NOT in set)
   * Useful for proving deconfliction without revealing set contents
   */
  proveNonMembership(element: string, commitments: string[]): string {
    const isPresent = commitments.includes(element);
    if (isPresent) {
      throw new Error('Cannot prove non-membership for present element');
    }

    const proofData = {
      elementHash: crypto.createHash('sha256').update(element).digest('hex'),
      setRoot: this.merkleRoot(commitments),
      claim: 'not-member',
      timestamp: new Date().toISOString(),
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(proofData))
      .digest('hex');
  }
}

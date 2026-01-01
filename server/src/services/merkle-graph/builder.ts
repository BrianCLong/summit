/**
 * MERKLE-GRAPH: Cryptographic Graph Merkle Tree
 *
 * Generates Merkle proofs for graph integrity verification.
 * Every graph mutation produces a Merkle root that can be
 * cryptographically verified by adversarial auditors.
 */

import crypto from 'crypto';

export interface MerkleNode {
  hash: string;
  leftChild?: string;
  rightChild?: string;
  level: number;
}

export interface MerkleProof {
  leafHash: string;
  rootHash: string;
  siblings: string[];
  path: ('left' | 'right')[];
}

export class MerkleTreeBuilder {
  /**
   * Computes Merkle root for a batch of mutations
   */
  computeRoot(entityHashes: string[]): string {
    if (entityHashes.length === 0) {
      throw new Error('Cannot compute root for empty set');
    }

    if (entityHashes.length === 1) {
      return entityHashes[0];
    }

    // Build tree bottom-up
    let currentLevel = entityHashes;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

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
  generateProof(leafHash: string, allLeaves: string[]): MerkleProof {
    const index = allLeaves.indexOf(leafHash);
    if (index === -1) {
      throw new Error('Leaf not found in tree');
    }

    const siblings: string[] = [];
    const path: ('left' | 'right')[] = [];
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
      const nextLevel: string[] = [];
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
  verifyProof(proof: MerkleProof): boolean {
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

  private hashPair(left: string, right: string): string {
    const combined = Buffer.concat([
      Buffer.from(left, 'hex'),
      Buffer.from(right, 'hex'),
    ]);
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Hashes an entity to create a leaf
   */
  hashEntity(entity: { id: string; properties: Record<string, unknown> }): string {
    const canonical = JSON.stringify(entity, Object.keys(entity).sort());
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}

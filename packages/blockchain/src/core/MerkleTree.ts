/**
 * Merkle Tree implementation for efficient transaction verification
 */

import { createHash } from 'crypto';

export class MerkleTree {
  private leaves: string[];
  private tree: string[][];

  constructor(leaves: string[]) {
    this.leaves = leaves;
    this.tree = this.buildTree();
  }

  /**
   * Build merkle tree from leaves
   */
  private buildTree(): string[][] {
    if (this.leaves.length === 0) {
      return [['']];
    }

    const tree: string[][] = [this.leaves];
    let currentLevel = this.leaves;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const parent = this.hash(left + right);
        nextLevel.push(parent);
      }

      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return tree;
  }

  /**
   * Get merkle root
   */
  getRoot(): string {
    if (this.tree.length === 0 || this.tree[this.tree.length - 1].length === 0) {
      return '';
    }
    return this.tree[this.tree.length - 1][0];
  }

  /**
   * Get merkle proof for leaf at index
   */
  getProof(leafIndex: number): string[] {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error('Invalid leaf index');
    }

    const proof: string[] = [];
    let index = leafIndex;

    for (let level = 0; level < this.tree.length - 1; level++) {
      const currentLevel = this.tree[level];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;

      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }

      index = Math.floor(index / 2);
    }

    return proof;
  }

  /**
   * Verify merkle proof
   */
  verify(proof: string[], leaf: string, root: string): boolean {
    let computedHash = leaf;
    let index = this.leaves.indexOf(leaf);

    if (index === -1) {
      return false;
    }

    for (const proofElement of proof) {
      const isRightNode = index % 2 === 1;

      if (isRightNode) {
        computedHash = this.hash(proofElement + computedHash);
      } else {
        computedHash = this.hash(computedHash + proofElement);
      }

      index = Math.floor(index / 2);
    }

    return computedHash === root;
  }

  /**
   * Hash function
   */
  private hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get all leaves
   */
  getLeaves(): string[] {
    return [...this.leaves];
  }

  /**
   * Get tree depth
   */
  getDepth(): number {
    return this.tree.length;
  }

  /**
   * Verify tree integrity
   */
  verifyTree(): boolean {
    for (let level = 0; level < this.tree.length - 1; level++) {
      const currentLevel = this.tree[level];
      const nextLevel = this.tree[level + 1];

      for (let i = 0; i < nextLevel.length; i++) {
        const leftIndex = i * 2;
        const rightIndex = leftIndex + 1;

        const left = currentLevel[leftIndex];
        const right = rightIndex < currentLevel.length ? currentLevel[rightIndex] : left;
        const expectedParent = this.hash(left + right);

        if (nextLevel[i] !== expectedParent) {
          return false;
        }
      }
    }

    return true;
  }
}

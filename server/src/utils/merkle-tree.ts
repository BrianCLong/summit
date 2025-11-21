/**
 * Merkle Tree Builder for Provenance Export Manifests
 * Provides cryptographic verification of bundle integrity
 */

import crypto from 'crypto';
import { MerkleNode, MerkleTree, MerkleProof } from '../types/provenance-beta.js';

/**
 * Class for building and verifying Merkle Trees.
 */
export class MerkleTreeBuilder {
  private leaves: { hash: string; data: any }[];
  private tree: MerkleNode[];

  /**
   * Creates a new MerkleTreeBuilder instance.
   */
  constructor() {
    this.leaves = [];
    this.tree = [];
  }

  /**
   * Add a leaf to the Merkle tree.
   *
   * @param {any} data - The data associated with the leaf.
   * @param {string} [hash] - The pre-computed hash of the leaf. If omitted, the hash is computed from the data.
   */
  addLeaf(data: any, hash?: string): void {
    const leafHash = hash || this.computeHash(data);
    this.leaves.push({ hash: leafHash, data });
  }

  /**
   * Build the Merkle tree from added leaves.
   * Sorts leaves by hash to ensure a deterministic tree structure.
   *
   * @returns {MerkleTree} The constructed Merkle tree structure.
   * @throws {Error} If no leaves have been added.
   */
  build(): MerkleTree {
    if (this.leaves.length === 0) {
      throw new Error('Cannot build Merkle tree with no leaves');
    }

    // Sort leaves by hash for deterministic tree construction
    const sortedLeaves = [...this.leaves].sort((a, b) =>
      a.hash.localeCompare(b.hash),
    );

    // Create leaf nodes
    let currentLevel: MerkleNode[] = sortedLeaves.map((leaf) => ({
      hash: leaf.hash,
      data: leaf.data,
    }));

    this.tree = [...currentLevel];

    // Build tree bottom-up
    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Duplicate last node if odd

        const parentHash = this.computeHash(left.hash + right.hash);
        const parent: MerkleNode = {
          hash: parentHash,
          left,
          right: right !== left ? right : undefined,
        };

        nextLevel.push(parent);
        this.tree.push(parent);
      }

      currentLevel = nextLevel;
    }

    return {
      root: currentLevel[0].hash,
      nodes: this.tree,
      leaves: sortedLeaves,
    };
  }

  /**
   * Get Merkle proof for a specific leaf hash.
   *
   * @param {string} leafHash - The hash of the leaf to generate a proof for.
   * @returns {string[]} An array of sibling hashes representing the proof path.
   * @throws {Error} If the leaf hash is not found in the tree.
   */
  getProof(leafHash: string): string[] {
    const tree = this.buildIfNeeded();
    const proof: string[] = [];

    // Find the leaf
    const leafIndex = tree.leaves.findIndex((l) => l.hash === leafHash);
    if (leafIndex === -1) {
      throw new Error(`Leaf hash ${leafHash} not found in tree`);
    }

    // Reconstruct the path to root
    let currentHash = leafHash;
    let currentIndex = leafIndex;
    let levelSize = tree.leaves.length;

    while (levelSize > 1) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < levelSize) {
        const siblingHash = this.getSiblingHash(
          currentIndex,
          levelSize,
          tree.leaves,
        );
        if (siblingHash) {
          proof.push(siblingHash);
        }
      }

      currentIndex = Math.floor(currentIndex / 2);
      levelSize = Math.ceil(levelSize / 2);
    }

    return proof;
  }

  /**
   * Verify a Merkle proof.
   *
   * @param {string} leafHash - The hash of the leaf being verified.
   * @param {string[]} proof - The proof path (sibling hashes).
   * @param {string} rootHash - The expected root hash of the Merkle tree.
   * @returns {boolean} True if the proof is valid, false otherwise.
   */
  static verifyProof(
    leafHash: string,
    proof: string[],
    rootHash: string,
  ): boolean {
    let currentHash = leafHash;

    for (const siblingHash of proof) {
      // Combine in sorted order for consistency
      const combined =
        currentHash < siblingHash
          ? currentHash + siblingHash
          : siblingHash + currentHash;

      currentHash = MerkleTreeBuilder.computeHashStatic(combined);
    }

    return currentHash === rootHash;
  }

  /**
   * Build a Merkle tree from a list of items (convenience method).
   *
   * @param {any[]} items - The list of items to include in the tree.
   * @returns {MerkleTree} The constructed Merkle tree.
   */
  static buildFromItems(items: any[]): MerkleTree {
    const builder = new MerkleTreeBuilder();

    for (const item of items) {
      builder.addLeaf(item, item.content_hash || item.hash);
    }

    return builder.build();
  }

  /**
   * Generate a full Merkle proof object.
   *
   * @param {string} leafHash - The hash of the leaf.
   * @param {any[]} items - The list of items in the tree.
   * @returns {MerkleProof} The proof object containing the proof path and root hash.
   */
  static generateProof(
    leafHash: string,
    items: any[],
  ): MerkleProof {
    const builder = new MerkleTreeBuilder();

    for (const item of items) {
      builder.addLeaf(item, item.content_hash || item.hash);
    }

    const tree = builder.build();
    const proof = builder.getProof(leafHash);

    return {
      leaf_hash: leafHash,
      proof,
      root_hash: tree.root,
    };
  }

  /**
   * Verify a full Merkle proof object.
   *
   * @param {MerkleProof} proof - The proof object to verify.
   * @returns {boolean} True if the proof is valid.
   */
  static verifyProofObject(proof: MerkleProof): boolean {
    return MerkleTreeBuilder.verifyProof(
      proof.leaf_hash,
      proof.proof,
      proof.root_hash,
    );
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private buildIfNeeded(): MerkleTree {
    if (this.tree.length === 0) {
      return this.build();
    }

    // Find root (node with no parent)
    const root = this.tree[this.tree.length - 1];

    return {
      root: root.hash,
      nodes: this.tree,
      leaves: this.leaves,
    };
  }

  private getSiblingHash(
    index: number,
    levelSize: number,
    leaves: { hash: string; data: any }[],
  ): string | null {
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;

    if (siblingIndex >= levelSize) {
      return null;
    }

    return leaves[siblingIndex]?.hash || null;
  }

  private computeHash(data: any): string {
    return MerkleTreeBuilder.computeHashStatic(data);
  }

  private static computeHashStatic(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }
}

/**
 * Convenience functions for common Merkle tree operations
 */

/**
 * Build a Merkle tree and return root hash.
 *
 * @param {any[]} items - The items to build the tree from.
 * @returns {string} The root hash of the Merkle tree.
 */
export function buildMerkleRoot(items: any[]): string {
  const tree = MerkleTreeBuilder.buildFromItems(items);
  return tree.root;
}

/**
 * Build a complete Merkle tree with proofs for all items.
 *
 * @param {any[]} items - The items to build the tree from.
 * @returns {object} An object containing the root hash and a map of proofs.
 */
export function buildMerkleTreeWithProofs(items: any[]): {
  root: string;
  proofs: Map<string, string[]>;
} {
  const builder = new MerkleTreeBuilder();

  for (const item of items) {
    const hash = item.content_hash || item.hash;
    builder.addLeaf(item, hash);
  }

  const tree = builder.build();
  const proofs = new Map<string, string[]>();

  for (const leaf of tree.leaves) {
    proofs.set(leaf.hash, builder.getProof(leaf.hash));
  }

  return {
    root: tree.root,
    proofs,
  };
}

/**
 * Verify that a set of items produces the expected Merkle root.
 *
 * @param {any[]} items - The items to verify.
 * @param {string} expectedRoot - The expected root hash.
 * @returns {boolean} True if the calculated root matches the expected root.
 */
export function verifyMerkleRoot(items: any[], expectedRoot: string): boolean {
  try {
    const actualRoot = buildMerkleRoot(items);
    return actualRoot === expectedRoot;
  } catch (error) {
    return false;
  }
}

/**
 * Verify a single item against a Merkle root using its proof.
 *
 * @param {string} itemHash - The hash of the item to verify.
 * @param {string[]} proof - The proof path.
 * @param {string} rootHash - The Merkle root hash.
 * @returns {boolean} True if the item is verified.
 */
export function verifyItem(
  itemHash: string,
  proof: string[],
  rootHash: string,
): boolean {
  return MerkleTreeBuilder.verifyProof(itemHash, proof, rootHash);
}

/**
 * Export Merkle tree structure for storage.
 *
 * @param {MerkleTree} tree - The Merkle tree to export.
 * @returns {object} The exported tree structure with metadata.
 */
export function exportMerkleTree(tree: MerkleTree): {
  root: string;
  leaves: { hash: string }[];
  metadata: {
    leaf_count: number;
    tree_height: number;
    algorithm: string;
  };
} {
  const height = Math.ceil(Math.log2(tree.leaves.length));

  return {
    root: tree.root,
    leaves: tree.leaves.map((l) => ({ hash: l.hash })),
    metadata: {
      leaf_count: tree.leaves.length,
      tree_height: height,
      algorithm: 'SHA-256',
    },
  };
}

/**
 * Import and reconstruct Merkle tree from exported structure.
 *
 * @param {object} exported - The exported tree structure.
 * @param {any[]} originalItems - The original items used to build the tree.
 * @returns {MerkleTree} The reconstructed Merkle tree.
 * @throws {Error} If items are missing or the root hash mismatches.
 */
export function importMerkleTree(
  exported: {
    root: string;
    leaves: { hash: string }[];
  },
  originalItems: any[],
): MerkleTree {
  const builder = new MerkleTreeBuilder();

  // Add leaves in the same order
  for (let i = 0; i < exported.leaves.length; i++) {
    const leaf = exported.leaves[i];
    const item = originalItems.find(
      (item) => (item.content_hash || item.hash) === leaf.hash,
    );

    if (!item) {
      throw new Error(`Item not found for leaf hash: ${leaf.hash}`);
    }

    builder.addLeaf(item, leaf.hash);
  }

  const tree = builder.build();

  // Verify root matches
  if (tree.root !== exported.root) {
    throw new Error(
      `Merkle root mismatch: expected ${exported.root}, got ${tree.root}`,
    );
  }

  return tree;
}

export default MerkleTreeBuilder;

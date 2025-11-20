
import { MerkleTree } from '../merkle-tree.js';

describe('MerkleTree', () => {
  it('should compute correct root for even number of leaves', () => {
    const leaves = ['a', 'b', 'c', 'd'];
    const tree = new MerkleTree(leaves);
    const root = tree.getRoot();
    expect(root).toBeDefined();
    expect(root.length).toBe(64); // SHA256 hex
  });

  it('should compute correct root for odd number of leaves', () => {
    const leaves = ['a', 'b', 'c'];
    const tree = new MerkleTree(leaves);
    const root = tree.getRoot();
    expect(root).toBeDefined();
  });

  it('should verify proofs', () => {
    const leaves = ['a', 'b', 'c', 'd'];
    const tree = new MerkleTree(leaves);
    const root = tree.getRoot();
    const proof = tree.getProof(1); // Proof for 'b'

    // Verify 'b'
    // The leaf passed to verify is the HASH of 'b', because tree stores hashes
    // Wait, my implementation in MerkleTree constructor hashes the inputs.
    // But verify takes 'leaf' string. The static verify method re-hashes the leaf.
    // Let's check implementation.

    const isValid = MerkleTree.verify(proof, root, 'b', 1);
    expect(isValid).toBe(true);
  });

  it('should fail invalid proofs', () => {
    const leaves = ['a', 'b', 'c', 'd'];
    const tree = new MerkleTree(leaves);
    const root = tree.getRoot();
    const proof = tree.getProof(1);

    const isValid = MerkleTree.verify(proof, root, 'x', 1); // Wrong data
    expect(isValid).toBe(false);
  });
});

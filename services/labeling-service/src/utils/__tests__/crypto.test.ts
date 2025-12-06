/**
 * Unit tests for cryptographic utilities
 */

import {
  generateKeyPair,
  signData,
  verifySignature,
  generateHash,
  generateChecksum,
  computeMerkleRoot,
  buildMerkleTree,
} from '../crypto.js';

describe('crypto utilities', () => {
  describe('Key Generation', () => {
    it('should generate a valid key pair', async () => {
      const keyPair = await generateKeyPair();

      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey.length).toBeGreaterThan(0);
      expect(keyPair.publicKey.length).toBeGreaterThan(0);
    });

    it('should generate unique key pairs', async () => {
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();

      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
    });
  });

  describe('Signing and Verification', () => {
    it('should sign and verify data correctly', async () => {
      const keyPair = await generateKeyPair();
      const data = { foo: 'bar', num: 123 };

      const signature = await signData(data, keyPair.privateKey);
      const isValid = await verifySignature(
        data,
        signature,
        keyPair.publicKey,
      );

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
      expect(isValid).toBe(true);
    });

    it('should fail verification with tampered data', async () => {
      const keyPair = await generateKeyPair();
      const data = { foo: 'bar' };
      const tamperedData = { foo: 'baz' };

      const signature = await signData(data, keyPair.privateKey);
      const isValid = await verifySignature(
        tamperedData,
        signature,
        keyPair.publicKey,
      );

      expect(isValid).toBe(false);
    });

    it('should fail verification with wrong public key', async () => {
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();
      const data = { foo: 'bar' };

      const signature = await signData(data, keyPair1.privateKey);
      const isValid = await verifySignature(
        data,
        signature,
        keyPair2.publicKey,
      );

      expect(isValid).toBe(false);
    });

    it('should produce deterministic signatures for same data', async () => {
      const keyPair = await generateKeyPair();
      const data = { b: 2, a: 1 }; // Different order

      const signature1 = await signData(data, keyPair.privateKey);
      const signature2 = await signData({ a: 1, b: 2 }, keyPair.privateKey);

      // Signatures should be the same because data is sorted before signing
      expect(signature1).toBe(signature2);
    });
  });

  describe('Hashing', () => {
    it('should generate consistent hashes', () => {
      const data = { foo: 'bar', num: 123 };

      const hash1 = generateHash(data);
      const hash2 = generateHash(data);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should generate deterministic hashes regardless of key order', () => {
      const data1 = { b: 2, a: 1 };
      const data2 = { a: 1, b: 2 };

      const hash1 = generateHash(data1);
      const hash2 = generateHash(data2);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different data', () => {
      const data1 = { foo: 'bar' };
      const data2 = { foo: 'baz' };

      const hash1 = generateHash(data1);
      const hash2 = generateHash(data2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Checksums', () => {
    it('should generate checksums for different content types', () => {
      const stringContent = 'Hello, world!';
      const bufferContent = Buffer.from('Hello, world!');
      const objectContent = { message: 'Hello, world!' };

      const stringChecksum = generateChecksum(stringContent);
      const bufferChecksum = generateChecksum(bufferContent);
      const objectChecksum = generateChecksum(objectContent);

      expect(stringChecksum).toBeDefined();
      expect(bufferChecksum).toBeDefined();
      expect(objectChecksum).toBeDefined();
      expect(stringChecksum.length).toBe(64);
    });

    it('should use different algorithms', () => {
      const content = 'test';

      const sha256 = generateChecksum(content, 'sha256');
      const sha512 = generateChecksum(content, 'sha512');

      expect(sha256.length).toBe(64);
      expect(sha512.length).toBe(128);
    });
  });

  describe('Merkle Tree', () => {
    it('should compute correct merkle root for single hash', () => {
      const hashes = ['abc123'];

      const root = computeMerkleRoot(hashes);

      expect(root).toBe('abc123');
    });

    it('should compute merkle root for multiple hashes', () => {
      const hashes = ['hash1', 'hash2', 'hash3', 'hash4'];

      const root = computeMerkleRoot(hashes);

      expect(root).toBeDefined();
      expect(root.length).toBeGreaterThan(0);
    });

    it('should return empty string for empty array', () => {
      const root = computeMerkleRoot([]);

      expect(root).toBe('');
    });

    it('should build complete merkle tree', () => {
      const hashes = ['h1', 'h2', 'h3', 'h4'];

      const tree = buildMerkleTree(hashes);

      expect(tree.length).toBeGreaterThan(1);
      expect(tree[0]).toEqual(hashes);
      expect(tree[tree.length - 1].length).toBe(1); // Root
    });

    it('should produce same root for same input', () => {
      const hashes = ['a', 'b', 'c'];

      const root1 = computeMerkleRoot(hashes);
      const root2 = computeMerkleRoot(hashes);

      expect(root1).toBe(root2);
    });
  });
});

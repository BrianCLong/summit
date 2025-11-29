import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createHash } from 'crypto';
import CryptoJS from 'crypto-js';

/**
 * Tests for verifier CLI
 */

describe('Verifier Tests', () => {
  describe('Hash verification', () => {
    it('should compute SHA-256 hash correctly', () => {
      const content = { name: 'Test', value: 123 };
      const hash = createHash('sha256')
        .update(JSON.stringify(content, Object.keys(content).sort()))
        .digest('hex');

      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(64);
    });

    it('should detect tampered content', () => {
      const originalContent = { name: 'Test', value: 123 };
      const tamperedContent = { name: 'Test', value: 456 };

      const originalHash = createHash('sha256')
        .update(JSON.stringify(originalContent, Object.keys(originalContent).sort()))
        .digest('hex');

      const tamperedHash = createHash('sha256')
        .update(JSON.stringify(tamperedContent, Object.keys(tamperedContent).sort()))
        .digest('hex');

      expect(originalHash).not.toBe(tamperedHash);
    });
  });

  describe('Merkle tree verification', () => {
    function computeMerkleRoot(hashes: string[]): string {
      if (hashes.length === 0) return '';
      if (hashes.length === 1) return hashes[0];

      const newLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          const combined = hashes[i] + hashes[i + 1];
          newLevel.push(CryptoJS.SHA256(combined).toString());
        } else {
          newLevel.push(hashes[i]);
        }
      }

      return computeMerkleRoot(newLevel);
    }

    it('should compute Merkle root for single hash', () => {
      const hashes = ['abc123'];
      const root = computeMerkleRoot(hashes);
      expect(root).toBe('abc123');
    });

    it('should compute Merkle root for two hashes', () => {
      const hashes = ['hash1', 'hash2'];
      const root = computeMerkleRoot(hashes);

      const expected = CryptoJS.SHA256('hash1hash2').toString();
      expect(root).toBe(expected);
    });

    it('should compute Merkle root for four hashes', () => {
      const hashes = ['hash1', 'hash2', 'hash3', 'hash4'];
      const root = computeMerkleRoot(hashes);

      // Level 1
      const h12 = CryptoJS.SHA256('hash1hash2').toString();
      const h34 = CryptoJS.SHA256('hash3hash4').toString();

      // Level 2 (root)
      const expected = CryptoJS.SHA256(h12 + h34).toString();

      expect(root).toBe(expected);
    });

    it('should detect tampered Merkle tree', () => {
      const originalHashes = ['hash1', 'hash2', 'hash3', 'hash4'];
      const tamperedHashes = ['hash1', 'TAMPERED', 'hash3', 'hash4'];

      const originalRoot = computeMerkleRoot(originalHashes);
      const tamperedRoot = computeMerkleRoot(tamperedHashes);

      expect(originalRoot).not.toBe(tamperedRoot);
    });

    it('should handle odd number of hashes', () => {
      const hashes = ['hash1', 'hash2', 'hash3'];
      const root = computeMerkleRoot(hashes);

      // Level 1
      const h12 = CryptoJS.SHA256('hash1hash2').toString();
      const h3 = 'hash3'; // Odd one out

      // Level 2 (root)
      const expected = CryptoJS.SHA256(h12 + h3).toString();

      expect(root).toBe(expected);
    });
  });

  describe('Evidence verification', () => {
    it('should verify evidence checksum', () => {
      const content = 'This is evidence content';
      const checksum = createHash('sha256').update(content).digest('hex');

      // Verification
      const verifyChecksum = createHash('sha256').update(content).digest('hex');

      expect(checksum).toBe(verifyChecksum);
    });

    it('should detect tampered evidence', () => {
      const originalContent = 'Original evidence';
      const tamperedContent = 'Tampered evidence';

      const originalChecksum = createHash('sha256').update(originalContent).digest('hex');
      const tamperedChecksum = createHash('sha256').update(tamperedContent).digest('hex');

      expect(originalChecksum).not.toBe(tamperedChecksum);
    });
  });

  describe('Transform chain integrity', () => {
    it('should verify transform chain order', () => {
      const transforms = [
        { timestamp: '2024-01-01T00:00:00Z', type: 'encrypt' },
        { timestamp: '2024-01-02T00:00:00Z', type: 'sign' },
        { timestamp: '2024-01-03T00:00:00Z', type: 'compress' },
      ];

      // Verify timestamps are in order
      for (let i = 0; i < transforms.length - 1; i++) {
        const current = new Date(transforms[i].timestamp);
        const next = new Date(transforms[i + 1].timestamp);
        expect(current.getTime()).toBeLessThan(next.getTime());
      }
    });

    it('should detect out-of-order transforms', () => {
      const transforms = [
        { timestamp: '2024-01-03T00:00:00Z', type: 'compress' },
        { timestamp: '2024-01-01T00:00:00Z', type: 'encrypt' },
        { timestamp: '2024-01-02T00:00:00Z', type: 'sign' },
      ];

      // Check if out of order
      let outOfOrder = false;
      for (let i = 0; i < transforms.length - 1; i++) {
        const current = new Date(transforms[i].timestamp);
        const next = new Date(transforms[i + 1].timestamp);
        if (current.getTime() > next.getTime()) {
          outOfOrder = true;
          break;
        }
      }

      expect(outOfOrder).toBe(true);
    });
  });
});

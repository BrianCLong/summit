/**
 * Unit tests for utility functions (no database required)
 */

import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';

// Replicate utility functions for testing
function generateHash(content: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(content, Object.keys(content).sort()))
    .digest('hex');
}

function generateChecksum(content: any, algorithm: string = 'sha256'): string {
  const hash = crypto.createHash(algorithm);
  if (Buffer.isBuffer(content)) {
    hash.update(content);
  } else if (typeof content === 'string') {
    hash.update(content);
  } else {
    hash.update(JSON.stringify(content));
  }
  return hash.digest('hex');
}

function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  const newLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    if (i + 1 < hashes.length) {
      const combined = hashes[i] + hashes[i + 1];
      newLevel.push(generateChecksum(combined));
    } else {
      newLevel.push(hashes[i]);
    }
  }

  return computeMerkleRoot(newLevel);
}

describe('Hash Generation', () => {
  it('should generate consistent hash for same content', () => {
    const content = { name: 'test', value: 123 };
    const hash1 = generateHash(content);
    const hash2 = generateHash(content);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate different hash for different content', () => {
    const content1 = { name: 'test1' };
    const content2 = { name: 'test2' };

    const hash1 = generateHash(content1);
    const hash2 = generateHash(content2);

    expect(hash1).not.toBe(hash2);
  });

  it('should produce deterministic hash regardless of key order', () => {
    const content1 = { a: 1, b: 2, c: 3 };
    const content2 = { c: 3, a: 1, b: 2 };

    const hash1 = generateHash(content1);
    const hash2 = generateHash(content2);

    expect(hash1).toBe(hash2);
  });
});

describe('Checksum Generation', () => {
  it('should generate checksum for string content', () => {
    const checksum = generateChecksum('test content');
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate checksum for buffer content', () => {
    const buffer = Buffer.from('test content');
    const checksum = generateChecksum(buffer);
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate checksum for object content', () => {
    const obj = { key: 'value' };
    const checksum = generateChecksum(obj);
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce consistent checksums', () => {
    const content = 'same content';
    const checksum1 = generateChecksum(content);
    const checksum2 = generateChecksum(content);

    expect(checksum1).toBe(checksum2);
  });
});

describe('Merkle Tree', () => {
  it('should return empty string for empty array', () => {
    expect(computeMerkleRoot([])).toBe('');
  });

  it('should return single hash for single-element array', () => {
    const hash = 'abc123';
    expect(computeMerkleRoot([hash])).toBe(hash);
  });

  it('should compute root for two hashes', () => {
    const hashes = ['hash1', 'hash2'];
    const root = computeMerkleRoot(hashes);

    expect(root).toMatch(/^[a-f0-9]{64}$/);
    expect(root).not.toBe(hashes[0]);
    expect(root).not.toBe(hashes[1]);
  });

  it('should produce consistent merkle root', () => {
    const hashes = ['a', 'b', 'c', 'd'];
    const root1 = computeMerkleRoot(hashes);
    const root2 = computeMerkleRoot(hashes);

    expect(root1).toBe(root2);
  });

  it('should handle odd number of hashes', () => {
    const hashes = ['a', 'b', 'c'];
    const root = computeMerkleRoot(hashes);

    expect(root).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce different roots for different inputs', () => {
    const hashes1 = ['a', 'b', 'c'];
    const hashes2 = ['a', 'b', 'd'];

    const root1 = computeMerkleRoot(hashes1);
    const root2 = computeMerkleRoot(hashes2);

    expect(root1).not.toBe(root2);
  });
});

describe('ID Generation', () => {
  it('should generate unique claim IDs', () => {
    const generateClaimId = () => `claim_${crypto.randomUUID()}`;

    const id1 = generateClaimId();
    const id2 = generateClaimId();

    expect(id1).toMatch(/^claim_[a-f0-9-]{36}$/);
    expect(id2).toMatch(/^claim_[a-f0-9-]{36}$/);
    expect(id1).not.toBe(id2);
  });

  it('should generate unique evidence IDs', () => {
    const generateEvidenceId = () => `evidence_${crypto.randomUUID()}`;

    const id1 = generateEvidenceId();
    const id2 = generateEvidenceId();

    expect(id1).toMatch(/^evidence_[a-f0-9-]{36}$/);
    expect(id2).toMatch(/^evidence_[a-f0-9-]{36}$/);
    expect(id1).not.toBe(id2);
  });
});

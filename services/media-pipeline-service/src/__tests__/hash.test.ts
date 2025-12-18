/**
 * Hash Utility Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  hashString,
  hashBuffer,
  hashObject,
  generateId,
  verifyChecksum,
} from '../utils/hash.js';

describe('Hash Utilities', () => {
  describe('hashString', () => {
    it('should return consistent hash for same input', () => {
      const input = 'test string';
      const hash1 = hashString(input);
      const hash2 = hashString(input);
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = hashString('string1');
      const hash2 = hashString('string2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return 64 character hex string (SHA256)', () => {
      const hash = hashString('test');
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('hashBuffer', () => {
    it('should hash buffer correctly', () => {
      const buffer = Buffer.from('test buffer');
      const hash = hashBuffer(buffer);
      expect(hash.length).toBe(64);
    });

    it('should return consistent hash for same buffer', () => {
      const buffer = Buffer.from('test');
      const hash1 = hashBuffer(buffer);
      const hash2 = hashBuffer(buffer);
      expect(hash1).toBe(hash2);
    });
  });

  describe('hashObject', () => {
    it('should hash object deterministically', () => {
      const obj = { b: 2, a: 1 };
      const hash1 = hashObject(obj);
      const hash2 = hashObject({ a: 1, b: 2 });
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different objects', () => {
      const hash1 = hashObject({ a: 1 });
      const hash2 = hashObject({ a: 2 });
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateId', () => {
    it('should generate valid UUID', () => {
      const id = generateId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe('verifyChecksum', () => {
    it('should return true for matching checksum', () => {
      const data = 'test data';
      const checksum = hashString(data);
      expect(verifyChecksum(data, checksum)).toBe(true);
    });

    it('should return false for non-matching checksum', () => {
      const data = 'test data';
      const wrongChecksum = hashString('different data');
      expect(verifyChecksum(data, wrongChecksum)).toBe(false);
    });

    it('should work with Buffer', () => {
      const buffer = Buffer.from('test');
      const checksum = hashBuffer(buffer);
      expect(verifyChecksum(buffer, checksum)).toBe(true);
    });
  });
});

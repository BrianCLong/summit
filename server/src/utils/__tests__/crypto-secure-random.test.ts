/**
 * Unit tests for crypto-secure-random utilities
 */

import {
  randomString,
  randomInt,
  randomFloat,
  randomUUID,
  generateToken,
  generateId,
} from '../crypto-secure-random';

describe('Crypto Secure Random Utilities', () => {
  describe('randomString', () => {
    it('should generate a random string of specified length', () => {
      const str = randomString(32);
      expect(str).toHaveLength(32);
      expect(typeof str).toBe('string');
    });

    it('should generate different strings on each call', () => {
      const str1 = randomString(32);
      const str2 = randomString(32);
      expect(str1).not.toBe(str2);
    });

    it('should support different encodings', () => {
      const hexStr = randomString(32, 'hex');
      const base64Str = randomString(32, 'base64');

      expect(hexStr).toMatch(/^[0-9a-f]+$/);
      expect(hexStr).toHaveLength(32);
      expect(base64Str).toHaveLength(32);
    });

    it('should generate unique strings (collision test)', () => {
      const strings = new Set();
      for (let i = 0; i < 1000; i++) {
        strings.add(randomString(32));
      }
      // All strings should be unique
      expect(strings.size).toBe(1000);
    });
  });

  describe('randomInt', () => {
    it('should generate a random integer within range', () => {
      const num = randomInt(0, 100);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThan(100);
      expect(Number.isInteger(num)).toBe(true);
    });

    it('should throw error if min >= max', () => {
      expect(() => randomInt(100, 100)).toThrow('min must be less than max');
      expect(() => randomInt(100, 50)).toThrow('min must be less than max');
    });

    it('should generate different integers on each call', () => {
      const num1 = randomInt(0, 1000000);
      const num2 = randomInt(0, 1000000);
      // Very unlikely to be the same
      expect(num1).not.toBe(num2);
    });

    it('should handle negative ranges', () => {
      const num = randomInt(-100, 0);
      expect(num).toBeGreaterThanOrEqual(-100);
      expect(num).toBeLessThan(0);
    });
  });

  describe('randomFloat', () => {
    it('should generate a random float between 0 and 1', () => {
      const num = randomFloat();
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(1);
    });

    it('should generate different floats on each call', () => {
      const num1 = randomFloat();
      const num2 = randomFloat();
      expect(num1).not.toBe(num2);
    });

    it('should have good distribution', () => {
      const samples = 10000;
      const buckets = [0, 0, 0, 0]; // [0-0.25, 0.25-0.5, 0.5-0.75, 0.75-1]

      for (let i = 0; i < samples; i++) {
        const num = randomFloat();
        const bucket = Math.floor(num * 4);
        buckets[Math.min(bucket, 3)]++;
      }

      // Each bucket should have roughly 25% of samples (allow 20-30%)
      buckets.forEach(count => {
        const percentage = (count / samples) * 100;
        expect(percentage).toBeGreaterThan(20);
        expect(percentage).toBeLessThan(30);
      });
    });
  });

  describe('randomUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = randomUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate different UUIDs on each call', () => {
      const uuid1 = randomUUID();
      const uuid2 = randomUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate unique UUIDs (collision test)', () => {
      const uuids = new Set();
      for (let i = 0; i < 1000; i++) {
        uuids.add(randomUUID());
      }
      expect(uuids.size).toBe(1000);
    });
  });

  describe('generateToken', () => {
    it('should generate a secure token', () => {
      const token = generateToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate tokens of specified byte length', () => {
      const token16 = generateToken(16);
      const token32 = generateToken(32);
      const token64 = generateToken(64);

      // base64url encoding makes the string longer than byte length
      expect(token16.length).toBeGreaterThan(16);
      expect(token32.length).toBeGreaterThan(32);
      expect(token64.length).toBeGreaterThan(64);

      // But 32 should be longer than 16
      expect(token32.length).toBeGreaterThan(token16.length);
    });

    it('should generate unique tokens (collision test)', () => {
      const tokens = new Set();
      for (let i = 0; i < 1000; i++) {
        tokens.add(generateToken(32));
      }
      expect(tokens.size).toBe(1000);
    });

    it('should use base64url encoding (URL-safe)', () => {
      const token = generateToken(32);
      // Should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  describe('generateId', () => {
    it('should generate an ID without prefix', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^\d+_[A-Za-z0-9_-]+$/);
    });

    it('should generate an ID with prefix', () => {
      const id = generateId('user');
      expect(id).toMatch(/^user_\d+_[A-Za-z0-9_-]+$/);
    });

    it('should generate different IDs on each call', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp component', () => {
      const before = Date.now();
      const id = generateId();
      const after = Date.now();

      const timestamp = parseInt(id.split('_')[0], 36);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate unique IDs (collision test)', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId('test'));
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe('Security Properties', () => {
    it('randomString should be unpredictable', () => {
      const str1 = randomString(8);
      const str2 = randomString(8);

      // Hamming distance should be high (most bits different)
      let differences = 0;
      for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
        if (str1[i] !== str2[i]) differences++;
      }

      const similarity = differences / str1.length;
      expect(similarity).toBeGreaterThan(0.5); // At least 50% different
    });

    it('randomInt should not be predictable from previous values', () => {
      const values = Array.from({ length: 100 }, () => randomInt(0, 100));

      // Check that consecutive values are not sequential
      let sequential = 0;
      for (let i = 1; i < values.length; i++) {
        if (Math.abs(values[i] - values[i-1]) === 1) {
          sequential++;
        }
      }

      // Less than 10% should be sequential (would be ~50% if predictable)
      expect(sequential).toBeLessThan(10);
    });
  });
});

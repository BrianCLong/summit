/**
 * Environment Normalization Tests
 */

import {
  normalizeEnvironment,
  getNormalizedEnv,
  ENV_DEFAULTS,
  deterministicSort,
  deterministicStringify,
} from '../src/utils/env.js';

describe('Environment Normalization', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('normalizeEnvironment', () => {
    it('should set TZ to UTC by default', () => {
      normalizeEnvironment();
      expect(process.env.TZ).toBe('UTC');
    });

    it('should set locale to C by default', () => {
      normalizeEnvironment();
      expect(process.env.LC_ALL).toBe('C');
      expect(process.env.LANG).toBe('C');
      expect(process.env.LANGUAGE).toBe('C');
    });

    it('should allow custom timezone', () => {
      normalizeEnvironment({ tz: 'America/New_York' });
      expect(process.env.TZ).toBe('America/New_York');
    });

    it('should allow custom locale', () => {
      normalizeEnvironment({ locale: 'en_US.UTF-8' });
      expect(process.env.LC_ALL).toBe('en_US.UTF-8');
    });
  });

  describe('getNormalizedEnv', () => {
    it('should return current environment info', () => {
      normalizeEnvironment();
      const env = getNormalizedEnv();

      expect(env.tz).toBe('UTC');
      expect(env.locale).toBe('C');
      expect(env.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
      expect(['darwin', 'linux', 'win32']).toContain(env.platform);
      expect(['x64', 'arm64', 'arm']).toContain(env.arch);
    });

    it('should respect override options', () => {
      const env = getNormalizedEnv({ tz: 'Asia/Tokyo', locale: 'ja_JP' });

      expect(env.tz).toBe('Asia/Tokyo');
      expect(env.locale).toBe('ja_JP');
    });
  });

  describe('ENV_DEFAULTS', () => {
    it('should have expected default values', () => {
      expect(ENV_DEFAULTS.TZ).toBe('UTC');
      expect(ENV_DEFAULTS.LOCALE).toBe('C');
      expect(ENV_DEFAULTS.LC_ALL).toBe('C');
      expect(ENV_DEFAULTS.LANG).toBe('C');
    });
  });
});

describe('Deterministic Sorting', () => {
  describe('deterministicSort', () => {
    it('should sort strings alphabetically', () => {
      const input = ['zebra', 'apple', 'mango', 'banana'];
      const sorted = deterministicSort(input);

      expect(sorted).toEqual(['apple', 'banana', 'mango', 'zebra']);
    });

    it('should not mutate original array', () => {
      const input = ['c', 'a', 'b'];
      const original = [...input];
      deterministicSort(input);

      expect(input).toEqual(original);
    });

    it('should handle empty arrays', () => {
      expect(deterministicSort([])).toEqual([]);
    });

    it('should handle arrays with single element', () => {
      expect(deterministicSort(['only'])).toEqual(['only']);
    });

    it('should support custom key function', () => {
      const input = [{ name: 'zebra' }, { name: 'apple' }, { name: 'mango' }];
      const sorted = deterministicSort(input, (item) => item.name);

      expect(sorted.map((i) => i.name)).toEqual(['apple', 'mango', 'zebra']);
    });

    it('should produce identical results on repeated calls', () => {
      const input = ['d', 'b', 'a', 'c', 'e'];
      const result1 = deterministicSort(input);
      const result2 = deterministicSort(input);
      const result3 = deterministicSort(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});

describe('Deterministic JSON Stringify', () => {
  describe('deterministicStringify', () => {
    it('should sort object keys', () => {
      const obj = { zebra: 1, apple: 2, mango: 3 };
      const json = deterministicStringify(obj);

      expect(json).toBe('{"apple":2,"mango":3,"zebra":1}');
    });

    it('should handle nested objects', () => {
      const obj = {
        outer: { z: 1, a: 2 },
        inner: { y: 3, b: 4 },
      };
      const json = deterministicStringify(obj);

      // Parse to verify structure (keys should be sorted)
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed)).toEqual(['inner', 'outer']);
      expect(Object.keys(parsed.outer)).toEqual(['a', 'z']);
    });

    it('should preserve arrays as-is (no sorting)', () => {
      const obj = { items: [3, 1, 2] };
      const json = deterministicStringify(obj);

      expect(json).toBe('{"items":[3,1,2]}');
    });

    it('should support indentation', () => {
      const obj = { b: 1, a: 2 };
      const json = deterministicStringify(obj, 2);

      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should produce identical results on repeated calls', () => {
      const obj = { z: { y: { x: 1 } }, a: { b: { c: 2 } } };
      const result1 = deterministicStringify(obj);
      const result2 = deterministicStringify(obj);
      const result3 = deterministicStringify(obj);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should handle null and undefined', () => {
      expect(deterministicStringify(null)).toBe('null');
      expect(deterministicStringify({ a: null, b: undefined })).toBe('{"a":null}');
    });

    it('should handle primitive values', () => {
      expect(deterministicStringify(42)).toBe('42');
      expect(deterministicStringify('hello')).toBe('"hello"');
      expect(deterministicStringify(true)).toBe('true');
    });
  });
});

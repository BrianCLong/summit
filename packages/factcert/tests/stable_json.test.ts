import { describe, it, expect } from 'vitest';
import { stableStringify } from '../src/lib/stable_json.js';

describe('stableStringify', () => {
  it('should be deterministic', () => {
    const obj1 = { b: 1, a: 2, c: [3, 2, 1] };
    const obj2 = { a: 2, c: [3, 2, 1], b: 1 };
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it('should sort keys', () => {
    const obj = { b: 1, a: 2 };
    expect(stableStringify(obj)).toBe('{"a":2,"b":1}');
  });

  it('should handle nested objects', () => {
    const obj = { b: { d: 4, c: 3 }, a: 1 };
    expect(stableStringify(obj)).toBe('{"a":1,"b":{"c":3,"d":4}}');
  });

  it('should handle primitives', () => {
    expect(stableStringify(123)).toBe('123');
    expect(stableStringify('abc')).toBe('"abc"');
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(true)).toBe('true');
  });
});

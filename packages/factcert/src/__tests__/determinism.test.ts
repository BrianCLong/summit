import { describe, it, expect } from 'vitest';
import { stableJson } from '../lib/stable_json.js';

describe('stableJson', () => {
  it('sorts keys', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };
    expect(stableJson(obj1)).toBe(stableJson(obj2));
  });

  it('handles nested objects', () => {
    const obj1 = { a: { c: 3, d: 4 }, b: 2 };
    const obj2 = { b: 2, a: { d: 4, c: 3 } };
    expect(stableJson(obj1)).toBe(stableJson(obj2));
  });

  it('handles arrays', () => {
    const arr = [1, 2, 3];
    expect(stableJson(arr)).toBe('[1,2,3]');
  });
});

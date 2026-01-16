import { describe, it } from 'node:test';
import assert from 'node:assert';
import { canonicalize, hash } from '../src/canonical.js';

describe('Canonicalization', () => {
  it('should sort keys alphabetically', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    assert.strictEqual(canonicalize(obj1), canonicalize(obj2));
    assert.strictEqual(canonicalize(obj1), '{"a":1,"b":2}');
  });

  it('should handle nested objects', () => {
    const obj1 = { c: { y: 2, x: 1 }, a: 1 };
    const obj2 = { a: 1, c: { x: 1, y: 2 } };
    assert.strictEqual(canonicalize(obj1), canonicalize(obj2));
    assert.strictEqual(canonicalize(obj1), '{"a":1,"c":{"x":1,"y":2}}');
  });

  it('should handle arrays (order matters)', () => {
    const obj1 = { list: [1, 2] };
    const obj2 = { list: [2, 1] };
    assert.notStrictEqual(canonicalize(obj1), canonicalize(obj2));
  });

  it('should handle arrays of objects', () => {
      const obj1 = { list: [{ b: 2, a: 1 }] };
      const obj2 = { list: [{ a: 1, b: 2 }] };
      assert.strictEqual(canonicalize(obj1), canonicalize(obj2));
  });

  it('should normalize Unicode strings (NFC)', () => {
      const nfc = 'ñ';
      const nfd = 'n\u0303'; // n + combining tilde
      assert.notStrictEqual(nfc, nfd); // They are different strings
      assert.strictEqual(canonicalize(nfc), canonicalize(nfd)); // Should be same canonical form
      assert.strictEqual(canonicalize({ key: nfc }), canonicalize({ key: nfd }));
  });
});

describe('Hashing', () => {
  it('should produce consistent hashes', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    assert.strictEqual(hash(obj1), hash(obj2));
  });

  it('should be SHA-256', () => {
      // Echo -n '{"a":1,"b":2}' | sha256sum
      const obj = { a: 1, b: 2 };
      // Expected hash for {"a":1,"b":2}
      const expected = "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777";
      assert.strictEqual(hash(obj), expected);
  });
});

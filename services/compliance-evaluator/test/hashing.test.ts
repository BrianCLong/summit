import { canonicalJson, sha256Hex } from '../src/hashing.js';

test('canonicalJson stable key order', () => {
  const a = canonicalJson({ b: 1, a: 2 });
  const b = canonicalJson({ a: 2, b: 1 });
  expect(a).toBe(b);
});

test('sha256Hex deterministic', () => {
  expect(sha256Hex('x')).toBe(sha256Hex('x'));
});

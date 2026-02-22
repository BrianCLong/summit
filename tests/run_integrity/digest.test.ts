import { computeItemDigest, computeAggregateDigest } from '../../src/run_integrity/digest';
import { canonicalJson } from '../../src/run_integrity/canonicalize';

describe('Run Integrity Digest', () => {
  it('should canonicalize JSON deterministically', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(canonicalJson(obj1)).toBe(canonicalJson(obj2));
  });

  it('should compute consistent digests', () => {
    const id = 'uuid-1';
    const payload = { foo: 'bar' };
    const meta = { created: 123 };
    const d1 = computeItemDigest(id, payload, meta);
    const d2 = computeItemDigest(id, { ...payload }, { ...meta });
    expect(d1).toBe(d2);
  });

  it('should compute order-independent aggregate', () => {
    const list1 = ['abc', 'def'];
    const list2 = ['def', 'abc'];
    expect(computeAggregateDigest(list1)).toBe(computeAggregateDigest(list2));
  });
});

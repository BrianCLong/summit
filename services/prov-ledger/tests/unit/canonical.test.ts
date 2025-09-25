import { canonicalize, canonicalJson, hashCanonical } from '../../src/domain/canonical';

describe('canonical', () => {
  it('sorts object keys deterministically', () => {
    const input = { b: 2, a: 1, c: { z: 9, y: 8 } };
    const result = canonicalize(input);
    expect(result).toEqual({ a: 1, b: 2, c: { y: 8, z: 9 } });
  });

  it('produces stable hashes for equivalent structures', () => {
    const a = { foo: ['bar', 'baz'], value: 1 };
    const b = { value: 1, foo: ['bar', 'baz'] };
    expect(hashCanonical(a)).toEqual(hashCanonical(b));
    expect(canonicalJson(a)).toEqual(canonicalJson(b));
  });

  it('normalizes nullish and undefined values consistently', () => {
    expect(canonicalize(null)).toBeNull();
    expect(canonicalize(undefined)).toBeNull();
    expect(canonicalize([undefined, null])).toEqual([null, null]);
  });

  it('canonicalizes nested arrays, dates, and filters undefined object properties', () => {
    const timestamp = new Date('2023-01-01T00:00:00.000Z');
    const input = {
      timestamp,
      nested: {
        z: undefined,
        a: [3, undefined, 1]
      }
    };
    expect(canonicalize(input)).toEqual({
      nested: { a: [3, null, 1] },
      timestamp: '2023-01-01T00:00:00.000Z'
    });
  });

  it('stringifies non-finite numbers and rounds finite numbers', () => {
    expect(canonicalize(Number.POSITIVE_INFINITY)).toBe('Infinity');
    expect(canonicalize(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
    expect(canonicalize(Number.NaN)).toBe('NaN');
    expect(canonicalize(1 / 3)).toBeCloseTo(0.333333333333, 12);
  });
});

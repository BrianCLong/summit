import { canonicalize } from '../src/canonicalize';

describe('canonicalize', () => {
  it('should handle null and primitives', () => {
    expect(canonicalize(null)).toBe('null');
    expect(canonicalize(123)).toBe('123');
    expect(canonicalize('abc')).toBe('"abc"');
    expect(canonicalize(true)).toBe('true');
  });

  it('should handle arrays', () => {
    expect(canonicalize([3, 2, 1])).toBe('[3,2,1]');
    expect(canonicalize([{ b: 2, a: 1 }, { d: 4, c: 3 }])).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
  });

  it('should sort object keys', () => {
    const obj = { b: 2, a: 1, c: { d: 4, e: 3 } };
    const expected = '{"a":1,"b":2,"c":{"d":4,"e":3}}';
    expect(canonicalize(obj)).toBe(expected);
  });
});

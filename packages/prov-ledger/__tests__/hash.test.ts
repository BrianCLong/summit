import { hashObject, hashString } from '../src/hash';

describe('hash', () => {
  it('should hash an object deterministically', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(hashObject(obj1)).toBe(hashObject(obj2));
  });

  it('should hash a string consistently', () => {
    const str = 'hello world';
    const expectedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
    expect(hashString(str)).toBe(expectedHash);
  });
});

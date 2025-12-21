import { overlaps } from '../../src/overlap';

describe('overlap', () => {
  it('detects overlap', () => {
    expect(overlaps(['a', 'b'], ['c', 'b'])).toBe(true);
    expect(overlaps(['a'], ['b'])).toBe(false);
  });
});

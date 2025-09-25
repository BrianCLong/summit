import { hashCanonical } from '../../src/domain/canonical';
import { buildMerkleRoot } from '../../src/domain/merkle';

describe('merkle tree', () => {
  it('returns hash of empty string when there are no leaves', () => {
    expect(buildMerkleRoot([])).toBe(hashCanonical(''));
  });

  it('returns the leaf when only one element provided', () => {
    expect(buildMerkleRoot(['single-leaf'])).toBe('single-leaf');
  });

  it('duplicates the last leaf when the level has an odd length', () => {
    const leaves = ['leaf-a', 'leaf-b', 'leaf-c'];

    const pair = (left: string, right: string) => hashCanonical([left, right].sort());
    const firstLevel = [pair('leaf-a', 'leaf-b'), pair('leaf-c', 'leaf-c')].sort();
    const expectedRoot = pair(firstLevel[0], firstLevel[1]);

    expect(buildMerkleRoot(leaves)).toBe(expectedRoot);
  });

  it('produces identical roots regardless of leaf ordering', () => {
    const setA = ['gamma', 'alpha', 'beta'];
    const setB = [...setA].reverse();

    expect(buildMerkleRoot(setA)).toBe(buildMerkleRoot(setB));
  });
});

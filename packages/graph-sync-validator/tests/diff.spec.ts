import { describe, expect, it } from 'vitest';
import { compareNormalized } from '../src/diff/compare.js';

const baseNode = {
  type: 'User',
  id: '1',
  labels: ['User'],
  props: { email: 'a@example.com' },
  propsHash: 'x',
};

describe('compareNormalized', () => {
  it('detects mismatched node propsHash', () => {
    const pgNodes = [baseNode];
    const neoNodes = [{ ...baseNode, props: { email: 'b@example.com' }, propsHash: 'y' }];
    const drift = compareNormalized(pgNodes, neoNodes, [], []);

    expect(drift.mismatchedNodes.length).toBe(1);
    expect(drift.parity).toBeLessThan(1);
  });
});

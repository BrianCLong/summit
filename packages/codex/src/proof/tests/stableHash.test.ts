import { describe, it, expect } from 'vitest';
import { stableHash } from '../stableHash.js';

describe('stableHash', () => {
  it('should produce the same hash for same buffers', () => {
    const b1 = Buffer.from('hello');
    const b2 = Buffer.from('world');

    const h1 = stableHash([b1, b2]);
    const h2 = stableHash([b1, b2]);

    expect(h1).toBe(h2);
  });

  it('should be order sensitive', () => {
    const b1 = Buffer.from('hello');
    const b2 = Buffer.from('world');

    const h1 = stableHash([b1, b2]);
    const h2 = stableHash([b2, b1]);

    expect(h1).not.toBe(h2);
  });
});

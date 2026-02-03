import { describe, it, expect } from '@jest/globals';

describe('Test environment parity', () => {
  it('standardizes timezone and locale for deterministic tests', () => {
    expect(process.env.TZ).toBe('UTC');
    expect(process.env.LANG).toBe('en_US.UTF-8');
    expect(process.env.LC_ALL).toBe('en_US.UTF-8');
    expect(process.env.NODE_ENV).toBe('test');
  });
});

import { describe, it, expect } from '@jest/globals';

describe('Infrastructure Check', () => {
  it('should verify node environment', () => {
    expect(process.version).toBeDefined();
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('should have math working correctly', () => {
    expect(1 + 1).toBe(2);
  });
});

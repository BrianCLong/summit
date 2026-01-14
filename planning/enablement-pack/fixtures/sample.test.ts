import { describe, it, expect } from 'vitest'; // or jest

// Sample Typescript Test Fixture
describe('Smoke Test (TS)', () => {
  it('should add numbers correctly', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(1, 2)).toBe(3);
  });

  it('should handle async operations', async () => {
    const asyncSum = async (a: number, b: number) => Promise.resolve(a + b);
    expect(await asyncSum(2, 3)).toBe(5);
  });
});

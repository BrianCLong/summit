import { computeScore } from '../../src/services/score';

describe('computeScore', () => {
  it('should compute the weighted mean correctly', () => {
    const values = [
      { v: 10, w: 1 },
      { v: 20, w: 2 },
      { v: 30, w: 1 },
    ];
    expect(computeScore(values)).toBe(20);
  });

  it('should handle cases with no weight (default to 1)', () => {
    const values = [{ v: 10 }, { v: 20 }];
    expect(computeScore(values)).toBe(15);
  });

  it('should return 0 if no values are provided', () => {
    const values: Array<{ v: number; w?: number }> = [];
    expect(computeScore(values)).toBe(0);
  });

  it('should handle zero weights', () => {
    const values = [
      { v: 10, w: 0 },
      { v: 20, w: 0 },
    ];
    expect(computeScore(values)).toBe(0);
  });

  it('should handle mixed weights and no weights', () => {
    const values = [{ v: 10, w: 0.5 }, { v: 20 }, { v: 30, w: 1.5 }];
    // (10*0.5 + 20*1 + 30*1.5) / (0.5 + 1 + 1.5) = (5 + 20 + 45) / 3 = 70 / 3 = 23.3333...
    expect(computeScore(values)).toBe(23.3333);
  });
});

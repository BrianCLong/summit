import { hashToBucket, isInRollout, selectVariant } from '../utils/hash.js';

describe('hashToBucket', () => {
  it('should return a value between 0 and 1', () => {
    const result = hashToBucket('test-key');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should return consistent results for the same key', () => {
    const result1 = hashToBucket('consistent-key');
    const result2 = hashToBucket('consistent-key');
    expect(result1).toBe(result2);
  });

  it('should return different results for different keys', () => {
    const result1 = hashToBucket('key-1');
    const result2 = hashToBucket('key-2');
    expect(result1).not.toBe(result2);
  });

  it('should return different results for different seeds', () => {
    const result1 = hashToBucket('test-key', 0);
    const result2 = hashToBucket('test-key', 1);
    expect(result1).not.toBe(result2);
  });

  it('should produce uniform distribution', () => {
    const buckets = [0, 0, 0, 0];
    const samples = 10000;

    for (let i = 0; i < samples; i++) {
      const bucket = hashToBucket(`user-${i}`);
      const index = Math.floor(bucket * 4);
      buckets[Math.min(index, 3)]++;
    }

    // Each bucket should have roughly 25% of samples (within 5% tolerance)
    for (const count of buckets) {
      expect(count / samples).toBeGreaterThan(0.2);
      expect(count / samples).toBeLessThan(0.3);
    }
  });
});

describe('isInRollout', () => {
  it('should return false for 0% rollout', () => {
    expect(isInRollout('any-key', 0)).toBe(false);
  });

  it('should return true for 100% rollout', () => {
    expect(isInRollout('any-key', 100)).toBe(true);
  });

  it('should return consistent results for the same key', () => {
    const result1 = isInRollout('user-123', 50);
    const result2 = isInRollout('user-123', 50);
    expect(result1).toBe(result2);
  });

  it('should respect rollout percentage approximately', () => {
    const samples = 10000;
    let inRollout = 0;

    for (let i = 0; i < samples; i++) {
      if (isInRollout(`user-${i}`, 30)) {
        inRollout++;
      }
    }

    const percentage = inRollout / samples;
    expect(percentage).toBeGreaterThan(0.25);
    expect(percentage).toBeLessThan(0.35);
  });

  it('should use different seed for different results', () => {
    // Find a key where the two seeds give different results
    let foundDifference = false;
    for (let i = 0; i < 100; i++) {
      const key = `test-${i}`;
      const result1 = isInRollout(key, 50, 0);
      const result2 = isInRollout(key, 50, 1);
      if (result1 !== result2) {
        foundDifference = true;
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });
});

describe('selectVariant', () => {
  const variants = [
    { name: 'control', weight: 50 },
    { name: 'treatment', weight: 50 },
  ];

  it('should return -1 for empty variants', () => {
    expect(selectVariant('key', [])).toBe(-1);
  });

  it('should return consistent results for the same key', () => {
    const result1 = selectVariant('user-123', variants);
    const result2 = selectVariant('user-123', variants);
    expect(result1).toBe(result2);
  });

  it('should return valid variant index', () => {
    const result = selectVariant('test-key', variants);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(variants.length);
  });

  it('should respect variant weights approximately', () => {
    const threeWayVariants = [
      { name: 'a', weight: 20 },
      { name: 'b', weight: 30 },
      { name: 'c', weight: 50 },
    ];

    const counts = [0, 0, 0];
    const samples = 10000;

    for (let i = 0; i < samples; i++) {
      const index = selectVariant(`user-${i}`, threeWayVariants);
      counts[index]++;
    }

    // Check distributions are within tolerance
    expect(counts[0] / samples).toBeGreaterThan(0.15);
    expect(counts[0] / samples).toBeLessThan(0.25);

    expect(counts[1] / samples).toBeGreaterThan(0.25);
    expect(counts[1] / samples).toBeLessThan(0.35);

    expect(counts[2] / samples).toBeGreaterThan(0.45);
    expect(counts[2] / samples).toBeLessThan(0.55);
  });

  it('should handle single variant', () => {
    const single = [{ name: 'only', weight: 100 }];
    expect(selectVariant('any-key', single)).toBe(0);
  });

  it('should handle unequal weights', () => {
    const unequal = [
      { name: 'rare', weight: 5 },
      { name: 'common', weight: 95 },
    ];

    const counts = [0, 0];
    const samples = 10000;

    for (let i = 0; i < samples; i++) {
      const index = selectVariant(`user-${i}`, unequal);
      counts[index]++;
    }

    expect(counts[0] / samples).toBeGreaterThan(0.02);
    expect(counts[0] / samples).toBeLessThan(0.08);

    expect(counts[1] / samples).toBeGreaterThan(0.92);
    expect(counts[1] / samples).toBeLessThan(0.98);
  });
});

/**
 * Unit tests for DifferentialPrivacy
 */

import { DifferentialPrivacy, PrivacyBudgetManager } from '../differential-privacy/DifferentialPrivacy';

describe('DifferentialPrivacy', () => {
  describe('constructor', () => {
    it('should create a DP instance with Laplace mechanism', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'laplace'
      });
      expect(dp).toBeDefined();
    });

    it('should create a DP instance with Gaussian mechanism', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        delta: 1e-5,
        mechanism: 'gaussian'
      });
      expect(dp).toBeDefined();
    });
  });

  describe('addLaplaceNoise', () => {
    it('should add noise to a value', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      const original = 100;
      const noisy = dp.addLaplaceNoise(original, 1);

      // Noise should modify the value
      expect(noisy).not.toBe(original);
      expect(typeof noisy).toBe('number');
      expect(isNaN(noisy)).toBe(false);
    });

    it('should produce different outputs for same input', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      const original = 100;
      const results = new Set<number>();

      for (let i = 0; i < 100; i++) {
        results.add(dp.addLaplaceNoise(original, 1));
      }

      // Should have many unique values (randomness)
      expect(results.size).toBeGreaterThan(50);
    });

    it('should produce larger noise with larger sensitivity', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      const original = 100;

      // Run multiple times to get average absolute difference
      let smallSensSum = 0;
      let largeSensSum = 0;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        smallSensSum += Math.abs(dp.addLaplaceNoise(original, 1) - original);
        largeSensSum += Math.abs(dp.addLaplaceNoise(original, 10) - original);
      }

      const smallSensAvg = smallSensSum / iterations;
      const largeSensAvg = largeSensSum / iterations;

      expect(largeSensAvg).toBeGreaterThan(smallSensAvg);
    });
  });

  describe('addGaussianNoise', () => {
    it('should add Gaussian noise when delta is specified', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        delta: 1e-5,
        mechanism: 'gaussian'
      });

      const original = 100;
      const noisy = dp.addGaussianNoise(original, 1);

      expect(typeof noisy).toBe('number');
      expect(isNaN(noisy)).toBe(false);
    });

    it('should throw error when delta is not specified', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'gaussian'
      });

      expect(() => dp.addGaussianNoise(100, 1)).toThrow();
    });
  });

  describe('exponentialMechanism', () => {
    it('should select from options', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'exponential'
      });

      const options = ['A', 'B', 'C', 'D'];
      const scoringFn = (opt: string) => opt === 'A' ? 10 : 1;

      const selected = dp.exponentialMechanism(options, scoringFn, 1);

      expect(options).toContain(selected);
    });

    it('should favor higher-scoring options', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 10.0, // High epsilon for more deterministic behavior
        mechanism: 'exponential'
      });

      const options = ['A', 'B', 'C'];
      const scoringFn = (opt: string) => opt === 'A' ? 100 : 1;

      let countA = 0;
      for (let i = 0; i < 100; i++) {
        if (dp.exponentialMechanism(options, scoringFn, 1) === 'A') {
          countA++;
        }
      }

      // A should be selected most of the time
      expect(countA).toBeGreaterThan(50);
    });
  });

  describe('privatizeQuery', () => {
    it('should privatize a query result', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      const result = dp.privatizeQuery(100, 1);
      expect(typeof result).toBe('number');
    });

    it('should update budget after query', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      const budgetBefore = dp.getBudgetStatus();
      dp.privatizeQuery(100, 1);
      const budgetAfter = dp.getBudgetStatus();

      expect(budgetAfter.spent).toBeGreaterThan(budgetBefore.spent);
      expect(budgetAfter.remaining).toBeLessThan(budgetBefore.remaining);
    });
  });

  describe('privatizeHistogram', () => {
    it('should privatize a histogram', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      const histogram = { A: 10, B: 20, C: 30 };
      const privatized = dp.privatizeHistogram(histogram);

      expect(privatized).toHaveProperty('A');
      expect(privatized).toHaveProperty('B');
      expect(privatized).toHaveProperty('C');
    });

    it('should ensure non-negative counts', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      const histogram = { A: 1, B: 1, C: 1 };
      const privatized = dp.privatizeHistogram(histogram);

      Object.values(privatized).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getBudgetStatus', () => {
    it('should return initial budget correctly', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 5.0,
        mechanism: 'laplace'
      });

      const budget = dp.getBudgetStatus();

      expect(budget.epsilon).toBe(5.0);
      expect(budget.spent).toBe(0);
      expect(budget.remaining).toBe(5.0);
      expect(budget.allocations).toHaveLength(0);
    });
  });

  describe('resetBudget', () => {
    it('should reset budget to initial state', () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      dp.privatizeQuery(100, 1);
      dp.resetBudget();

      const budget = dp.getBudgetStatus();
      expect(budget.spent).toBe(0);
      expect(budget.remaining).toBe(1.0);
    });
  });
});

describe('PrivacyBudgetManager', () => {
  it('should allocate budget correctly', () => {
    const manager = new PrivacyBudgetManager(10.0);

    const dp = manager.allocate('operation1', 1.0, 0);

    expect(dp).toBeDefined();
    expect(manager.getRemaining()).toBe(10.0); // Not yet spent
  });

  it('should track total spent', () => {
    const manager = new PrivacyBudgetManager(10.0);

    const dp1 = manager.allocate('op1', 1.0, 0);
    const dp2 = manager.allocate('op2', 2.0, 0);

    dp1.privatizeQuery(100, 1);
    dp2.privatizeQuery(100, 1);

    expect(manager.getTotalSpent()).toBe(3.0);
  });

  it('should check if allocation is possible', () => {
    const manager = new PrivacyBudgetManager(5.0);

    expect(manager.canAllocate(3.0)).toBe(true);
    expect(manager.canAllocate(10.0)).toBe(false);
  });
});

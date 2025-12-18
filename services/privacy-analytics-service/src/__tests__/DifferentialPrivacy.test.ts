/**
 * Differential Privacy Module Tests
 *
 * Tests for the differential privacy mechanisms including:
 * - Laplace mechanism
 * - Gaussian mechanism
 * - Budget tracking
 * - Noise application
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DifferentialPrivacy } from '../privacy/DifferentialPrivacy.js';
import type {
  AggregateResultRow,
  AggregateQuery,
  DifferentialPrivacyConfig,
  PrivacyBudgetState,
} from '../types/index.js';
import { AggregationType, DataSource } from '../types/index.js';

describe('DifferentialPrivacy', () => {
  let dp: DifferentialPrivacy;

  beforeEach(() => {
    dp = new DifferentialPrivacy({
      countSensitivity: 1,
      sumSensitivity: 100,
      avgSensitivity: 10,
      fieldSensitivities: {},
    });
  });

  describe('Laplace Mechanism', () => {
    it('should generate noise with correct distribution properties', () => {
      const scale = 1.0;
      const samples: number[] = [];

      // Generate many samples
      for (let i = 0; i < 10000; i++) {
        samples.push(dp.laplaceMechanism(scale));
      }

      // Check mean is close to 0
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      expect(Math.abs(mean)).toBeLessThan(0.1);

      // Check variance is close to 2*scale^2 for Laplace
      const variance = samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples.length;
      const expectedVariance = 2 * scale * scale;
      expect(Math.abs(variance - expectedVariance)).toBeLessThan(0.2);
    });

    it('should scale noise with epsilon', () => {
      const highEpsNoise: number[] = [];
      const lowEpsNoise: number[] = [];

      for (let i = 0; i < 1000; i++) {
        highEpsNoise.push(Math.abs(dp.laplaceMechanism(1 / 10))); // high epsilon = low noise
        lowEpsNoise.push(Math.abs(dp.laplaceMechanism(1 / 0.1))); // low epsilon = high noise
      }

      const avgHighEps = highEpsNoise.reduce((a, b) => a + b, 0) / highEpsNoise.length;
      const avgLowEps = lowEpsNoise.reduce((a, b) => a + b, 0) / lowEpsNoise.length;

      // Low epsilon should produce larger noise
      expect(avgLowEps).toBeGreaterThan(avgHighEps * 5);
    });
  });

  describe('Gaussian Mechanism', () => {
    it('should generate noise with approximately normal distribution', () => {
      const scale = 1.0;
      const delta = 1e-5;
      const samples: number[] = [];

      for (let i = 0; i < 10000; i++) {
        samples.push(dp.gaussianMechanism(scale, delta));
      }

      // Check mean is close to 0
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      expect(Math.abs(mean)).toBeLessThan(0.1);

      // Most samples should be within 3 standard deviations
      const sigma = scale * Math.sqrt(2 * Math.log(1.25 / delta));
      const withinThreeSigma = samples.filter(x => Math.abs(x) < 3 * sigma).length;
      expect(withinThreeSigma / samples.length).toBeGreaterThan(0.99);
    });
  });

  describe('Noise Application', () => {
    it('should add noise to all measures in result rows', () => {
      const rows: AggregateResultRow[] = [
        {
          dimensions: { type: 'person' },
          measures: { count: 100, sum_value: 5000 },
          privacyAffected: false,
        },
        {
          dimensions: { type: 'organization' },
          measures: { count: 50, sum_value: 2500 },
          privacyAffected: false,
        },
      ];

      const config: DifferentialPrivacyConfig = {
        epsilon: 1.0,
        mechanism: 'laplace',
        budgetTracking: false,
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
          { field: 'value', aggregation: AggregationType.SUM, alias: 'sum_value' },
        ],
      };

      const result = dp.applyDP(rows, config, query);

      expect(result.budgetExceeded).toBe(false);
      expect(result.rows).toHaveLength(2);

      // Values should be different (with high probability)
      expect(result.rows[0].measures.count).not.toBe(100);
      expect(result.rows[0].privacyAffected).toBe(true);

      // Values should be non-negative (counts can't be negative)
      expect(result.rows[0].measures.count).toBeGreaterThanOrEqual(0);
      expect(result.rows[1].measures.count).toBeGreaterThanOrEqual(0);
    });

    it('should preserve null values', () => {
      const rows: AggregateResultRow[] = [
        {
          dimensions: { type: 'person' },
          measures: { count: 100, avg_value: null },
          privacyAffected: false,
        },
      ];

      const config: DifferentialPrivacyConfig = {
        epsilon: 1.0,
        mechanism: 'laplace',
        budgetTracking: false,
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
          { field: 'value', aggregation: AggregationType.AVG, alias: 'avg_value' },
        ],
      };

      const result = dp.applyDP(rows, config, query);

      expect(result.rows[0].measures.avg_value).toBeNull();
    });
  });

  describe('Budget Tracking', () => {
    it('should initialize budget state correctly', () => {
      const state = dp.getBudgetState('tenant-1', 'user-1', {
        epsilon: 2.0,
        mechanism: 'laplace',
        budgetTracking: true,
        budgetRenewalPeriod: 'day',
      });

      expect(state.tenantId).toBe('tenant-1');
      expect(state.userId).toBe('user-1');
      expect(state.totalBudget).toBe(2.0);
      expect(state.spentBudget).toBe(0);
      expect(state.queryCount).toBe(0);
    });

    it('should consume budget correctly', () => {
      // Initialize budget
      dp.getBudgetState('tenant-2', 'user-2', {
        epsilon: 5.0,
        mechanism: 'laplace',
        budgetTracking: true,
        budgetRenewalPeriod: 'day',
      });

      // Consume some budget
      const updated = dp.consumeBudget('tenant-2', 1.5, 'user-2');

      expect(updated.spentBudget).toBe(1.5);
      expect(updated.queryCount).toBe(1);
    });

    it('should reject query when budget exceeded', () => {
      // Initialize budget
      const initialState = dp.getBudgetState('tenant-3', undefined, {
        epsilon: 1.0,
        mechanism: 'laplace',
        budgetTracking: true,
        budgetRenewalPeriod: 'day',
      });

      // Consume most of the budget
      dp.consumeBudget('tenant-3', 0.9);

      const rows: AggregateResultRow[] = [
        {
          dimensions: { type: 'person' },
          measures: { count: 100 },
          privacyAffected: false,
        },
      ];

      const config: DifferentialPrivacyConfig = {
        epsilon: 0.5, // This would require more budget than available
        mechanism: 'laplace',
        budgetTracking: true,
      };

      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
      };

      // Get updated budget state
      const budgetState: PrivacyBudgetState = {
        ...initialState,
        spentBudget: 0.9,
        queryCount: 1,
      };

      const result = dp.applyDP(rows, config, query, budgetState);

      expect(result.budgetExceeded).toBe(true);
      expect(result.rows).toHaveLength(0);
      expect(result.warnings.some(w => w.code === 'BUDGET_EXCEEDED')).toBe(true);
    });

    it('should reset budget correctly', () => {
      dp.getBudgetState('tenant-4', undefined, {
        epsilon: 1.0,
        mechanism: 'laplace',
        budgetTracking: true,
      });

      dp.consumeBudget('tenant-4', 0.5);
      dp.resetBudget('tenant-4');

      const newState = dp.getBudgetState('tenant-4', undefined, {
        epsilon: 1.0,
        mechanism: 'laplace',
        budgetTracking: true,
      });

      expect(newState.spentBudget).toBe(0);
      expect(newState.queryCount).toBe(0);
    });
  });

  describe('Sensitivity Calculation', () => {
    it('should use correct default sensitivities', () => {
      expect(dp.getSensitivity('id', 'count')).toBe(1);
      expect(dp.getSensitivity('value', 'sum')).toBe(100);
      expect(dp.getSensitivity('value', 'avg')).toBe(10);
    });

    it('should use field-specific sensitivities when configured', () => {
      const dpWithCustom = new DifferentialPrivacy({
        countSensitivity: 1,
        sumSensitivity: 100,
        avgSensitivity: 10,
        fieldSensitivities: {
          salary: 50000,
          age: 120,
        },
      });

      expect(dpWithCustom.getSensitivity('salary', 'sum')).toBe(50000);
      expect(dpWithCustom.getSensitivity('age', 'avg')).toBe(120);
      expect(dpWithCustom.getSensitivity('other_field', 'count')).toBe(1);
    });
  });

  describe('Composition Bounds', () => {
    it('should calculate advanced composition bounds', () => {
      const { totalEpsilon, totalDelta } = dp.advancedCompositionBound(
        0.1, // epsilon per query
        1e-5, // delta per query
        100 // number of queries
      );

      // Should be better than simple composition (100 * 0.1 = 10)
      expect(totalEpsilon).toBeLessThan(10);
      expect(totalDelta).toBeGreaterThan(0);
    });

    it('should estimate remaining queries under budget', () => {
      const remaining = dp.estimateRemainingQueries(
        1.0, // target epsilon
        1e-5, // target delta
        0.1, // per-query epsilon
        1e-7 // per-query delta
      );

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThan(1000); // Should be bounded
    });
  });

  describe('Exponential Mechanism', () => {
    it('should select candidates based on scores', () => {
      const candidates = ['A', 'B', 'C', 'D'];
      const scores = { A: 1, B: 5, C: 10, D: 2 };

      // Run many times to check distribution
      const selections: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

      for (let i = 0; i < 1000; i++) {
        const selected = dp.exponentialMechanism(
          candidates,
          c => scores[c],
          1.0,
          1
        );
        selections[selected]++;
      }

      // Highest scoring item (C) should be selected most often
      expect(selections.C).toBeGreaterThan(selections.A);
      expect(selections.C).toBeGreaterThan(selections.D);
    });

    it('should handle single candidate', () => {
      const result = dp.exponentialMechanism(['only'], () => 1, 1.0, 1);
      expect(result).toBe('only');
    });

    it('should throw on empty candidates', () => {
      expect(() => {
        dp.exponentialMechanism([], () => 1, 1.0, 1);
      }).toThrow();
    });
  });
});

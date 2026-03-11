import { test, describe } from 'node:test';
import assert from 'node:assert';
import { NarrativeRiskScorer } from '../src/core/NarrativeRiskScorer.js';
import type { NarrativeRiskFactors } from '../src/core/types.js';

describe('NarrativeRiskScorer', () => {
  const scorer = new NarrativeRiskScorer();

  test('computeRiskScore calculates correct weighted score (all zeros)', () => {
    const factors: NarrativeRiskFactors = {
      viralityVelocity: 0,
      adversarialAmplificationRatio: 0,
      factualAccuracyDelta: 0,
      emotionalManipulationIndex: 0,
    };
    const result = scorer.computeRiskScore('cluster-1', factors);
    assert.strictEqual(result.overallRisk, 0);
    assert.strictEqual(result.clusterId, 'cluster-1');
  });

  test('computeRiskScore calculates correct weighted score (all ones / max)', () => {
    const factors: NarrativeRiskFactors = {
      viralityVelocity: 1,
      adversarialAmplificationRatio: 1,
      factualAccuracyDelta: 1,
      emotionalManipulationIndex: 1,
    };
    const result = scorer.computeRiskScore('cluster-1', factors);
    assert.strictEqual(result.overallRisk, 100);
  });

  test('computeRiskScore calculates correct weighted score (mixed)', () => {
    // 0.5 * 0.3 = 0.15
    // 0.8 * 0.3 = 0.24
    // 0.2 * 0.2 = 0.04
    // 0.9 * 0.2 = 0.18
    // sum = 0.61 -> 61
    const factors: NarrativeRiskFactors = {
      viralityVelocity: 0.5,
      adversarialAmplificationRatio: 0.8,
      factualAccuracyDelta: 0.2,
      emotionalManipulationIndex: 0.9,
    };
    const result = scorer.computeRiskScore('cluster-2', factors);
    assert.strictEqual(result.overallRisk, 61);
  });

  test('computeRiskScore bounds values to 0-1 range', () => {
    const factors: NarrativeRiskFactors = {
      viralityVelocity: 1.5, // should be clamped to 1
      adversarialAmplificationRatio: -0.5, // should be clamped to 0
      factualAccuracyDelta: 2.0, // should be clamped to 1
      emotionalManipulationIndex: -1.0, // should be clamped to 0
    };
    // Expected:
    // v = 1 * 0.3 = 0.3
    // a = 0 * 0.3 = 0
    // f = 1 * 0.2 = 0.2
    // e = 0 * 0.2 = 0
    // sum = 0.5 -> 50
    const result = scorer.computeRiskScore('cluster-3', factors);
    assert.strictEqual(result.overallRisk, 50);
  });

  test('batchScore processes multiple clusters correctly', () => {
    const clusters = [
      {
        clusterId: 'cluster-A',
        factors: {
          viralityVelocity: 1,
          adversarialAmplificationRatio: 1,
          factualAccuracyDelta: 1,
          emotionalManipulationIndex: 1,
        }
      },
      {
        clusterId: 'cluster-B',
        factors: {
          viralityVelocity: 0,
          adversarialAmplificationRatio: 0,
          factualAccuracyDelta: 0,
          emotionalManipulationIndex: 0,
        }
      }
    ];

    const results = scorer.batchScore(clusters);
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].overallRisk, 100);
    assert.strictEqual(results[0].clusterId, 'cluster-A');
    assert.strictEqual(results[1].overallRisk, 0);
    assert.strictEqual(results[1].clusterId, 'cluster-B');
  });
});

import { calculateConvergenceMetrics } from '../../src/narrative/convergence/metrics';
import { getImplicationVector } from '../../src/narrative/convergence/implication_vector';

describe('Convergence Metrics', () => {
  test('Vector generation', () => {
    const v1 = getImplicationVector('Trust us together');
    // Trust(1), Unified(1) -> [1, 0, 1] normalized -> [0.707, 0, 0.707]
    expect(v1[0]).toBeCloseTo(0.707);
    expect(v1[2]).toBeCloseTo(0.707);
  });

  test('High convergence (low variance)', () => {
    const texts = [
      'This is a crisis now',
      'Emergency happening now',
      'Urgent crisis moment'
    ];
    // All should hit Dimension 1 (Urgent)

    const metrics = calculateConvergenceMetrics(texts, 1);
    expect(metrics.interpretive_variance).toBeLessThan(0.1);
    expect(metrics.convergence_direction).toBe('converging');
  });

  test('Divergence (high variance)', () => {
    const texts = [
      'Trust us together', // Trust + Unified
      'Fake crisis now'    // Distrust + Urgent
    ];

    const metrics = calculateConvergenceMetrics(texts, 1);
    expect(metrics.interpretive_variance).toBeGreaterThan(0.2);
  });
});

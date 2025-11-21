import { describe, expect, it } from 'vitest';
import { calculatePowerForMetric } from '../src/power.js';

describe('power calculations', () => {
  it('matches analytical baseline for two-proportion test', () => {
    const result = calculatePowerForMetric(
      {
        name: 'activation_rate',
        baselineRate: 0.1,
        minDetectableEffect: 0.02
      },
      {
        method: 'difference-in-proportions',
        alpha: 0.05,
        desiredPower: 0.8
      }
    );

    // Analytical calculators report ~3841 samples per variant for these parameters.
    expect(result.variantSampleSize).toBe(3841);
    expect(result.totalSampleSize).toBe(7682);
  });
});

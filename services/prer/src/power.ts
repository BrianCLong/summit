import { jStat } from 'jstat';
import type { AnalysisPlan, MetricDefinition, PowerCalculation } from './types.js';

export function calculatePowerForMetric(
  metric: MetricDefinition,
  plan: AnalysisPlan
): PowerCalculation {
  if (plan.method !== 'difference-in-proportions') {
    throw new Error(`Unsupported method: ${plan.method}`);
  }

  const { baselineRate, minDetectableEffect } = metric;
  if (minDetectableEffect === 0) {
    throw new Error('minDetectableEffect must be non-zero');
  }

  const alpha = plan.alpha;
  const desiredPower = plan.desiredPower;

  if (alpha <= 0 || alpha >= 1) {
    throw new Error('alpha must be between 0 and 1');
  }

  if (desiredPower <= 0 || desiredPower >= 1) {
    throw new Error('desiredPower must be between 0 and 1');
  }

  const p1 = baselineRate;
  const p2 = baselineRate + minDetectableEffect;

  if (p2 <= 0 || p2 >= 1) {
    throw new Error('baselineRate + minDetectableEffect must be between 0 and 1');
  }

  const pooled = (p1 + p2) / 2;
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const zBeta = jStat.normal.inv(desiredPower, 0, 1);
  const numerator =
    zAlpha * Math.sqrt(2 * pooled * (1 - pooled)) +
    zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  const perVariant = Math.ceil((numerator * numerator) / (minDetectableEffect * minDetectableEffect));
  const total = perVariant * 2;

  return {
    variantSampleSize: perVariant,
    totalSampleSize: total,
    baselineRate,
    minDetectableEffect
  };
}

export function buildPowerAnalysis(
  metrics: MetricDefinition[],
  plan: AnalysisPlan
): Record<string, PowerCalculation> {
  return metrics.reduce<Record<string, PowerCalculation>>((acc, metric) => {
    acc[metric.name] = calculatePowerForMetric(metric, plan);
    return acc;
  }, {});
}

import {
  ComponentWeights,
  HealthMetrics,
  HealthSample,
  ThresholdPolicy,
} from './types';

export interface ScoreBreakdown {
  compositeScore: number;
  componentScores: Record<string, number>;
  sloBreaches: string[];
}

const EPSILON = 1e-9;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: number, baseline: number, ceiling: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(ceiling)) {
    return 0;
  }
  if (value <= baseline) {
    return 1;
  }
  const allowedHeadroom = Math.max(ceiling - baseline, EPSILON);
  const overage = value - baseline;
  return clamp(1 - overage / allowedHeadroom);
}

function computeProbeScore(successRate: number, minSuccess: number): number {
  if (!Number.isFinite(successRate)) {
    return 0;
  }
  if (successRate >= minSuccess) {
    return 1;
  }
  const deficit = minSuccess - successRate;
  const range = Math.max(minSuccess, EPSILON);
  return clamp(1 - deficit / range);
}

export class HealthScorer {
  private readonly weights: ComponentWeights;
  private readonly policy: ThresholdPolicy;

  constructor(weights: ComponentWeights, policy: ThresholdPolicy) {
    const totalWeight =
      weights.errorRate + weights.latency + weights.saturation + weights.probes;
    if (totalWeight <= 0) {
      throw new Error('Component weights must sum to a positive value');
    }
    const normalizedWeights: ComponentWeights = {
      errorRate: weights.errorRate / totalWeight,
      latency: weights.latency / totalWeight,
      saturation: weights.saturation / totalWeight,
      probes: weights.probes / totalWeight,
    };
    this.weights = normalizedWeights;
    this.policy = policy;
  }

  public evaluate(sample: HealthSample): ScoreBreakdown {
    const { metrics, baseline } = sample;
    const errorScore = normalize(
      metrics.errorRate,
      baseline.errorRate,
      this.policy.maxErrorRate,
    );
    const latencyScore = normalize(
      metrics.latencyP95,
      baseline.latencyP95,
      this.policy.maxLatencyP95,
    );
    const saturationScore = normalize(
      metrics.saturation,
      baseline.saturation,
      this.policy.maxSaturation,
    );
    const successRate = this.computeProbeSuccessRate(metrics);
    const probeScore = computeProbeScore(
      successRate,
      this.policy.minProbeSuccess,
    );

    const componentScores: Record<string, number> = {
      errorRate: errorScore,
      latencyP95: latencyScore,
      saturation: saturationScore,
      probes: probeScore,
    };

    const compositeScore =
      errorScore * this.weights.errorRate +
      latencyScore * this.weights.latency +
      saturationScore * this.weights.saturation +
      probeScore * this.weights.probes;

    const sloBreaches = this.collectBreaches(metrics, successRate);

    return {
      compositeScore,
      componentScores,
      sloBreaches,
    };
  }

  private computeProbeSuccessRate(metrics: HealthMetrics): number {
    if (!metrics.probes.length) {
      return 1;
    }
    const successCount = metrics.probes.filter((probe) => probe.success).length;
    return successCount / metrics.probes.length;
  }

  private collectBreaches(
    metrics: HealthMetrics,
    probeSuccessRate: number,
  ): string[] {
    const breaches: string[] = [];
    if (metrics.errorRate > this.policy.maxErrorRate) {
      breaches.push(
        `Error rate ${metrics.errorRate.toFixed(4)} exceeds limit ${this.policy.maxErrorRate.toFixed(4)}`,
      );
    }
    if (metrics.latencyP95 > this.policy.maxLatencyP95) {
      breaches.push(
        `P95 latency ${metrics.latencyP95.toFixed(0)}ms exceeds limit ${this.policy.maxLatencyP95.toFixed(0)}ms`,
      );
    }
    if (metrics.saturation > this.policy.maxSaturation) {
      breaches.push(
        `Saturation ${(metrics.saturation * 100).toFixed(1)}% exceeds limit ${(this.policy.maxSaturation * 100).toFixed(1)}%`,
      );
    }
    if (probeSuccessRate < this.policy.minProbeSuccess) {
      breaches.push(
        `Synthetic probe success rate ${(probeSuccessRate * 100).toFixed(1)}% below ${(this.policy.minProbeSuccess * 100).toFixed(1)}%`,
      );
    }
    return breaches;
  }
}

export function summarizeSyntheticFailures(sample: HealthSample): string[] {
  return sample.syntheticChecks
    .filter((check) => !check.passed)
    .map((check) => check.name);
}

export function withinBakeWindow(
  startedAt: string | undefined,
  minBakeSeconds: number,
  now: Date,
): boolean {
  if (!startedAt) {
    return true;
  }
  const elapsed = now.getTime() - new Date(startedAt).getTime();
  return elapsed >= minBakeSeconds * 1000;
}

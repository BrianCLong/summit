import type { InferenceRequest } from '@intelgraph/deep-learning-core';

interface FeatureStats {
  count: number;
  mean: number;
  std: number;
  min: number;
  max: number;
}

export interface DriftSignal {
  status: 'baseline' | 'stable' | 'warning' | 'drift';
  psi: number;
  baselineSize: number;
  featureCount: number;
  lastSeenAt: string;
}

export interface MetricsSnapshot {
  requests: number;
  errors: number;
  errorRate: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  averageLatency: number;
  throughputPerMinute: number;
  lastUpdated: string;
}

function percentile(values: number[], percentileRank: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentileRank / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function computeStats(values: number[]): FeatureStats {
  if (values.length === 0) {
    return { count: 0, mean: 0, std: 0, min: 0, max: 0 };
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  const mean = sum / values.length;
  const variance =
    values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / Math.max(values.length - 1, 1);
  const std = Math.sqrt(variance);

  return { count: values.length, mean, std, min: Math.min(...values), max: Math.max(...values) };
}

function extractNumericFeatures(input: Record<string, any>): number[] {
  const values: number[] = [];

  const traverse = (value: any): void => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      values.push(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(traverse);
      return;
    }

    if (value && typeof value === 'object') {
      Object.values(value).forEach(traverse);
    }
  };

  traverse(input);
  return values;
}

export class MetricsCollector {
  private totalRequests = 0;

  private totalErrors = 0;

  private latencies: number[] = [];

  private throughputWindow: number[] = [];

  recordSuccess(latencyMs: number, batchSize: number): void {
    this.totalRequests += batchSize;
    this.latencies.push(latencyMs);
    this.latencies = this.latencies.slice(-500);
    this.throughputWindow.push(Date.now());
    this.throughputWindow = this.throughputWindow.filter((ts) => ts > Date.now() - 60_000);
  }

  recordFailure(): void {
    this.totalRequests += 1;
    this.totalErrors += 1;
    this.throughputWindow.push(Date.now());
    this.throughputWindow = this.throughputWindow.filter((ts) => ts > Date.now() - 60_000);
  }

  snapshot(): MetricsSnapshot {
    const errorRate = this.totalRequests === 0 ? 0 : this.totalErrors / this.totalRequests;
    const averageLatency = this.latencies.length === 0
      ? 0
      : this.latencies.reduce((acc, value) => acc + value, 0) / this.latencies.length;

    return {
      requests: this.totalRequests,
      errors: this.totalErrors,
      errorRate,
      p50Latency: percentile(this.latencies, 50),
      p95Latency: percentile(this.latencies, 95),
      p99Latency: percentile(this.latencies, 99),
      averageLatency,
      throughputPerMinute: this.throughputWindow.length,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export class DriftDetector {
  private baseline?: FeatureStats;

  private recentSignals: DriftSignal[] = [];

  evaluate(request: InferenceRequest): DriftSignal {
    const numericFeatures = extractNumericFeatures(request.inputs);
    const stats = computeStats(numericFeatures);

    if (!this.baseline && stats.count > 0) {
      this.baseline = stats;
      const baselineSignal: DriftSignal = {
        status: 'baseline',
        psi: 0,
        baselineSize: stats.count,
        featureCount: stats.count,
        lastSeenAt: new Date().toISOString(),
      };
      this.recentSignals.push(baselineSignal);
      this.recentSignals = this.recentSignals.slice(-50);
      return baselineSignal;
    }

    if (!this.baseline) {
      const emptySignal: DriftSignal = {
        status: 'baseline',
        psi: 0,
        baselineSize: 0,
        featureCount: 0,
        lastSeenAt: new Date().toISOString(),
      };
      this.recentSignals.push(emptySignal);
      this.recentSignals = this.recentSignals.slice(-50);
      return emptySignal;
    }

    const psi = this.populationStabilityIndex(this.baseline, stats);
    const status: DriftSignal['status'] = psi > 0.3 ? 'drift' : psi > 0.15 ? 'warning' : 'stable';
    const signal: DriftSignal = {
      status,
      psi,
      baselineSize: this.baseline.count,
      featureCount: stats.count,
      lastSeenAt: new Date().toISOString(),
    };

    this.recentSignals.push(signal);
    this.recentSignals = this.recentSignals.slice(-50);
    return signal;
  }

  summary(): DriftSignal | undefined {
    return this.recentSignals[this.recentSignals.length - 1];
  }

  private populationStabilityIndex(baseline: FeatureStats, current: FeatureStats): number {
    if (baseline.count === 0 || current.count === 0) return 0;

    const meanShift = Math.abs(current.mean - baseline.mean) / Math.max(baseline.std || 1, 1);
    const varianceShift = Math.abs(current.std - baseline.std) / Math.max(baseline.std || 1, 1);
    const coverageShift = Math.abs(current.max - baseline.max) + Math.abs(current.min - baseline.min);

    return meanShift * 0.6 + varianceShift * 0.3 + (coverageShift > 0 ? 0.1 : 0);
  }
}

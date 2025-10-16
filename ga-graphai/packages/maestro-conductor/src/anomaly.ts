import type { AnomalySignal, AnomalyTrend, HealthSignal } from './types';

export interface AnomalyDetectorOptions {
  windowSize?: number;
  zThreshold?: number;
  trendSlopeThreshold?: number;
  minSamples?: number;
}

interface MetricWindow {
  values: number[];
}

const DEFAULT_OPTIONS: Required<AnomalyDetectorOptions> = {
  windowSize: 25,
  zThreshold: 2.5,
  trendSlopeThreshold: 0.2,
  minSamples: 6,
};

function computeMean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeStdDev(values: number[], mean: number): number {
  if (values.length === 0) {
    return 0;
  }
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function computeSlope(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < values.length; i += 1) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const n = values.length;
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return 0;
  }
  return (n * sumXY - sumX * sumY) / denominator;
}

function determineTrend(
  slope: number,
  current: number,
  mean: number,
): AnomalyTrend {
  if (Math.abs(current - mean) < mean * 0.05) {
    return 'oscillation';
  }
  if (slope > 0) {
    return current > mean ? 'spike' : 'drift';
  }
  if (slope < 0) {
    return current < mean ? 'drop' : 'drift';
  }
  return 'oscillation';
}

export class AnomalyDetector {
  private readonly options: Required<AnomalyDetectorOptions>;

  private readonly windows = new Map<string, MetricWindow>();

  constructor(options?: AnomalyDetectorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  evaluate(signal: HealthSignal): AnomalySignal | undefined {
    const key = `${signal.assetId}:${signal.metric}`;
    const window = this.windows.get(key) ?? { values: [] };
    window.values.push(signal.value);
    if (window.values.length > this.options.windowSize) {
      window.values.shift();
    }
    this.windows.set(key, window);

    if (window.values.length < this.options.minSamples) {
      return undefined;
    }

    const mean = computeMean(window.values);
    const std = computeStdDev(window.values, mean);
    const deviation = Math.abs(signal.value - mean);
    const zScore =
      std === 0
        ? deviation === 0
          ? 0
          : deviation / Math.max(mean, 1)
        : deviation / std;
    const slope = computeSlope(
      window.values.slice(-Math.min(6, window.values.length)),
    );
    const severityScore = Math.max(zScore, Math.abs(slope));

    if (severityScore < this.options.zThreshold) {
      return undefined;
    }

    let severity: AnomalySignal['severity'] = 'low';
    if (severityScore >= this.options.zThreshold + 2) {
      severity = 'critical';
    } else if (severityScore >= this.options.zThreshold + 1) {
      severity = 'high';
    } else if (severityScore >= this.options.zThreshold + 0.4) {
      severity = 'medium';
    }

    const trend = determineTrend(slope, signal.value, mean);
    const message =
      severity === 'critical'
        ? `critical anomaly detected for ${signal.metric}`
        : `anomaly detected for ${signal.metric}`;

    return {
      assetId: signal.assetId,
      metric: signal.metric,
      severity,
      score: Number(severityScore.toFixed(2)),
      trend,
      message,
      timestamp: signal.timestamp,
      window: [...window.values],
    };
  }
}

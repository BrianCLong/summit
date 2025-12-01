/**
 * Anomaly Detection Module
 *
 * Statistical anomaly detection for telemetry streams.
 * Uses simple but effective methods suitable for synthetic data simulation.
 */

/** Statistical baseline for a metric */
export interface MetricBaseline {
  name: string;
  count: number;
  mean: number;
  variance: number;
  min: number;
  max: number;
  lastUpdated: Date;
}

/** Anomaly detection result */
export interface AnomalyResult {
  metricName: string;
  value: number;
  expectedRange: { min: number; max: number };
  zscore: number;
  isAnomaly: boolean;
  confidence: number;
  description: string;
}

/** Anomaly detector configuration */
export interface AnomalyConfig {
  /** Z-score threshold for anomaly detection */
  zscoreThreshold: number;
  /** Minimum samples before detection is active */
  minSamples: number;
  /** Decay factor for exponential moving average (0-1) */
  decayFactor: number;
}

const defaultConfig: AnomalyConfig = {
  zscoreThreshold: 3.0,
  minSamples: 30,
  decayFactor: 0.1,
};

/**
 * Simple anomaly detector using z-score based detection
 */
export class AnomalyDetector {
  private baselines: Map<string, MetricBaseline> = new Map();
  private config: AnomalyConfig;

  constructor(config: Partial<AnomalyConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /** Update baseline with new value */
  updateBaseline(metricName: string, value: number): void {
    const existing = this.baselines.get(metricName);

    if (!existing) {
      // Initialize new baseline
      this.baselines.set(metricName, {
        name: metricName,
        count: 1,
        mean: value,
        variance: 0,
        min: value,
        max: value,
        lastUpdated: new Date(),
      });
      return;
    }

    // Update using Welford's online algorithm for variance
    const n = existing.count + 1;
    const delta = value - existing.mean;
    const newMean = existing.mean + delta / n;
    const delta2 = value - newMean;
    const newVariance = existing.variance + (delta * delta2 - existing.variance) / n;

    this.baselines.set(metricName, {
      name: metricName,
      count: n,
      mean: newMean,
      variance: newVariance,
      min: Math.min(existing.min, value),
      max: Math.max(existing.max, value),
      lastUpdated: new Date(),
    });
  }

  /** Check if value is anomalous */
  detect(metricName: string, value: number): AnomalyResult | null {
    const baseline = this.baselines.get(metricName);

    if (!baseline || baseline.count < this.config.minSamples) {
      // Not enough data for detection
      return null;
    }

    const stddev = Math.sqrt(baseline.variance);
    if (stddev === 0) {
      // No variance, can't compute z-score meaningfully
      return null;
    }

    const zscore = Math.abs(value - baseline.mean) / stddev;
    const isAnomaly = zscore > this.config.zscoreThreshold;

    // Confidence based on how far outside threshold
    const confidence = isAnomaly
      ? Math.min(0.5 + (zscore - this.config.zscoreThreshold) * 0.1, 0.99)
      : 0;

    return {
      metricName,
      value,
      expectedRange: {
        min: baseline.mean - this.config.zscoreThreshold * stddev,
        max: baseline.mean + this.config.zscoreThreshold * stddev,
      },
      zscore,
      isAnomaly,
      confidence,
      description: isAnomaly
        ? `Value ${value.toFixed(2)} is ${zscore.toFixed(2)} standard deviations from mean ${baseline.mean.toFixed(2)}`
        : `Value ${value.toFixed(2)} is within expected range`,
    };
  }

  /** Get baseline statistics */
  getBaseline(metricName: string): MetricBaseline | undefined {
    return this.baselines.get(metricName);
  }

  /** Get all baselines */
  getAllBaselines(): MetricBaseline[] {
    return Array.from(this.baselines.values());
  }

  /** Clear all baselines */
  reset(): void {
    this.baselines.clear();
  }

  /** Extract numeric metrics from an event for baselining */
  extractMetrics(event: unknown): Record<string, number> {
    const metrics: Record<string, number> = {};
    const eventObj = event as Record<string, unknown>;
    const eventType = eventObj.eventType as string;

    // Extract common numeric fields
    const numericFields = [
      'bytesIn',
      'bytesOut',
      'packetsIn',
      'packetsOut',
      'durationMs',
      'latencyMs',
      'requestSize',
      'responseSize',
      'riskScore',
      'confidence',
      'queryTimeMs',
      'fileSize',
    ];

    for (const field of numericFields) {
      if (typeof eventObj[field] === 'number') {
        metrics[`${eventType}.${field}`] = eventObj[field] as number;
      }
    }

    return metrics;
  }

  /** Process an event - update baselines and detect anomalies */
  processEvent(event: unknown): AnomalyResult[] {
    const metrics = this.extractMetrics(event);
    const anomalies: AnomalyResult[] = [];

    for (const [name, value] of Object.entries(metrics)) {
      // First check for anomaly
      const result = this.detect(name, value);
      if (result?.isAnomaly) {
        anomalies.push(result);
      }

      // Then update baseline
      this.updateBaseline(name, value);
    }

    return anomalies;
  }
}

/** Create a new anomaly detector */
export function createAnomalyDetector(config?: Partial<AnomalyConfig>): AnomalyDetector {
  return new AnomalyDetector(config);
}

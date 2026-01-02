import { AnomalyPrediction, MetricSignal } from './types.js';

interface PredictorState {
  ema: number;
  variance: number;
  lastTimestamp: number;
  count: number;
}

const DEFAULT_ALPHA = 0.35;
const DEFAULT_TOLERANCE = 3;

export class AnomalyPredictor {
  private readonly alpha: number;
  private readonly tolerance: number;
  private readonly state: Record<string, PredictorState> = {};

  constructor(alpha = DEFAULT_ALPHA, tolerance = DEFAULT_TOLERANCE) {
    this.alpha = alpha;
    this.tolerance = tolerance;
  }

  ingest(metric: MetricSignal): AnomalyPrediction {
    const key = `${metric.service}:${metric.name}`;
    const previous = this.state[key];
    const now = metric.timestamp;

    if (!previous) {
      this.state[key] = {
        ema: metric.value,
        variance: 0,
        lastTimestamp: now,
        count: 1,
      };
      return {
        signal: metric,
        predictedValue: metric.value,
        probability: 0,
        isLikelyAnomaly: false,
        rationale: 'baseline-initialized',
      };
    }

    const delta = metric.value - previous.ema;
    const ema = previous.ema + this.alpha * delta;
    const variance = (1 - this.alpha) * (previous.variance + this.alpha * delta * delta);

    const stddev = Math.sqrt(variance);
    const distance = stddev ? Math.abs(metric.value - ema) / stddev : 0;
    const probability = Math.min(1, distance / this.tolerance);
    const isLikelyAnomaly = distance >= this.tolerance || (!!metric.expected?.p95 && metric.value > metric.expected.p95);

    this.state[key] = {
      ema,
      variance,
      lastTimestamp: now,
      count: previous.count + 1,
    };

    return {
      signal: metric,
      predictedValue: Number(ema.toFixed(3)),
      probability: Number(probability.toFixed(3)),
      isLikelyAnomaly,
      rationale: isLikelyAnomaly
        ? `value deviated ${distance.toFixed(2)}σ from EMA baseline`
        : 'within expected range',
    };
  }
}

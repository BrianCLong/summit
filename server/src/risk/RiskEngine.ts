import type { FeatureVector } from './FeatureStore.js';
import { z } from 'zod';
export type { FeatureVector } from './FeatureStore.js';

const FeatureVectorSchema = z.record(z.string(), z.number());
const RiskWindowSchema = z.enum(['24h', '7d', '30d']);

export type RiskResult = {
  score: number;
  band: 'low' | 'medium' | 'high' | 'critical';
  contributions: Array<{
    feature: string;
    value: number;
    weight: number;
    delta: number;
  }>;
  window: '24h' | '7d' | '30d';
  computedAt: string;
  modelVersion: string;
};

export class RiskEngine {
  constructor(
    private readonly weights: FeatureVector,
    private readonly bias: number,
    private readonly version = 'v1',
  ) {
    // Validate initialization parameters
    FeatureVectorSchema.parse(weights);
    if (!Number.isFinite(bias)) {
      throw new Error(`Invalid bias: ${bias}. Bias must be a finite number.`);
    }
    Object.values(weights).forEach((w) => {
      if (!Number.isFinite(w)) {
        throw new Error(`Invalid weight: ${w}. Weights must be finite numbers.`);
      }
    });
  }

  score(features: FeatureVector, window: RiskResult['window']): RiskResult {
    // Validate inputs
    FeatureVectorSchema.parse(features);
    RiskWindowSchema.parse(window);

    let z = this.bias;
    const contributions = Object.keys(features).map((f) => {
      const w = this.weights[f] ?? 0;
      const v = features[f] ?? 0;
      const delta = w * v;

      // Handle NaN/Infinity from multiplication if any
      const safeDelta = Number.isFinite(delta) ? delta : 0;
      z += safeDelta;

      return { feature: f, value: v, weight: w, delta: safeDelta };
    });
    const s = 1 / (1 + Math.exp(-z));
    const band =
      s < 0.33 ? 'low' : s < 0.66 ? 'medium' : s < 0.85 ? 'high' : 'critical';
    return {
      score: s,
      band,
      contributions,
      window,
      computedAt: new Date().toISOString(),
      modelVersion: this.version,
    };
  }
}

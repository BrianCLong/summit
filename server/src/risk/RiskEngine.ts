import { FeatureVector } from './FeatureStore';

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

/**
 * Core risk calculation engine.
 * Computes a risk score based on a logistic regression model (feature vector * weights + bias).
 * Classifies the score into risk bands (low, medium, high, critical).
 */
export class RiskEngine {
  /**
   * Initializes the RiskEngine with model weights and bias.
   *
   * @param weights - A map of feature names to their weights.
   * @param bias - The model bias term.
   * @param version - The version identifier of the risk model (default: 'v1').
   */
  constructor(
    private readonly weights: FeatureVector,
    private readonly bias: number,
    private readonly version = 'v1',
  ) {}

  /**
   * Calculates the risk score for a given feature vector.
   *
   * @param features - The input features for the subject being scored.
   * @param window - The time window for the risk assessment.
   * @returns A RiskResult object containing the score, band, and feature contributions.
   */
  score(features: FeatureVector, window: RiskResult['window']): RiskResult {
    let z = this.bias;
    const contributions = Object.keys(features).map((f) => {
      const w = this.weights[f] ?? 0;
      const v = features[f] ?? 0;
      const delta = w * v;
      z += delta;
      return { feature: f, value: v, weight: w, delta };
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

import { DriftSignal, FeatureVector, Modality } from './types.js';
import { FeatureStore } from './featureStore.js';

export class OnlineLearner {
  constructor(private readonly featureStore: FeatureStore) {}

  detectDrift(assetId: string, modality: Modality, threshold = 0.25): DriftSignal | null {
    const recent = this.featureStore.window(assetId, modality, 10);
    if (recent.length < 5) return null;
    const mean = this.featureStore.aggregateMean(assetId, modality, 10);
    const latest = recent[0]?.features ?? {};
    const magnitude = this.calculateShift(mean, latest);
    if (magnitude <= threshold) return null;
    return {
      assetId,
      modality,
      driftMagnitude: magnitude,
      reason: `Detected ${(magnitude * 100).toFixed(1)}% distribution shift across tracked features`,
    };
  }

  private calculateShift(reference: FeatureVector, candidate: FeatureVector): number {
    const keys = new Set([...Object.keys(reference), ...Object.keys(candidate)]);
    const deltas: number[] = [];
    keys.forEach((key) => {
      const base = reference[key] ?? 0;
      const value = candidate[key] ?? 0;
      const denom = Math.abs(base) + 1e-6;
      deltas.push(Math.abs(value - base) / denom);
    });
    const meanDelta = deltas.reduce((sum, d) => sum + d, 0) / (deltas.length || 1);
    return meanDelta;
  }
}

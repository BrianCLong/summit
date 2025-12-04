import { FeatureStore } from '../core/featureStore.js';
import { Modality, TwinGraph } from '../core/types.js';

export interface AnomalyExplanation {
  assetId: string;
  modality: Modality;
  score: number;
  factors: string[];
}

export class DiagnosticsAgent {
  constructor(private readonly featureStore: FeatureStore, private readonly twinGraph: TwinGraph) {}

  detect(assetId: string, modality: Modality, threshold = 0.35): AnomalyExplanation | null {
    const latest = this.featureStore.latest(assetId, modality);
    if (!latest) return null;
    const mean = this.featureStore.aggregateMean(assetId, modality, 20);
    const deviation = this.relativeDeviation(mean, latest.features);
    if (deviation < threshold) return null;

    const neighbors = this.twinGraph.neighbors(assetId, 'depends_on');
    const factors = neighbors.map((neighbor) => `Dependency ${neighbor.id} (${neighbor.type}) may contribute.`);
    factors.unshift(`Observed ${(deviation * 100).toFixed(1)}% deviation in ${modality} signals.`);

    return { assetId, modality, score: deviation, factors };
  }

  private relativeDeviation(reference: Record<string, number>, candidate: Record<string, number>): number {
    const keys = new Set([...Object.keys(reference), ...Object.keys(candidate)]);
    const deltas: number[] = [];
    keys.forEach((key) => {
      const base = reference[key] ?? 0;
      const value = candidate[key] ?? 0;
      const denom = Math.abs(base) + 1e-6;
      deltas.push(Math.abs(value - base) / denom);
    });
    return deltas.reduce((sum, d) => sum + d, 0) / (deltas.length || 1);
  }
}

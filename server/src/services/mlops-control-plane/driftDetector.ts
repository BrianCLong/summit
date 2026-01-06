import type { FeatureSummary } from './types.js';

export interface DriftDetector {
  evaluate(entityId: string, summary: FeatureSummary): boolean;
}

export class MemoryDriftDetector implements DriftDetector {
  private lastSummary = new Map<string, FeatureSummary>();
  private readonly threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  evaluate(entityId: string, summary: FeatureSummary): boolean {
    const previous = this.lastSummary.get(entityId);
    this.lastSummary.set(entityId, summary);
    if (!previous) {
      return false;
    }

    const delta = Math.abs(
      summary.numericFeatureSum - previous.numericFeatureSum,
    );

    return delta >= this.threshold;
  }
}

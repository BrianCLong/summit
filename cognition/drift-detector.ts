import { DriftVector } from "./narrative-model";

export interface DriftSample {
  audienceId: string;
  metric: string;
  timestamp: string;
  value: number;
}

export function computeDriftVector(samples: DriftSample[]): DriftVector | null {
  if (samples.length < 2) {
    return null;
  }

  const ordered = [...samples].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const start = ordered[0];
  const end = ordered[ordered.length - 1];
  const delta = end.value - start.value;

  return {
    audienceId: end.audienceId,
    metric: end.metric,
    startValue: start.value,
    endValue: end.value,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

export function exceedsDriftThreshold(vector: DriftVector, threshold: number): boolean {
  return Math.abs(vector.delta) >= Math.abs(threshold);
}

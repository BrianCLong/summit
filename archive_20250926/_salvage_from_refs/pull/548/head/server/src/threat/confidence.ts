export type ConfidenceBand = 'Low' | 'Medium' | 'High';

export const LOW_THRESHOLD = 0.4;
export const HIGH_THRESHOLD = 0.7;

export function band(score: number): ConfidenceBand {
  if (score >= HIGH_THRESHOLD) return 'High';
  if (score >= LOW_THRESHOLD) return 'Medium';
  return 'Low';
}

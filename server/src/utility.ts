/**
 * Calculates a reward score based on cost, latency, and quality metrics.
 * The reward is a weighted sum of normalized cost, normalized latency, and quality.
 *
 * @param metrics - Object containing costUsd, latencyMs, and qualityScore.
 * @param weights - Object containing weights for cost, latency, and quality.
 * @returns A normalized reward score between 0 and 1.
 */
export function rewardFromMetrics(
  {
    costUsd,
    latencyMs,
    qualityScore,
  }: { costUsd: number; latencyMs: number; qualityScore?: number },
  weights: { cost: number; latency: number; quality: number },
) {
  const costNorm = 1 / (1 + Math.max(0, costUsd));
  const latNorm = 1 / (1 + Math.max(0, latencyMs) / 1000);
  const q = Math.max(0, Math.min(1, qualityScore ?? 0.8));
  const r =
    weights.cost * costNorm + weights.latency * latNorm + weights.quality * q;
  return Math.max(0, Math.min(1, r));
}

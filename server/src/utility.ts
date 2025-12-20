/**
 * Calculates a reward score based on cost, latency, and quality metrics.
 * The reward is a weighted sum of normalized metrics, ranging from 0 to 1.
 *
 * @param metrics - The metrics to evaluate.
 * @param metrics.costUsd - The cost in USD.
 * @param metrics.latencyMs - The latency in milliseconds.
 * @param metrics.qualityScore - The quality score (0 to 1, default 0.8).
 * @param weights - The weights for each metric.
 * @param weights.cost - Weight for cost.
 * @param weights.latency - Weight for latency.
 * @param weights.quality - Weight for quality.
 * @returns The calculated reward score.
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

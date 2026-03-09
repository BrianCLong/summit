/**
 * Calculates a penalty score for nodes based on their centrality/degree.
 * High-degree nodes (hubs) often provide generic, low-information evidence.
 */
export function calculateHubPenalty(degree: number, threshold: number = 100): number {
  if (degree <= threshold) return 0;

  // Logarithmic penalty
  return Math.log10(degree - threshold);
}

/**
 * Re-ranks evidence candidates by applying hub penalties.
 * Candidates with high penalties are pushed down.
 */
export function rerankEvidence(
  candidates: Array<{ id: string; score: number; degree: number }>,
  penaltyWeight: number = 1.0
): Array<{ id: string; score: number }> {
  return candidates
    .map(c => ({
      ...c,
      adjustedScore: c.score - (calculateHubPenalty(c.degree) * penaltyWeight)
    }))
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
    .map(c => ({ id: c.id, score: c.adjustedScore }));
}

export interface CredibilityScore {
  sourceId: string;
  baseScore: number;
  stabilityWeight: number;
  finalScore: number;
  lastUpdated: string;
}

export class CredibilityEngine {
  /**
   * Calculates a stability-weighted credibility score.
   * Stability measures how consistent the source is under challenge or over time.
   */
  public static calculateStabilityWeighted(
    baseScore: number,
    corrections: number,
    challenges: number,
    totalClaims: number
  ): number {
    if (totalClaims === 0) return baseScore;

    const errorRate = corrections / totalClaims;
    const challengeRate = challenges / totalClaims;

    // Stability penalty increases with higher error rate and challenge rate
    const stabilityPenalty = (errorRate * 0.6) + (challengeRate * 0.4);
    const weight = Math.max(0.1, 1 - stabilityPenalty);

    return baseScore * weight;
  }

  /**
   * Applies a claim aging curve (monotonic decay).
   */
  public static applyAging(score: number, ageDays: number, halfLifeDays: number = 30): number {
    // Standard exponential decay: score * (0.5 ^ (age / halfLife))
    return score * Math.pow(0.5, ageDays / halfLifeDays);
  }
}

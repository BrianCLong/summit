import type { NarrativeRiskFactors, NarrativeRiskScore } from './types.js';

export class NarrativeRiskScorer {
  /**
   * Computes a composite narrative risk score based on key factors.
   * Assumes each factor is passed as a 0-1 scale (or will be clamped to 0-1)
   * for calculating the final 0-100 score.
   *
   * Weights:
   * - viralityVelocity: 30%
   * - adversarialAmplificationRatio: 30%
   * - factualAccuracyDelta: 20%
   * - emotionalManipulationIndex: 20%
   */
  public computeRiskScore(clusterId: string, factors: NarrativeRiskFactors): NarrativeRiskScore {
    const v = Math.min(Math.max(factors.viralityVelocity, 0), 1);
    const a = Math.min(Math.max(factors.adversarialAmplificationRatio, 0), 1);
    const f = Math.min(Math.max(factors.factualAccuracyDelta, 0), 1);
    const e = Math.min(Math.max(factors.emotionalManipulationIndex, 0), 1);

    const score = (v * 0.3) + (a * 0.3) + (f * 0.2) + (e * 0.2);

    // Scale 0-1 to 0-100 and round to 2 decimal places
    const overallRisk = Math.round((score * 100) * 100) / 100;

    return {
      clusterId,
      overallRisk,
      factors,
      timestamp: Date.now()
    };
  }

  /**
   * Process a batch of narrative clusters to compute their risk scores.
   */
  public batchScore(
    clusters: { clusterId: string; factors: NarrativeRiskFactors }[]
  ): NarrativeRiskScore[] {
    return clusters.map(c => this.computeRiskScore(c.clusterId, c.factors));
  }
}

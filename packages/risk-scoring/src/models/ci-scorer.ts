import { RiskScore, RiskFactor } from '../types/index.js';

export interface CIInputSignals {
  coordinationScore: number;
  patternMatchScores: Record<string, number>;
  engagementState: string;
  sourceReliability: number;
}

/**
 * CounterintelligenceScorer calculates risk scores specifically for adversarial narrative detection.
 * It is designed to be interpretable and clearly oriented to defense.
 */
export class CounterintelligenceScorer {
  /**
   * Calculates a composite CI risk score based on several signals.
   * @param entityId The ID of the entity being scored.
   * @param signals The input signals for CI scoring.
   * @returns A RiskScore object with qualitative labels and quantitative score.
   */
  public calculateScore(entityId: string, signals: CIInputSignals): RiskScore {
    const { coordinationScore, patternMatchScores, engagementState, sourceReliability } = signals;

    // Weighting factors
    const WEIGHTS = {
      COORDINATION: 0.4,
      PATTERN: 0.4,
      RELIABILITY: 0.2
    };

    // Calculate pattern contribution (max of matched patterns)
    const maxPatternScore = Object.values(patternMatchScores).reduce((max, score) => Math.max(max, score), 0);

    // Calculate raw score
    let rawScore = (coordinationScore * WEIGHTS.COORDINATION) +
                   (maxPatternScore * WEIGHTS.PATTERN) +
                   ((1 - sourceReliability) * WEIGHTS.RELIABILITY);

    // Engagement state modifier
    if (engagementState === 'confirmed_adversarial') {
      rawScore = Math.min(1.0, rawScore + 0.2);
    } else if (engagementState === 'monitored' || engagementState === 'turned') {
      // High monitoring state might slightly lower the "uncertainty" risk but maintain the "threat" risk
      rawScore = Math.max(0.1, rawScore - 0.05);
    }

    // Interpretive labels
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (rawScore > 0.8) {
      riskLevel = 'critical';
    } else if (rawScore > 0.6) {
      riskLevel = 'high';
    } else if (rawScore > 0.4) {
      riskLevel = 'medium';
    }

    const factors: RiskFactor[] = [
      { name: 'coordination', weight: WEIGHTS.COORDINATION, value: coordinationScore, contribution: coordinationScore * WEIGHTS.COORDINATION },
      { name: 'patterns', weight: WEIGHTS.PATTERN, value: maxPatternScore, contribution: maxPatternScore * WEIGHTS.PATTERN },
      { name: 'reliability', weight: WEIGHTS.RELIABILITY, value: 1 - sourceReliability, contribution: (1 - sourceReliability) * WEIGHTS.RELIABILITY }
    ];

    return {
      entityId,
      score: rawScore,
      probability: rawScore, // Simplification for CI scoring
      riskLevel,
      factors,
      timestamp: new Date()
    };
  }
}

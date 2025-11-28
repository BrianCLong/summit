/**
 * Trust Score Model
 * Manages trust scoring and history for intelligence sources
 */

export interface TrustEvent {
  timestamp: Date;
  event: string;
  impact: number;
  reason?: string;
}

export interface TrustScore {
  sourceId: string;
  overallScore: number;
  accuracyScore: number;
  consistencyScore: number;
  timelinessScore: number;
  history: TrustEvent[];
  lastUpdated: Date;
}

export interface TrustConfig {
  decayRate: number; // Per-day decay
  accuracyWeight: number;
  consistencyWeight: number;
  timelinessWeight: number;
  minScore: number;
  maxScore: number;
}

const DEFAULT_CONFIG: TrustConfig = {
  decayRate: 0.01,
  accuracyWeight: 0.5,
  consistencyWeight: 0.3,
  timelinessWeight: 0.2,
  minScore: 0.0,
  maxScore: 1.0,
};

export class TrustScoreFactory {
  static create(sourceId: string, initialScore: number = 0.5): TrustScore {
    return {
      sourceId,
      overallScore: initialScore,
      accuracyScore: initialScore,
      consistencyScore: initialScore,
      timelinessScore: initialScore,
      history: [
        {
          timestamp: new Date(),
          event: 'INITIALIZED',
          impact: 0,
          reason: 'Source registered',
        },
      ],
      lastUpdated: new Date(),
    };
  }

  static calculateOverall(
    score: TrustScore,
    config: TrustConfig = DEFAULT_CONFIG,
  ): number {
    const weighted =
      score.accuracyScore * config.accuracyWeight +
      score.consistencyScore * config.consistencyWeight +
      score.timelinessScore * config.timelinessWeight;

    return Math.max(
      config.minScore,
      Math.min(config.maxScore, weighted),
    );
  }

  static recordAccuratePrediction(
    score: TrustScore,
    predictionId: string,
  ): TrustScore {
    const impact = 0.05;
    const newAccuracy = Math.min(1, score.accuracyScore + impact);

    return {
      ...score,
      accuracyScore: newAccuracy,
      overallScore: TrustScoreFactory.calculateOverall({
        ...score,
        accuracyScore: newAccuracy,
      }),
      history: [
        ...score.history,
        {
          timestamp: new Date(),
          event: 'ACCURATE_PREDICTION',
          impact,
          reason: `Prediction ${predictionId} verified as accurate`,
        },
      ],
      lastUpdated: new Date(),
    };
  }

  static recordInaccuratePrediction(
    score: TrustScore,
    predictionId: string,
    severity: number = 1,
  ): TrustScore {
    const impact = -0.1 * severity;
    const newAccuracy = Math.max(0, score.accuracyScore + impact);

    return {
      ...score,
      accuracyScore: newAccuracy,
      overallScore: TrustScoreFactory.calculateOverall({
        ...score,
        accuracyScore: newAccuracy,
      }),
      history: [
        ...score.history,
        {
          timestamp: new Date(),
          event: 'INACCURATE_PREDICTION',
          impact,
          reason: `Prediction ${predictionId} was inaccurate (severity: ${severity})`,
        },
      ],
      lastUpdated: new Date(),
    };
  }

  static recordConsistencyEvent(
    score: TrustScore,
    isConsistent: boolean,
  ): TrustScore {
    const impact = isConsistent ? 0.02 : -0.05;
    const newConsistency = Math.max(
      0,
      Math.min(1, score.consistencyScore + impact),
    );

    return {
      ...score,
      consistencyScore: newConsistency,
      overallScore: TrustScoreFactory.calculateOverall({
        ...score,
        consistencyScore: newConsistency,
      }),
      history: [
        ...score.history,
        {
          timestamp: new Date(),
          event: isConsistent ? 'CONSISTENT_SIGNAL' : 'INCONSISTENT_SIGNAL',
          impact,
        },
      ],
      lastUpdated: new Date(),
    };
  }

  static recordTimeliness(
    score: TrustScore,
    responseTimeMs: number,
    expectedTimeMs: number,
  ): TrustScore {
    const ratio = responseTimeMs / expectedTimeMs;
    let impact: number;

    if (ratio <= 1) {
      impact = 0.02; // On time or early
    } else if (ratio <= 2) {
      impact = -0.02; // Slightly late
    } else {
      impact = -0.1; // Very late
    }

    const newTimeliness = Math.max(
      0,
      Math.min(1, score.timelinessScore + impact),
    );

    return {
      ...score,
      timelinessScore: newTimeliness,
      overallScore: TrustScoreFactory.calculateOverall({
        ...score,
        timelinessScore: newTimeliness,
      }),
      history: [
        ...score.history,
        {
          timestamp: new Date(),
          event: 'TIMELINESS_RECORDED',
          impact,
          reason: `Response: ${responseTimeMs}ms, Expected: ${expectedTimeMs}ms`,
        },
      ],
      lastUpdated: new Date(),
    };
  }

  static applyDecay(
    score: TrustScore,
    daysSinceLastActivity: number,
    config: TrustConfig = DEFAULT_CONFIG,
  ): TrustScore {
    const decayFactor = Math.pow(1 - config.decayRate, daysSinceLastActivity);

    return {
      ...score,
      accuracyScore: score.accuracyScore * decayFactor,
      consistencyScore: score.consistencyScore * decayFactor,
      timelinessScore: score.timelinessScore * decayFactor,
      overallScore:
        TrustScoreFactory.calculateOverall(score, config) * decayFactor,
      history: [
        ...score.history,
        {
          timestamp: new Date(),
          event: 'DECAY_APPLIED',
          impact: -(1 - decayFactor),
          reason: `${daysSinceLastActivity} days of inactivity`,
        },
      ],
      lastUpdated: new Date(),
    };
  }

  static manualAdjustment(
    score: TrustScore,
    adjustment: number,
    reason: string,
  ): TrustScore {
    const newOverall = Math.max(0, Math.min(1, score.overallScore + adjustment));

    return {
      ...score,
      overallScore: newOverall,
      history: [
        ...score.history,
        {
          timestamp: new Date(),
          event: 'MANUAL_ADJUSTMENT',
          impact: adjustment,
          reason,
        },
      ],
      lastUpdated: new Date(),
    };
  }
}

export function getTrustLevel(score: TrustScore): string {
  if (score.overallScore >= 0.9) return 'HIGHLY_TRUSTED';
  if (score.overallScore >= 0.7) return 'TRUSTED';
  if (score.overallScore >= 0.5) return 'NEUTRAL';
  if (score.overallScore >= 0.3) return 'LOW_TRUST';
  return 'UNTRUSTED';
}

export function shouldIncludeSource(
  score: TrustScore,
  minTrust: number = 0.3,
): boolean {
  return score.overallScore >= minTrust;
}

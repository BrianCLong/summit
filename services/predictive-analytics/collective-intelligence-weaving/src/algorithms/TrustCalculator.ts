/**
 * Trust Calculator Algorithm
 * Calculates and updates trust scores for intelligence sources
 */

import { TrustScore, TrustScoreFactory, TrustEvent } from '../models/TrustScore.js';
import { PredictiveSignal } from '../models/PredictiveSignal.js';
import { IntelligenceSource } from '../models/IntelligenceSource.js';

export interface TrustCalculatorConfig {
  accuracyWeight: number;
  consistencyWeight: number;
  timelinessWeight: number;
  decayRate: number; // Daily decay
  verificationWindow: number; // Hours to wait for verification
  minSignalsForReliability: number;
}

export interface PredictionVerification {
  signalId: string;
  wasAccurate: boolean;
  actualValue: unknown;
  verifiedAt: Date;
  accuracy: number; // 0-1 for partial accuracy
}

export class TrustCalculator {
  private config: TrustCalculatorConfig;
  private verificationHistory: Map<string, PredictionVerification[]> = new Map();
  private signalHistory: Map<string, PredictiveSignal[]> = new Map();

  constructor(config?: Partial<TrustCalculatorConfig>) {
    this.config = {
      accuracyWeight: 0.5,
      consistencyWeight: 0.3,
      timelinessWeight: 0.2,
      decayRate: 0.01,
      verificationWindow: 24,
      minSignalsForReliability: 5,
      ...config,
    };
  }

  recordSignal(signal: PredictiveSignal): void {
    const history = this.signalHistory.get(signal.sourceId) || [];
    this.signalHistory.set(signal.sourceId, [...history, signal]);
  }

  verifyPrediction(
    sourceId: string,
    signalId: string,
    actualValue: unknown,
    wasAccurate: boolean,
    accuracy: number = wasAccurate ? 1 : 0,
  ): void {
    const verifications = this.verificationHistory.get(sourceId) || [];
    this.verificationHistory.set(sourceId, [
      ...verifications,
      {
        signalId,
        wasAccurate,
        actualValue,
        verifiedAt: new Date(),
        accuracy,
      },
    ]);
  }

  calculateTrustScore(
    sourceId: string,
    existingScore?: TrustScore,
  ): TrustScore {
    const verifications = this.verificationHistory.get(sourceId) || [];
    const signals = this.signalHistory.get(sourceId) || [];

    let score = existingScore || TrustScoreFactory.create(sourceId);

    // Calculate accuracy score
    if (verifications.length >= this.config.minSignalsForReliability) {
      const accuracySum = verifications.reduce(
        (sum, v) => sum + v.accuracy,
        0,
      );
      score = {
        ...score,
        accuracyScore: accuracySum / verifications.length,
      };
    }

    // Calculate consistency score
    score = {
      ...score,
      consistencyScore: this.calculateConsistency(signals),
    };

    // Calculate timeliness score
    score = {
      ...score,
      timelinessScore: this.calculateTimeliness(signals),
    };

    // Calculate overall score
    score = {
      ...score,
      overallScore: this.calculateOverallScore(score),
      lastUpdated: new Date(),
    };

    return score;
  }

  private calculateConsistency(signals: PredictiveSignal[]): number {
    if (signals.length < 2) return 0.5;

    // Group signals by domain
    const domainSignals = new Map<string, PredictiveSignal[]>();
    for (const signal of signals) {
      const existing = domainSignals.get(signal.domain) || [];
      domainSignals.set(signal.domain, [...existing, signal]);
    }

    let totalConsistency = 0;
    let domainCount = 0;

    for (const [_domain, dSignals] of domainSignals) {
      if (dSignals.length < 2) continue;

      // Check prediction consistency within domain
      let consistentPairs = 0;
      let totalPairs = 0;

      for (let i = 0; i < dSignals.length - 1; i++) {
        for (let j = i + 1; j < dSignals.length; j++) {
          totalPairs++;
          if (
            JSON.stringify(dSignals[i].prediction) ===
            JSON.stringify(dSignals[j].prediction)
          ) {
            consistentPairs++;
          }
        }
      }

      totalConsistency += totalPairs > 0 ? consistentPairs / totalPairs : 0.5;
      domainCount++;
    }

    return domainCount > 0 ? totalConsistency / domainCount : 0.5;
  }

  private calculateTimeliness(signals: PredictiveSignal[]): number {
    if (signals.length === 0) return 0.5;

    const now = Date.now();
    let timelinessSum = 0;

    for (const signal of signals) {
      // Signals that arrive before their horizon expires are timely
      const remainingHorizon =
        signal.timestamp.getTime() +
        signal.horizon * 3600000 -
        now;

      if (remainingHorizon > 0) {
        // Signal is still valid
        const totalHorizon = signal.horizon * 3600000;
        const validRatio = remainingHorizon / totalHorizon;
        timelinessSum += Math.min(1, validRatio + 0.5);
      } else {
        // Signal has expired
        timelinessSum += 0.3;
      }
    }

    return timelinessSum / signals.length;
  }

  private calculateOverallScore(score: TrustScore): number {
    return (
      score.accuracyScore * this.config.accuracyWeight +
      score.consistencyScore * this.config.consistencyWeight +
      score.timelinessScore * this.config.timelinessWeight
    );
  }

  applyDecay(score: TrustScore, daysSinceActivity: number): TrustScore {
    const decayFactor = Math.pow(
      1 - this.config.decayRate,
      daysSinceActivity,
    );

    const newHistory: TrustEvent[] = [
      ...score.history,
      {
        timestamp: new Date(),
        event: 'DECAY_APPLIED',
        impact: -(1 - decayFactor) * score.overallScore,
        reason: `${daysSinceActivity} days inactive`,
      },
    ];

    return {
      ...score,
      accuracyScore: score.accuracyScore * decayFactor,
      consistencyScore: score.consistencyScore * decayFactor,
      timelinessScore: score.timelinessScore * decayFactor,
      overallScore: score.overallScore * decayFactor,
      history: newHistory,
      lastUpdated: new Date(),
    };
  }

  getSourceRanking(
    scores: TrustScore[],
  ): Array<{ sourceId: string; rank: number; score: number }> {
    const sorted = [...scores].sort(
      (a, b) => b.overallScore - a.overallScore,
    );

    return sorted.map((score, index) => ({
      sourceId: score.sourceId,
      rank: index + 1,
      score: score.overallScore,
    }));
  }

  identifyUnreliableSources(
    scores: TrustScore[],
    threshold: number = 0.3,
  ): TrustScore[] {
    return scores.filter((s) => s.overallScore < threshold);
  }

  calculateSourceAgreement(
    sourceId1: string,
    sourceId2: string,
  ): number {
    const signals1 = this.signalHistory.get(sourceId1) || [];
    const signals2 = this.signalHistory.get(sourceId2) || [];

    // Find overlapping domains
    const domains1 = new Set(signals1.map((s) => s.domain));
    const domains2 = new Set(signals2.map((s) => s.domain));
    const commonDomains = [...domains1].filter((d) => domains2.has(d));

    if (commonDomains.length === 0) return 0.5; // No overlap, neutral

    let totalAgreement = 0;
    for (const domain of commonDomains) {
      const d1Signals = signals1.filter((s) => s.domain === domain);
      const d2Signals = signals2.filter((s) => s.domain === domain);

      // Compare latest predictions
      const latest1 = d1Signals.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )[0];
      const latest2 = d2Signals.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )[0];

      if (latest1 && latest2) {
        totalAgreement +=
          JSON.stringify(latest1.prediction) ===
          JSON.stringify(latest2.prediction)
            ? 1
            : 0;
      }
    }

    return totalAgreement / commonDomains.length;
  }
}

export function createTrustCalculator(
  config?: Partial<TrustCalculatorConfig>,
): TrustCalculator {
  return new TrustCalculator(config);
}

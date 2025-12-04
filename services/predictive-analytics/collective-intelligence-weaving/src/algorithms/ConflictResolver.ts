/**
 * Conflict Resolver Algorithm
 * Resolves conflicts between divergent predictive signals
 */

import { PredictiveSignal } from '../models/PredictiveSignal.js';
import { IntelligenceSource } from '../models/IntelligenceSource.js';
import { TrustScore } from '../models/TrustScore.js';
import { ConflictResolution, ResolutionMethod } from '../models/SignalBraid.js';

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictingSignals: PredictiveSignal[];
  divergenceScore: number;
  suggestedMethod: ResolutionMethod;
}

export interface ConflictResolverConfig {
  divergenceThreshold: number;
  requireExpertForHighConflict: boolean;
  highConflictThreshold: number;
}

export class ConflictResolver {
  constructor(
    private config: ConflictResolverConfig = {
      divergenceThreshold: 0.3,
      requireExpertForHighConflict: true,
      highConflictThreshold: 0.7,
    },
  ) {}

  detectConflicts(
    signals: PredictiveSignal[],
  ): ConflictDetectionResult {
    if (signals.length <= 1) {
      return {
        hasConflict: false,
        conflictingSignals: [],
        divergenceScore: 0,
        suggestedMethod: ResolutionMethod.TRUST_WEIGHTED_AVERAGE,
      };
    }

    // Group by prediction value
    const predictionGroups = new Map<string, PredictiveSignal[]>();
    for (const signal of signals) {
      const key = JSON.stringify(signal.prediction);
      const group = predictionGroups.get(key) || [];
      predictionGroups.set(key, [...group, signal]);
    }

    // Calculate divergence
    const numGroups = predictionGroups.size;
    const divergenceScore = (numGroups - 1) / Math.max(signals.length - 1, 1);

    if (divergenceScore < this.config.divergenceThreshold) {
      return {
        hasConflict: false,
        conflictingSignals: [],
        divergenceScore,
        suggestedMethod: ResolutionMethod.TRUST_WEIGHTED_AVERAGE,
      };
    }

    // Find conflicting signals (minority groups)
    const sortedGroups = [...predictionGroups.values()].sort(
      (a, b) => b.length - a.length,
    );
    const conflictingSignals = sortedGroups.slice(1).flat();

    return {
      hasConflict: true,
      conflictingSignals,
      divergenceScore,
      suggestedMethod: this.suggestResolutionMethod(divergenceScore, signals),
    };
  }

  private suggestResolutionMethod(
    divergenceScore: number,
    signals: PredictiveSignal[],
  ): ResolutionMethod {
    if (
      divergenceScore >= this.config.highConflictThreshold &&
      this.config.requireExpertForHighConflict
    ) {
      return ResolutionMethod.EXPERT_OVERRIDE;
    }

    // Check if signals have temporal ordering
    const timestamps = signals.map((s) => s.timestamp.getTime());
    const hasTemporalSpread =
      Math.max(...timestamps) - Math.min(...timestamps) > 3600000; // 1 hour

    if (hasTemporalSpread) {
      return ResolutionMethod.TEMPORAL_PRIORITY;
    }

    // Default to Bayesian fusion for moderate conflicts
    if (divergenceScore >= 0.5) {
      return ResolutionMethod.BAYESIAN_FUSION;
    }

    return ResolutionMethod.TRUST_WEIGHTED_AVERAGE;
  }

  resolve(
    conflictingSignals: PredictiveSignal[],
    method: ResolutionMethod,
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
    expertOverride?: unknown,
  ): ConflictResolution {
    let resolvedValue: unknown;
    let confidence: number;
    let reasoning: string;

    switch (method) {
      case ResolutionMethod.TRUST_WEIGHTED_AVERAGE:
        ({ resolvedValue, confidence, reasoning } = this.trustWeightedResolve(
          conflictingSignals,
          trustScores,
        ));
        break;

      case ResolutionMethod.MAJORITY_VOTE:
        ({ resolvedValue, confidence, reasoning } = this.majorityVoteResolve(
          conflictingSignals,
        ));
        break;

      case ResolutionMethod.BAYESIAN_FUSION:
        ({ resolvedValue, confidence, reasoning } = this.bayesianResolve(
          conflictingSignals,
          trustScores,
        ));
        break;

      case ResolutionMethod.EXPERT_OVERRIDE:
        if (expertOverride === undefined) {
          throw new Error('Expert override requires explicit value');
        }
        resolvedValue = expertOverride;
        confidence = 0.95;
        reasoning = 'Expert override applied';
        break;

      case ResolutionMethod.TEMPORAL_PRIORITY:
        ({ resolvedValue, confidence, reasoning } = this.temporalResolve(
          conflictingSignals,
        ));
        break;

      case ResolutionMethod.DOMAIN_AUTHORITY:
        ({ resolvedValue, confidence, reasoning } = this.domainAuthorityResolve(
          conflictingSignals,
          sources,
          trustScores,
        ));
        break;

      default:
        ({ resolvedValue, confidence, reasoning } = this.trustWeightedResolve(
          conflictingSignals,
          trustScores,
        ));
    }

    return {
      id: crypto.randomUUID(),
      conflictingSignalIds: conflictingSignals.map((s) => s.id),
      resolvedValue,
      resolutionMethod: method,
      confidence,
      reasoning,
      resolvedAt: new Date(),
    };
  }

  private trustWeightedResolve(
    signals: PredictiveSignal[],
    trustScores: Map<string, TrustScore>,
  ): { resolvedValue: unknown; confidence: number; reasoning: string } {
    const weightedVotes = new Map<string, number>();
    let totalWeight = 0;

    for (const signal of signals) {
      const trust = trustScores.get(signal.sourceId);
      const weight = (trust?.overallScore ?? 0.5) * signal.confidence;
      const key = JSON.stringify(signal.prediction);
      weightedVotes.set(key, (weightedVotes.get(key) || 0) + weight);
      totalWeight += weight;
    }

    let maxWeight = 0;
    let resolvedValue: unknown;
    for (const [key, weight] of weightedVotes) {
      if (weight > maxWeight) {
        maxWeight = weight;
        resolvedValue = JSON.parse(key);
      }
    }

    return {
      resolvedValue,
      confidence: totalWeight > 0 ? maxWeight / totalWeight : 0,
      reasoning: `Trust-weighted resolution from ${signals.length} signals`,
    };
  }

  private majorityVoteResolve(
    signals: PredictiveSignal[],
  ): { resolvedValue: unknown; confidence: number; reasoning: string } {
    const votes = new Map<string, number>();

    for (const signal of signals) {
      const key = JSON.stringify(signal.prediction);
      votes.set(key, (votes.get(key) || 0) + 1);
    }

    let maxVotes = 0;
    let resolvedValue: unknown;
    for (const [key, voteCount] of votes) {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        resolvedValue = JSON.parse(key);
      }
    }

    return {
      resolvedValue,
      confidence: maxVotes / signals.length,
      reasoning: `Majority vote: ${maxVotes}/${signals.length} signals agreed`,
    };
  }

  private bayesianResolve(
    signals: PredictiveSignal[],
    trustScores: Map<string, TrustScore>,
  ): { resolvedValue: unknown; confidence: number; reasoning: string } {
    const posteriors = new Map<string, number>();
    const uniquePredictions = new Set(
      signals.map((s) => JSON.stringify(s.prediction)),
    );
    const prior = 1 / uniquePredictions.size;

    for (const signal of signals) {
      const key = JSON.stringify(signal.prediction);
      const trust = trustScores.get(signal.sourceId);
      const likelihood = (trust?.accuracyScore ?? 0.5) * signal.confidence;

      const currentPosterior = posteriors.get(key) ?? prior;
      const evidence =
        currentPosterior * likelihood +
        (1 - currentPosterior) * (1 - likelihood);
      const newPosterior = (currentPosterior * likelihood) / evidence;

      posteriors.set(key, newPosterior);
    }

    let maxPosterior = 0;
    let resolvedValue: unknown;
    for (const [key, posterior] of posteriors) {
      if (posterior > maxPosterior) {
        maxPosterior = posterior;
        resolvedValue = JSON.parse(key);
      }
    }

    return {
      resolvedValue,
      confidence: maxPosterior,
      reasoning: `Bayesian fusion with posterior probability ${maxPosterior.toFixed(3)}`,
    };
  }

  private temporalResolve(
    signals: PredictiveSignal[],
  ): { resolvedValue: unknown; confidence: number; reasoning: string } {
    // Most recent signal wins, weighted by confidence
    const sorted = [...signals].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    const mostRecent = sorted[0];
    const secondMostRecent = sorted[1];

    // Confidence decreases if most recent disagrees with second most recent
    let confidence = mostRecent.confidence;
    if (
      secondMostRecent &&
      JSON.stringify(mostRecent.prediction) !==
        JSON.stringify(secondMostRecent.prediction)
    ) {
      confidence *= 0.8;
    }

    return {
      resolvedValue: mostRecent.prediction,
      confidence,
      reasoning: `Temporal priority: most recent signal from ${mostRecent.timestamp.toISOString()}`,
    };
  }

  private domainAuthorityResolve(
    signals: PredictiveSignal[],
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
  ): { resolvedValue: unknown; confidence: number; reasoning: string } {
    // Find the most authoritative source for this domain
    let maxAuthority = 0;
    let authoritySignal: PredictiveSignal | null = null;

    for (const signal of signals) {
      const source = sources.get(signal.sourceId);
      const trust = trustScores.get(signal.sourceId);

      if (!source || !trust) continue;

      // Authority = trust * reliability * confidence
      const authority =
        trust.overallScore * source.reliability * signal.confidence;

      if (authority > maxAuthority) {
        maxAuthority = authority;
        authoritySignal = signal;
      }
    }

    if (!authoritySignal) {
      return this.trustWeightedResolve(signals, trustScores);
    }

    return {
      resolvedValue: authoritySignal.prediction,
      confidence: maxAuthority,
      reasoning: `Domain authority: source ${authoritySignal.sourceId} with authority score ${maxAuthority.toFixed(3)}`,
    };
  }
}

export function createConflictResolver(
  config?: Partial<ConflictResolverConfig>,
): ConflictResolver {
  return new ConflictResolver(config);
}

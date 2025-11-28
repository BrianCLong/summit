/**
 * Signal Fuser Algorithm
 * Fuses distributed signals from multiple intelligence sources
 */

import { PredictiveSignal, getWeightedPrediction } from '../models/PredictiveSignal.js';
import { IntelligenceSource, getSourceWeight } from '../models/IntelligenceSource.js';
import { TrustScore } from '../models/TrustScore.js';

export enum FusionMethod {
  DEMPSTER_SHAFER = 'DEMPSTER_SHAFER',
  KALMAN_FILTER = 'KALMAN_FILTER',
  BAYESIAN_NETWORK = 'BAYESIAN_NETWORK',
  ENSEMBLE_VOTING = 'ENSEMBLE_VOTING',
  ATTENTION_WEIGHTED = 'ATTENTION_WEIGHTED',
}

export interface FusionResult {
  fusedPrediction: unknown;
  confidence: number;
  contributingSources: string[];
  method: FusionMethod;
  metadata: Record<string, unknown>;
}

export interface FusionConfig {
  method: FusionMethod;
  minSources: number;
  conflictThreshold: number;
  temporalWeight: number;
}

export class SignalFuser {
  constructor(private config: FusionConfig) {}

  fuse(
    signals: PredictiveSignal[],
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
  ): FusionResult {
    if (signals.length === 0) {
      throw new Error('No signals to fuse');
    }

    if (signals.length < this.config.minSources) {
      throw new Error(
        `Insufficient sources: ${signals.length} < ${this.config.minSources}`,
      );
    }

    switch (this.config.method) {
      case FusionMethod.DEMPSTER_SHAFER:
        return this.dempsterShaferFusion(signals, sources, trustScores);
      case FusionMethod.KALMAN_FILTER:
        return this.kalmanFilterFusion(signals, sources, trustScores);
      case FusionMethod.BAYESIAN_NETWORK:
        return this.bayesianFusion(signals, sources, trustScores);
      case FusionMethod.ENSEMBLE_VOTING:
        return this.ensembleVotingFusion(signals, sources, trustScores);
      case FusionMethod.ATTENTION_WEIGHTED:
        return this.attentionWeightedFusion(signals, sources, trustScores);
      default:
        return this.ensembleVotingFusion(signals, sources, trustScores);
    }
  }

  private dempsterShaferFusion(
    signals: PredictiveSignal[],
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
  ): FusionResult {
    // Dempster-Shafer evidence combination
    const beliefs = new Map<string, number>();
    let totalMass = 0;

    for (const signal of signals) {
      const source = sources.get(signal.sourceId);
      const trust = trustScores.get(signal.sourceId);
      if (!source || !trust) continue;

      const mass = signal.confidence * trust.overallScore;
      const key = JSON.stringify(signal.prediction);
      beliefs.set(key, (beliefs.get(key) || 0) + mass);
      totalMass += mass;
    }

    // Normalize and find maximum belief
    let maxBelief = 0;
    let fusedPrediction: unknown = null;

    for (const [key, belief] of beliefs) {
      const normalizedBelief = totalMass > 0 ? belief / totalMass : 0;
      if (normalizedBelief > maxBelief) {
        maxBelief = normalizedBelief;
        fusedPrediction = JSON.parse(key);
      }
    }

    return {
      fusedPrediction,
      confidence: maxBelief,
      contributingSources: signals.map((s) => s.sourceId),
      method: FusionMethod.DEMPSTER_SHAFER,
      metadata: {
        beliefDistribution: Object.fromEntries(beliefs),
        conflictMass: 1 - totalMass,
      },
    };
  }

  private kalmanFilterFusion(
    signals: PredictiveSignal[],
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
  ): FusionResult {
    // Simplified Kalman filter for numeric predictions
    const numericSignals = signals.filter(
      (s) => typeof s.prediction === 'number',
    );

    if (numericSignals.length === 0) {
      return this.ensembleVotingFusion(signals, sources, trustScores);
    }

    let estimate = 0;
    let variance = 1;

    for (const signal of numericSignals) {
      const trust = trustScores.get(signal.sourceId);
      const measurementVariance = trust
        ? 1 / (trust.overallScore * signal.confidence + 0.001)
        : 1;

      // Kalman gain
      const gain = variance / (variance + measurementVariance);

      // Update estimate
      estimate = estimate + gain * ((signal.prediction as number) - estimate);

      // Update variance
      variance = (1 - gain) * variance;
    }

    return {
      fusedPrediction: estimate,
      confidence: 1 / (1 + variance),
      contributingSources: numericSignals.map((s) => s.sourceId),
      method: FusionMethod.KALMAN_FILTER,
      metadata: {
        finalVariance: variance,
        kalmanGains: numericSignals.length,
      },
    };
  }

  private bayesianFusion(
    signals: PredictiveSignal[],
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
  ): FusionResult {
    // Bayesian belief combination with prior
    const hypotheses = new Map<string, number>();
    const prior = 1 / new Set(signals.map((s) => JSON.stringify(s.prediction))).size;

    for (const signal of signals) {
      const key = JSON.stringify(signal.prediction);
      const trust = trustScores.get(signal.sourceId);
      const likelihood = trust
        ? signal.confidence * trust.accuracyScore
        : signal.confidence * 0.5;

      const currentPosterior = hypotheses.get(key) || prior;
      const newPosterior = (currentPosterior * likelihood) /
        (currentPosterior * likelihood + (1 - currentPosterior) * (1 - likelihood));

      hypotheses.set(key, newPosterior);
    }

    // Find MAP estimate
    let maxPosterior = 0;
    let fusedPrediction: unknown = null;

    for (const [key, posterior] of hypotheses) {
      if (posterior > maxPosterior) {
        maxPosterior = posterior;
        fusedPrediction = JSON.parse(key);
      }
    }

    return {
      fusedPrediction,
      confidence: maxPosterior,
      contributingSources: signals.map((s) => s.sourceId),
      method: FusionMethod.BAYESIAN_NETWORK,
      metadata: {
        posteriorDistribution: Object.fromEntries(hypotheses),
      },
    };
  }

  private ensembleVotingFusion(
    signals: PredictiveSignal[],
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
  ): FusionResult {
    // Weighted majority voting
    const weights = new Map<string, number>();
    for (const signal of signals) {
      const source = sources.get(signal.sourceId);
      const trust = trustScores.get(signal.sourceId);
      const weight = source && trust
        ? getSourceWeight(source) * trust.overallScore
        : 0.5;
      weights.set(signal.sourceId, weight);
    }

    const fusedPrediction = getWeightedPrediction(signals, weights);

    // Calculate confidence based on agreement
    const votes = new Map<string, number>();
    let totalWeight = 0;

    for (const signal of signals) {
      const key = JSON.stringify(signal.prediction);
      const weight = weights.get(signal.sourceId) || 0.5;
      votes.set(key, (votes.get(key) || 0) + weight);
      totalWeight += weight;
    }

    const winningVotes = Math.max(...votes.values());
    const confidence = totalWeight > 0 ? winningVotes / totalWeight : 0;

    return {
      fusedPrediction,
      confidence,
      contributingSources: signals.map((s) => s.sourceId),
      method: FusionMethod.ENSEMBLE_VOTING,
      metadata: {
        voteDistribution: Object.fromEntries(votes),
        totalWeight,
      },
    };
  }

  private attentionWeightedFusion(
    signals: PredictiveSignal[],
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
  ): FusionResult {
    // Attention mechanism based on recency and trust
    const now = Date.now();
    const attentionWeights = new Map<string, number>();
    let totalAttention = 0;

    for (const signal of signals) {
      const trust = trustScores.get(signal.sourceId);
      const source = sources.get(signal.sourceId);

      // Temporal decay - more recent signals get higher attention
      const age = (now - signal.timestamp.getTime()) / 3600000; // hours
      const temporalWeight = Math.exp(-age * this.config.temporalWeight);

      // Trust-based attention
      const trustWeight = trust ? trust.overallScore : 0.5;

      // Confidence-based attention
      const confWeight = signal.confidence;

      const attention = temporalWeight * trustWeight * confWeight;
      attentionWeights.set(signal.id, attention);
      totalAttention += attention;
    }

    // Normalize attention weights
    for (const [id, weight] of attentionWeights) {
      attentionWeights.set(id, weight / (totalAttention || 1));
    }

    // Weighted combination
    const numericSignals = signals.filter(
      (s) => typeof s.prediction === 'number',
    );

    let fusedPrediction: unknown;
    if (numericSignals.length === signals.length) {
      fusedPrediction = signals.reduce((sum, s) => {
        const attention = attentionWeights.get(s.id) || 0;
        return sum + (s.prediction as number) * attention;
      }, 0);
    } else {
      // Categorical - attention-weighted voting
      const votes = new Map<string, number>();
      for (const signal of signals) {
        const key = JSON.stringify(signal.prediction);
        const attention = attentionWeights.get(signal.id) || 0;
        votes.set(key, (votes.get(key) || 0) + attention);
      }

      let maxVote = 0;
      for (const [key, vote] of votes) {
        if (vote > maxVote) {
          maxVote = vote;
          fusedPrediction = JSON.parse(key);
        }
      }
    }

    return {
      fusedPrediction,
      confidence: Math.max(...attentionWeights.values()),
      contributingSources: signals.map((s) => s.sourceId),
      method: FusionMethod.ATTENTION_WEIGHTED,
      metadata: {
        attentionWeights: Object.fromEntries(attentionWeights),
      },
    };
  }
}

export function createFuser(config?: Partial<FusionConfig>): SignalFuser {
  const defaultConfig: FusionConfig = {
    method: FusionMethod.ENSEMBLE_VOTING,
    minSources: 1,
    conflictThreshold: 0.3,
    temporalWeight: 0.1,
  };

  return new SignalFuser({ ...defaultConfig, ...config });
}

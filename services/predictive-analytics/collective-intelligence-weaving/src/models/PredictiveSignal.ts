/**
 * Predictive Signal Model
 * Represents an individual prediction from an intelligence source
 */

export interface PredictiveSignal {
  id: string;
  sourceId: string;
  prediction: unknown;
  confidence: number;
  timestamp: Date;
  horizon: number; // Hours into the future
  domain: string;
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

export interface SubmitSignalInput {
  sourceId: string;
  prediction: unknown;
  confidence: number;
  horizon: number;
  domain: string;
  evidence?: string[];
}

export class PredictiveSignalFactory {
  static create(input: SubmitSignalInput): PredictiveSignal {
    return {
      id: crypto.randomUUID(),
      sourceId: input.sourceId,
      prediction: input.prediction,
      confidence: Math.max(0, Math.min(1, input.confidence)),
      timestamp: new Date(),
      horizon: Math.max(1, input.horizon),
      domain: input.domain,
      evidence: input.evidence,
    };
  }

  static validate(signal: PredictiveSignal): boolean {
    if (!signal.id || !signal.sourceId || !signal.domain) {
      return false;
    }
    if (signal.confidence < 0 || signal.confidence > 1) {
      return false;
    }
    if (signal.horizon <= 0) {
      return false;
    }
    return true;
  }

  static isExpired(signal: PredictiveSignal): boolean {
    const expirationTime =
      signal.timestamp.getTime() + signal.horizon * 3600000;
    return Date.now() > expirationTime;
  }

  static getRemainingHorizon(signal: PredictiveSignal): number {
    const elapsed =
      (Date.now() - signal.timestamp.getTime()) / 3600000;
    return Math.max(0, signal.horizon - elapsed);
  }

  static adjustConfidence(
    signal: PredictiveSignal,
    sourceTrust: number,
  ): PredictiveSignal {
    // Weighted confidence based on source trust
    const adjustedConfidence = signal.confidence * sourceTrust;
    return {
      ...signal,
      confidence: adjustedConfidence,
    };
  }
}

export interface SignalGroup {
  domain: string;
  signals: PredictiveSignal[];
  averageConfidence: number;
  consensusLevel: number;
}

export function groupSignalsByDomain(
  signals: PredictiveSignal[],
): Map<string, PredictiveSignal[]> {
  const groups = new Map<string, PredictiveSignal[]>();
  for (const signal of signals) {
    const existing = groups.get(signal.domain) || [];
    groups.set(signal.domain, [...existing, signal]);
  }
  return groups;
}

export function calculateConsensus(signals: PredictiveSignal[]): number {
  if (signals.length <= 1) return 1.0;

  // Calculate variance in predictions
  const predictions = signals.map((s) => s.prediction);
  const uniquePredictions = new Set(
    predictions.map((p) => JSON.stringify(p)),
  );

  // Higher consensus when fewer unique predictions
  return 1 - (uniquePredictions.size - 1) / signals.length;
}

export function getWeightedPrediction(
  signals: PredictiveSignal[],
  weights: Map<string, number>,
): unknown {
  if (signals.length === 0) return null;
  if (signals.length === 1) return signals[0].prediction;

  // Numeric prediction averaging
  const numericSignals = signals.filter(
    (s) => typeof s.prediction === 'number',
  );
  if (numericSignals.length === signals.length) {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const signal of numericSignals) {
      const weight = (weights.get(signal.sourceId) || 1) * signal.confidence;
      weightedSum += (signal.prediction as number) * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // Categorical prediction - weighted voting
  const votes = new Map<string, number>();
  for (const signal of signals) {
    const key = JSON.stringify(signal.prediction);
    const weight = (weights.get(signal.sourceId) || 1) * signal.confidence;
    votes.set(key, (votes.get(key) || 0) + weight);
  }

  let maxVotes = 0;
  let winner = signals[0].prediction;
  for (const [key, voteCount] of votes) {
    if (voteCount > maxVotes) {
      maxVotes = voteCount;
      winner = JSON.parse(key);
    }
  }
  return winner;
}

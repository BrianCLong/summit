/**
 * Signal Braid Model
 * Represents a braided collection of predictive signals forming a coherent strand
 */

import { PredictiveSignal } from './PredictiveSignal.js';

export interface TemporalSpan {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface ConflictResolution {
  id: string;
  conflictingSignalIds: string[];
  resolvedValue: unknown;
  resolutionMethod: ResolutionMethod;
  confidence: number;
  reasoning: string;
  resolvedAt: Date;
}

export enum ResolutionMethod {
  TRUST_WEIGHTED_AVERAGE = 'TRUST_WEIGHTED_AVERAGE',
  MAJORITY_VOTE = 'MAJORITY_VOTE',
  BAYESIAN_FUSION = 'BAYESIAN_FUSION',
  EXPERT_OVERRIDE = 'EXPERT_OVERRIDE',
  TEMPORAL_PRIORITY = 'TEMPORAL_PRIORITY',
  DOMAIN_AUTHORITY = 'DOMAIN_AUTHORITY',
}

export interface SignalBraid {
  id: string;
  signalIds: string[];
  coherence: number;
  conflicts: ConflictResolution[];
  temporalSpan: TemporalSpan;
  domains: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class SignalBraidFactory {
  static create(signals: PredictiveSignal[]): SignalBraid {
    if (signals.length === 0) {
      throw new Error('Cannot create braid from empty signals');
    }

    const now = new Date();
    const domains = [...new Set(signals.map((s) => s.domain))];
    const timestamps = signals.map((s) => s.timestamp.getTime());
    const horizons = signals.map((s) => s.horizon);

    const startTime = Math.min(...timestamps);
    const maxHorizon = Math.max(...horizons);
    const endTime = startTime + maxHorizon * 3600000; // horizon in hours

    return {
      id: crypto.randomUUID(),
      signalIds: signals.map((s) => s.id),
      coherence: SignalBraidFactory.calculateCoherence(signals),
      conflicts: [],
      temporalSpan: {
        start: new Date(startTime),
        end: new Date(endTime),
        granularity: SignalBraidFactory.inferGranularity(maxHorizon),
      },
      domains,
      createdAt: now,
      updatedAt: now,
    };
  }

  static calculateCoherence(signals: PredictiveSignal[]): number {
    if (signals.length <= 1) return 1.0;

    // Calculate pairwise agreement between signals
    let totalAgreement = 0;
    let comparisons = 0;

    for (let i = 0; i < signals.length; i++) {
      for (let j = i + 1; j < signals.length; j++) {
        const agreement = SignalBraidFactory.measureAgreement(
          signals[i],
          signals[j],
        );
        totalAgreement += agreement;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalAgreement / comparisons : 1.0;
  }

  static measureAgreement(
    signal1: PredictiveSignal,
    signal2: PredictiveSignal,
  ): number {
    // If different domains, no direct comparison
    if (signal1.domain !== signal2.domain) {
      return 0.5; // Neutral
    }

    // Compare predictions based on type
    const pred1 = signal1.prediction;
    const pred2 = signal2.prediction;

    if (typeof pred1 === 'number' && typeof pred2 === 'number') {
      // Numeric predictions - use relative difference
      const maxVal = Math.max(Math.abs(pred1), Math.abs(pred2), 1);
      const diff = Math.abs(pred1 - pred2) / maxVal;
      return Math.max(0, 1 - diff);
    }

    if (typeof pred1 === 'boolean' && typeof pred2 === 'boolean') {
      return pred1 === pred2 ? 1.0 : 0.0;
    }

    if (typeof pred1 === 'string' && typeof pred2 === 'string') {
      return pred1 === pred2 ? 1.0 : 0.0;
    }

    // Complex objects - simplified comparison
    return JSON.stringify(pred1) === JSON.stringify(pred2) ? 1.0 : 0.5;
  }

  static inferGranularity(
    horizonHours: number,
  ): 'minute' | 'hour' | 'day' | 'week' | 'month' {
    if (horizonHours <= 1) return 'minute';
    if (horizonHours <= 24) return 'hour';
    if (horizonHours <= 168) return 'day'; // 7 days
    if (horizonHours <= 720) return 'week'; // 30 days
    return 'month';
  }

  static addConflict(
    braid: SignalBraid,
    conflict: ConflictResolution,
  ): SignalBraid {
    return {
      ...braid,
      conflicts: [...braid.conflicts, conflict],
      updatedAt: new Date(),
    };
  }

  static updateCoherence(
    braid: SignalBraid,
    signals: PredictiveSignal[],
  ): SignalBraid {
    return {
      ...braid,
      coherence: SignalBraidFactory.calculateCoherence(signals),
      updatedAt: new Date(),
    };
  }
}

export function isCoherent(braid: SignalBraid, threshold: number = 0.7): boolean {
  return braid.coherence >= threshold;
}

export function hasUnresolvedConflicts(braid: SignalBraid): boolean {
  return braid.coherence < 0.5 && braid.conflicts.length === 0;
}

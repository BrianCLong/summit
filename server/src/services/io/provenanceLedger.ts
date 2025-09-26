import type { RiskComputationResult } from './riskScoring';

export interface ProvenanceSignal {
  id: string;
  verified: boolean;
  score?: number | null;
  verified_at?: string | null;
}

export interface ProvenanceHealth {
  verifiedCount: number;
  pendingCount: number;
  averageScore: number;
  lastVerifiedAt: string | null;
  gapFlag: boolean;
}

export function computeProvenanceHealth(signals: ProvenanceSignal[], risk?: RiskComputationResult): ProvenanceHealth {
  const verifiedSignals = signals.filter((signal) => signal.verified);
  const pendingSignals = signals.filter((signal) => !signal.verified);
  const averageScore =
    verifiedSignals.length === 0
      ? 0
      : verifiedSignals.reduce((acc, signal) => acc + (signal.score ?? 0), 0) / verifiedSignals.length;
  const lastVerifiedAt =
    verifiedSignals
      .map((signal) => signal.verified_at)
      .filter((timestamp): timestamp is string => Boolean(timestamp))
      .sort()
      .pop() ?? null;
  const riskPenalty = risk ? risk.riskScore * 0.3 + risk.anomalyScore * 0.2 : 0;
  const gapFlag = averageScore - riskPenalty < 0.35 || pendingSignals.length > verifiedSignals.length;

  return {
    verifiedCount: verifiedSignals.length,
    pendingCount: pendingSignals.length,
    averageScore: Number(averageScore.toFixed(2)),
    lastVerifiedAt,
    gapFlag,
  };
}

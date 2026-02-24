export interface TrustScoreInputs {
  sourceReliability: number; // 0.0 to 1.0
  agentConfidence: number;   // 0.0 to 1.0
  corroborationCount: number; // >= 0
  timestamp: Date;
}

const WEIGHTS = {
  SOURCE_RELIABILITY: 0.3,
  AGENT_CONFIDENCE: 0.3,
  CORROBORATION: 0.2,
  RECENCY: 0.2,
};

const RECENCY_HALFLIFE_HOURS = 24 * 7; // 1 week

export function calculateTrustScore(inputs: TrustScoreInputs): number {
  const { sourceReliability, agentConfidence, corroborationCount, timestamp } = inputs;

  // Normalize corroboration (diminishing returns, max at 10)
  const normalizedCorroboration = Math.min(corroborationCount, 10) / 10;

  // Calculate recency score (exponential decay)
  const hoursSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.pow(0.5, hoursSince / RECENCY_HALFLIFE_HOURS);

  const score =
    sourceReliability * WEIGHTS.SOURCE_RELIABILITY +
    agentConfidence * WEIGHTS.AGENT_CONFIDENCE +
    normalizedCorroboration * WEIGHTS.CORROBORATION +
    recencyScore * WEIGHTS.RECENCY;

  // Clamp between 0 and 1 just in case
  return Math.max(0, Math.min(1, score));
}

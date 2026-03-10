export interface ToolScoreInput {
  capabilityFit: number;
  trustScore: number;
  freshnessScore: number;
  p95LatencyMs: number;
  riskScore: number;
}

export function scoreTool(i: ToolScoreInput): number {
  return i.capabilityFit + i.trustScore + i.freshnessScore
    - (i.p95LatencyMs / 1000)
    - i.riskScore;
}

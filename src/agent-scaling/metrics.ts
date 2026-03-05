export interface AgentScalingMetrics {
  successRate: number
  latencyMs: number
  tokenCost: number
  coordinationOverhead: number
}

export function coordinationEfficiency(
  singleAgentScore: number,
  multiAgentScore: number
): number {
  return multiAgentScore - singleAgentScore
}

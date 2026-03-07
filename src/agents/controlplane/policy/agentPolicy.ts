import type { AgentDescriptor } from '../registry/agentRegistry.js';

export interface AgentPolicyDecision {
  allow: boolean;
  reasons: string[];
}

export function evaluateAgentPolicy(
  agent: AgentDescriptor,
  requiredCapabilities: string[],
): AgentPolicyDecision {
  const missingCapabilities = requiredCapabilities.filter(
    (capability) => !agent.capabilities.includes(capability),
  );

  if (missingCapabilities.length > 0) {
    return {
      allow: false,
      reasons: [`MISSING_CAPABILITIES:${missingCapabilities.join(',')}`],
    };
  }

  if (agent.riskLevel === 'high' && agent.observabilityScore !== undefined) {
    if (agent.observabilityScore < 0.8) {
      return {
        allow: false,
        reasons: ['OBSERVABILITY_SCORE_TOO_LOW'],
      };
    }
  }

  return {
    allow: true,
    reasons: [],
  };
}

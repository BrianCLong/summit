import { GovernanceDecision, PolicyResult, RiskCategory } from './types.js';
import { getRiskProfile } from './registry.js';
import { randomUUID } from 'crypto';

export interface GovernanceContext {
  tenantId: string;
  action: string;
  resource: string;
  params?: Record<string, any>;
}

export function evaluateGovernancePolicy(
  category: RiskCategory,
  context: GovernanceContext
): GovernanceDecision {
  const profile = getRiskProfile(category);

  let outcome: PolicyResult = 'DENIED';
  let reason = '';

  if (profile.allowed) {
    if (profile.color === 'yellow') {
      outcome = 'CONDITIONAL';
      reason = 'Requires human review or additional logging';
    } else {
      outcome = 'ALLOWED';
      reason = 'Low risk approved activity';
    }
  } else {
    outcome = 'DENIED';
    reason = `Category ${category} is strictly prohibited by governance policy`;
  }

  return {
    id: randomUUID(),
    tenantId: context.tenantId,
    timestamp: new Date(),
    outcome,
    reason,
    riskCategory: category
  };
}

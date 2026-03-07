import { createHash } from 'node:crypto';

const RISK_TIER_ORDER = {
  low: 1,
  med: 2,
  high: 3,
};

function stableDecisionId(payload) {
  const digest = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16);
  return `decision-${digest}`;
}

function evaluateRule(context, rule) {
  const failures = [];

  if (rule.orgId !== context.orgId) failures.push('org_mismatch');
  if (!rule.actions.includes(context.action)) failures.push('action_not_allowed');
  if (rule.actorIds && !rule.actorIds.includes(context.actorId)) failures.push('actor_not_allowed');
  if (rule.allowedTools && context.toolName && !rule.allowedTools.includes(context.toolName)) {
    failures.push('tool_not_allowlisted');
  }
  if (rule.maxTokenEstimate !== undefined && (context.tokenEstimate ?? Number.MAX_SAFE_INTEGER) > rule.maxTokenEstimate) {
    failures.push('token_budget_exceeded');
  }
  if (rule.requiredRiskTierAtMost && context.riskTier) {
    const maxAllowed = RISK_TIER_ORDER[rule.requiredRiskTierAtMost];
    const actual = RISK_TIER_ORDER[context.riskTier];
    if (actual > maxAllowed) failures.push('risk_tier_exceeded');
  }

  return failures;
}

export function evaluatePolicyContext(context, policies) {
  const reasons = [];

  if (!context.orgId) reasons.push('missing_org_id');
  if (!context.actorId) reasons.push('missing_actor_id');

  if (reasons.length > 0 || policies.length === 0) {
    return {
      decisionId: stableDecisionId({ context, reasons: [...reasons, 'deny_by_default'], policyIds: [] }),
      allowed: false,
      reasons: [...reasons, 'deny_by_default'],
      policyIds: [],
    };
  }

  for (const rule of policies) {
    const failures = evaluateRule(context, rule);
    if (failures.length === 0) {
      return {
        decisionId: stableDecisionId({ context, reasons: ['allow'], policyIds: [rule.policyId] }),
        allowed: true,
        reasons: ['allow'],
        policyIds: [rule.policyId],
      };
    }
  }

  return {
    decisionId: stableDecisionId({ context, reasons: ['deny_by_default'], policyIds: [] }),
    allowed: false,
    reasons: ['deny_by_default'],
    policyIds: [],
  };
}

import * as crypto from 'crypto';

export interface ClaimContext {
  claimId: string;
  supportScore: number;
  epistemicUncertainty: number;
  conflictScore: number;
  independentSourceCount: number;
  evidenceIds: string[];
}

export interface EpistemicPolicy {
  policyId: string;
  minSupportScore: number;
  maxEpistemicUncertainty: number;
  minIndependentSources: number;
  maxConflictScore: number;
  requireHumanApproval?: boolean;
}

export interface EpistemicDecision {
  decisionId: string;
  claimId: string;
  policyId: string;
  decision: "APPROVE" | "DEGRADE" | "BLOCK" | "ESCALATE";
  rationale: string;
  evidenceIds: string[];
}


export function evaluateEpistemicIntent(ctx: ClaimContext, policy: EpistemicPolicy): EpistemicDecision {
  // Deterministic decision ID based on inputs
  const payload = `${ctx.claimId}-${policy.policyId}-${ctx.supportScore}-${ctx.epistemicUncertainty}-${ctx.conflictScore}-${ctx.independentSourceCount}`;
  const decisionId = crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);

  const createDecision = (
    decision: "APPROVE" | "DEGRADE" | "BLOCK" | "ESCALATE",
    rationale: string
  ): EpistemicDecision => ({
    decisionId,
    claimId: ctx.claimId,
    policyId: policy.policyId,
    decision,
    rationale,
    evidenceIds: ctx.evidenceIds,
  });

  if (!ctx.evidenceIds || ctx.evidenceIds.length === 0) {
    return createDecision("BLOCK", "missing_evidence");
  }
  if (ctx.independentSourceCount < policy.minIndependentSources) {
    return createDecision("ESCALATE", "insufficient_independent_sources");
  }
  if (ctx.conflictScore > policy.maxConflictScore) {
    return createDecision("BLOCK", "active_conflict");
  }
  if (ctx.supportScore < policy.minSupportScore) {
    return createDecision("DEGRADE", "low_support");
  }
  if (ctx.epistemicUncertainty > policy.maxEpistemicUncertainty) {
      return createDecision("ESCALATE", "high_epistemic_uncertainty");
  }

  return createDecision("APPROVE", "policy_satisfied");
}

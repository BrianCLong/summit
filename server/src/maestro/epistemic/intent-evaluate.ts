export interface ClaimContext {
  claimId: string;
  evidenceIds: string[];
  independentSourceCount: number;
  conflictScore: number;
  supportScore: number;
}

export interface EpistemicPolicy {
  policyId: string;
  minIndependentSources: number;
  maxConflictScore: number;
  minSupportScore: number;
}

export interface EpistemicDecision {
  decision_id: string;
  claim_id: string;
  policy_id: string;
  decision: "APPROVE" | "DEGRADE" | "BLOCK" | "ESCALATE";
  evidence_ids: string[];
  reason?: string;
}

function generateDecisionId(): string {
  // A simple deterministic or structured ID for the context of this slice
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `EPI-osint-${date}-decision-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

export function evaluateEpistemicIntent(ctx: ClaimContext, policy: EpistemicPolicy): EpistemicDecision {
  const decision_id = generateDecisionId();

  const deny = (decision: "DEGRADE" | "BLOCK" | "ESCALATE", reason: string): EpistemicDecision => ({
    decision_id,
    claim_id: ctx.claimId,
    policy_id: policy.policyId,
    decision,
    evidence_ids: ctx.evidenceIds,
    reason
  });

  const allow = (decision: "APPROVE"): EpistemicDecision => ({
    decision_id,
    claim_id: ctx.claimId,
    policy_id: policy.policyId,
    decision,
    evidence_ids: ctx.evidenceIds
  });

  if (!ctx.evidenceIds || ctx.evidenceIds.length === 0) return deny("BLOCK", "missing_evidence");
  if (ctx.independentSourceCount < policy.minIndependentSources) return deny("ESCALATE", "insufficient_independent_sources");
  if (ctx.conflictScore > policy.maxConflictScore) return deny("BLOCK", "active_conflict");
  if (ctx.supportScore < policy.minSupportScore) return deny("DEGRADE", "low_support");

  return allow("APPROVE");
}

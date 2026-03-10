import type { ClaimRecord, PromotionProposal, WriteSet } from "../../../summit-ledger/src/types/writeset.types";
import type { PromotionAuditEntry } from "../model/promotion.types";

export interface PromotionPolicyConfig {
  minEvidenceCount: number;
  primaryEvidenceTypes: string[];
}

export interface PromotionEvaluationContext {
  writeset: WriteSet;
  proposal: PromotionProposal;
  claim?: ClaimRecord;
}

export function evaluatePromotion(
  ctx: PromotionEvaluationContext,
  config: PromotionPolicyConfig
): PromotionAuditEntry {
  const { proposal, claim, writeset } = ctx;

  if (!["BG", "NG"].includes(proposal.from_graph)) {
    return {
      promotion_id: proposal.promotion_id,
      claim_id: proposal.claim_id,
      from_graph: proposal.from_graph,
      to_graph: proposal.to_graph,
      decision: "QUARANTINE",
      reasons: ["PROMOTION_SOURCE_GRAPH_INVALID"],
    };
  }

  if (!claim) {
    return {
      promotion_id: proposal.promotion_id,
      claim_id: proposal.claim_id,
      from_graph: proposal.from_graph,
      to_graph: proposal.to_graph,
      decision: "QUARANTINE",
      reasons: ["PROMOTION_CLAIM_NOT_FOUND"],
    };
  }

  if (claim.evidence_ids.length < config.minEvidenceCount) {
    return {
      promotion_id: proposal.promotion_id,
      claim_id: proposal.claim_id,
      from_graph: proposal.from_graph,
      to_graph: proposal.to_graph,
      decision: "QUARANTINE",
      reasons: ["PROMOTION_INSUFFICIENT_EVIDENCE"],
    };
  }

  const artifactTypes = new Set(writeset.provenance.artifacts.map((a) => a.type));
  const hasPrimary = config.primaryEvidenceTypes.some((t) => artifactTypes.has(t));
  if (!hasPrimary) {
    return {
      promotion_id: proposal.promotion_id,
      claim_id: proposal.claim_id,
      from_graph: proposal.from_graph,
      to_graph: proposal.to_graph,
      decision: "QUARANTINE",
      reasons: ["PROMOTION_MISSING_PRIMARY_EVIDENCE"],
    };
  }

  return {
    promotion_id: proposal.promotion_id,
    claim_id: proposal.claim_id,
    from_graph: proposal.from_graph,
    to_graph: proposal.to_graph,
    decision: "ALLOW",
    reasons: [],
  };
}

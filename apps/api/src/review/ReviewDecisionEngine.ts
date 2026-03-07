import {
  DecisionRulesByType,
  ReviewDecision,
  ReviewDecisionAction,
  ReviewItem,
  ReviewStatus,
  ReviewType,
} from "./models.js";

const DEFAULT_RULES: DecisionRulesByType = {
  entity: { allowed: ["approve", "reject", "needs-more-info", "escalate"], requireReason: true },
  relationship: {
    allowed: ["approve", "reject", "needs-more-info", "escalate"],
    requireReason: true,
  },
  event: { allowed: ["approve", "reject", "needs-more-info", "escalate"], requireReason: true },
  quarantine: {
    allowed: ["approve", "reject", "needs-more-info", "escalate"],
    requireReason: true,
  },
};

export interface DecisionResult {
  item: ReviewItem;
  decision: ReviewDecision;
  idempotent: boolean;
}

export class ReviewDecisionEngine {
  constructor(private readonly rules: DecisionRulesByType = DEFAULT_RULES) {}

  validateAction(type: ReviewType, action: ReviewDecisionAction, reasonCode?: string) {
    const rule = this.rules[type] ?? DEFAULT_RULES[type];
    if (rule && !rule.allowed.includes(action)) {
      throw new Error(`action_not_allowed:${action}`);
    }
    if (rule?.requireReason && !reasonCode) {
      throw new Error("reason_required");
    }
  }

  applyDecision(item: ReviewItem, decision: ReviewDecision): DecisionResult {
    this.validateAction(item.type, decision.action, decision.reasonCode);

    if (item.lastDecision) {
      if (item.lastDecision.correlationId === decision.correlationId) {
        return { item, decision: item.lastDecision, idempotent: true };
      }
      throw new Error("decision_already_recorded");
    }

    const decidedAt = decision.decidedAt ?? new Date().toISOString();
    const resolved: ReviewItem = {
      ...item,
      status: "decided" satisfies ReviewStatus,
      lastDecision: { ...decision, decidedAt },
    };

    return { item: resolved, decision: resolved.lastDecision!, idempotent: false };
  }
}

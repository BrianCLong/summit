export type ReviewType = "entity" | "relationship" | "event" | "quarantine";

export type ReviewStatus = "pending" | "decided";

export type ReviewDecisionAction = "approve" | "reject" | "needs-more-info" | "escalate";

export interface ReviewItem {
  id: string;
  type: ReviewType;
  status: ReviewStatus;
  createdAt: string;
  priority?: number;
  payload?: Record<string, unknown>;
  lastDecision?: ReviewDecision;
}

export interface ReviewDecision {
  action: ReviewDecisionAction;
  reasonCode: string;
  note?: string;
  correlationId: string;
  decidedAt: string;
}

export interface AuditEntry {
  id: string;
  itemId: string;
  correlationId: string;
  action: ReviewDecisionAction;
  reasonCode: string;
  note?: string;
  decidedAt: string;
}

export interface DecisionRuleConfig {
  allowed: ReviewDecisionAction[];
  requireReason: boolean;
}

export type DecisionRulesByType = Partial<Record<ReviewType, DecisionRuleConfig>>;

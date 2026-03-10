export type PromotionLane =
  | "CANDIDATE"
  | "OBSERVED"
  | "TRUSTED"
  | "PROMOTED";

export type LaneDecision =
  | "INSERT_LANE"
  | "MERGE_LANE"
  | "PROMOTE_LANE"
  | "NOOP_LANE"
  | "REVIEW_LANE"
  | "QUARANTINE_LANE";

export type LaneSnapshot = {
  lane: PromotionLane;
  payload: Record<string, unknown>;
  updatedAt: string;
  trustScore?: number;
  provenanceScore?: number;
  confidenceScore?: number;
  sourceCount?: number;
};

export type LaneReconcileResult = {
  decision: LaneDecision;
  targetLane: PromotionLane;
  mergedPayload?: Record<string, unknown>;
  reasons: Array<{
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
};

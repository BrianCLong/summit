import type { CogEntityType, CogRejectionError } from "../types";
import type { TrustVector } from "../trust/types";
import type { PromotionLane } from "../lanes/types";

export type ReconcileDecision =
  | "APPLY"
  | "MERGE"
  | "NOOP"
  | "QUARANTINE"
  | "REVIEW";

export type ReconcileResult = {
  decision: ReconcileDecision;
  mergedPayload?: Record<string, unknown>;
  reasons: CogRejectionError[];
  comparedFields?: string[];
  isConflict?: boolean;
  isOverwrite?: boolean;
};

export type EntitySnapshot = {
  entityType: CogEntityType;
  payload: Record<string, unknown>;
  fingerprint?: string;
  trust?: TrustVector;
  lane?: PromotionLane;
};

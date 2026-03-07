import type { CogWriteOp } from "../types";
import type { LaneReconcileResult, PromotionLane } from "./types";
import { highestEligibleLane, defaultLaneThresholdPolicy } from "./policy";
import { extractTrustVector } from "../trust/extractTrustVector";
import { computeTrustScore } from "../trust/policy";

function rank(lane: PromotionLane): number {
  switch (lane) {
    case "CANDIDATE":
      return 1;
    case "OBSERVED":
      return 2;
    case "TRUSTED":
      return 3;
    case "PROMOTED":
      return 4;
  }
}

export function reconcileToLane(input: {
  op: CogWriteOp;
  currentLane?: PromotionLane | null;
  currentPayload?: Record<string, unknown> | null;
  structuralDecision: "APPLY" | "MERGE" | "NOOP" | "REVIEW" | "QUARANTINE";
  mergedPayload?: Record<string, unknown>;
  analystApproved?: boolean;
}): LaneReconcileResult {
  if (input.structuralDecision === "QUARANTINE") {
    return {
      decision: "QUARANTINE_LANE",
      targetLane: "CANDIDATE",
      reasons: [{ code: "STRUCTURAL_QUARANTINE", message: "Structural conflict requires quarantine." }]
    };
  }

  if (input.structuralDecision === "REVIEW") {
    return {
      decision: "REVIEW_LANE",
      targetLane: "CANDIDATE",
      reasons: [{ code: "STRUCTURAL_REVIEW", message: "Structural ambiguity requires review." }]
    };
  }

  if (input.structuralDecision === "NOOP") {
    return {
      decision: "NOOP_LANE",
      targetLane: input.currentLane ?? "CANDIDATE",
      reasons: [{ code: "STRUCTURAL_NOOP", message: "No material improvement over current state." }]
    };
  }

  const payload = input.mergedPayload ?? input.op.payload;
  const tv = extractTrustVector(payload);
  const trustScore = computeTrustScore(tv);

  const eligibleLane = highestEligibleLane({
    trustScore,
    confidenceScore: tv.confidenceScore,
    evidenceCount: tv.evidenceCount,
    attested: tv.attested,
    analystApproved: input.analystApproved,
    policy: defaultLaneThresholdPolicy
  });

  if (!input.currentLane) {
    return {
      decision: "INSERT_LANE",
      targetLane: eligibleLane,
      mergedPayload: payload,
      reasons: [
        {
          code: "NEW_LANE_ENTITY",
          message: "Entity inserted into highest eligible lane.",
          details: { eligibleLane, trustScore }
        }
      ]
    };
  }

  if (rank(eligibleLane) > rank(input.currentLane)) {
    return {
      decision: "PROMOTE_LANE",
      targetLane: eligibleLane,
      mergedPayload: payload,
      reasons: [
        {
          code: "PROMOTION_THRESHOLD_MET",
          message: "Incoming state qualifies for promotion to a higher lane.",
          details: { from: input.currentLane, to: eligibleLane, trustScore }
        }
      ]
    };
  }

  if (eligibleLane === input.currentLane) {
    return {
      decision: "MERGE_LANE",
      targetLane: eligibleLane,
      mergedPayload: payload,
      reasons: [
        {
          code: "MERGE_WITHIN_LANE",
          message: "Incoming state improves current lane state without promotion.",
          details: { lane: eligibleLane, trustScore }
        }
      ]
    };
  }

  return {
    decision: "REVIEW_LANE",
    targetLane: eligibleLane,
    reasons: [
      {
        code: "LOWER_LANE_THAN_CURRENT",
        message: "Incoming state does not qualify to overwrite higher current lane.",
        details: { eligibleLane, currentLane: input.currentLane, trustScore }
      }
    ]
  };
}

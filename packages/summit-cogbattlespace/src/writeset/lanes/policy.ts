import type { PromotionLane } from "./types";

export type LaneThresholdPolicy = {
  observed: {
    minTrustScore: number;
    minConfidence: number;
    minEvidenceCount: number;
  };
  trusted: {
    minTrustScore: number;
    minConfidence: number;
    minEvidenceCount: number;
    requireCorroboration: boolean;
  };
  promoted: {
    minTrustScore: number;
    minConfidence: number;
    minEvidenceCount: number;
    requireAttestation: boolean;
    requireAnalystApproval: boolean;
  };
  lowerTrustOverwriteAction: "NOOP_LANE" | "REVIEW_LANE" | "QUARANTINE_LANE";
};

export const defaultLaneThresholdPolicy: LaneThresholdPolicy = {
  observed: {
    minTrustScore: 0.35,
    minConfidence: 0.4,
    minEvidenceCount: 1
  },
  trusted: {
    minTrustScore: 0.7,
    minConfidence: 0.65,
    minEvidenceCount: 2,
    requireCorroboration: true
  },
  promoted: {
    minTrustScore: 0.85,
    minConfidence: 0.8,
    minEvidenceCount: 3,
    requireAttestation: true,
    requireAnalystApproval: false
  },
  lowerTrustOverwriteAction: "REVIEW_LANE"
};

export function highestEligibleLane(input: {
  trustScore: number;
  confidenceScore: number;
  evidenceCount: number;
  attested?: boolean;
  analystApproved?: boolean;
  policy?: LaneThresholdPolicy;
}): PromotionLane {
  const p = input.policy ?? defaultLaneThresholdPolicy;

  const promotedOk =
    input.trustScore >= p.promoted.minTrustScore &&
    input.confidenceScore >= p.promoted.minConfidence &&
    input.evidenceCount >= p.promoted.minEvidenceCount &&
    (!p.promoted.requireAttestation || Boolean(input.attested)) &&
    (!p.promoted.requireAnalystApproval || Boolean(input.analystApproved));

  if (promotedOk) return "PROMOTED";

  const trustedOk =
    input.trustScore >= p.trusted.minTrustScore &&
    input.confidenceScore >= p.trusted.minConfidence &&
    input.evidenceCount >= p.trusted.minEvidenceCount;

  if (trustedOk) return "TRUSTED";

  const observedOk =
    input.trustScore >= p.observed.minTrustScore &&
    input.confidenceScore >= p.observed.minConfidence &&
    input.evidenceCount >= p.observed.minEvidenceCount;

  if (observedOk) return "OBSERVED";

  return "CANDIDATE";
}

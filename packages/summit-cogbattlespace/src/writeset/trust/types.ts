export type SourceTrustTier =
  | "UNTRUSTED"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERIFIED";

export type ProvenanceStrength =
  | "WEAK"
  | "MODERATE"
  | "STRONG"
  | "ATTESTED";

export type TrustVector = {
  collector?: string;
  sourceTrustTier: SourceTrustTier;
  provenanceStrength: ProvenanceStrength;
  confidenceScore: number; // 0..1
  evidenceCount: number;
  attested?: boolean;
};

export type PromotionPolicy = {
  minAutoMergeTrustScore: number;
  minAutoMergeConfidence: number;
  requireAttestationForOverwrite: boolean;
  lowerTrustOverwriteAction: "NOOP" | "REVIEW" | "QUARANTINE";
  conflictingWeakEvidenceAction: "REVIEW" | "QUARANTINE";
};

export type TrustDecision =
  | "ALLOW_APPLY"
  | "ALLOW_MERGE"
  | "REVIEW"
  | "QUARANTINE"
  | "NOOP";

export type TrustEvaluation = {
  decision: TrustDecision;
  trustScoreIncoming: number;
  trustScoreCurrent: number;
  reasons: Array<{
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
};

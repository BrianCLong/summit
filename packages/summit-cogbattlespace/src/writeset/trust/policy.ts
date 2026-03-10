import type { PromotionPolicy, ProvenanceStrength, SourceTrustTier, TrustEvaluation, TrustVector } from "./types";

function tierScore(t: SourceTrustTier): number {
  switch (t) {
    case "UNTRUSTED":
      return 0.05;
    case "LOW":
      return 0.25;
    case "MEDIUM":
      return 0.5;
    case "HIGH":
      return 0.75;
    case "VERIFIED":
      return 1.0;
  }
}

function provenanceScore(p: ProvenanceStrength): number {
  switch (p) {
    case "WEAK":
      return 0.1;
    case "MODERATE":
      return 0.4;
    case "STRONG":
      return 0.75;
    case "ATTESTED":
      return 1.0;
  }
}

export function computeTrustScore(v: TrustVector): number {
  const evidenceBoost = Math.min(v.evidenceCount / 10, 1) * 0.1;
  const attestationBoost = v.attested ? 0.1 : 0;

  const score =
    tierScore(v.sourceTrustTier) * 0.35 +
    provenanceScore(v.provenanceStrength) * 0.35 +
    v.confidenceScore * 0.2 +
    evidenceBoost +
    attestationBoost;

  return Math.max(0, Math.min(1, score));
}

export const defaultPromotionPolicy: PromotionPolicy = {
  minAutoMergeTrustScore: 0.7,
  minAutoMergeConfidence: 0.65,
  requireAttestationForOverwrite: false,
  lowerTrustOverwriteAction: "REVIEW",
  conflictingWeakEvidenceAction: "QUARANTINE"
};

export function evaluateTrustForPromotion(input: {
  incoming: TrustVector;
  current?: TrustVector | null;
  policy?: PromotionPolicy;
  isOverwrite: boolean;
  isConflict: boolean;
}): TrustEvaluation {
  const policy = input.policy ?? defaultPromotionPolicy;
  const trustScoreIncoming = computeTrustScore(input.incoming);
  const trustScoreCurrent = input.current ? computeTrustScore(input.current) : 0;

  const reasons: TrustEvaluation["reasons"] = [];

  if (input.isConflict && trustScoreIncoming < policy.minAutoMergeTrustScore) {
    return {
      decision: policy.conflictingWeakEvidenceAction,
      trustScoreIncoming,
      trustScoreCurrent,
      reasons: [
        {
          code: "TRUST_CONFLICT_WEAK",
          message: "Conflicting incoming state does not meet trust threshold.",
          details: { trustScoreIncoming, threshold: policy.minAutoMergeTrustScore }
        }
      ]
    };
  }

  if (
    input.isOverwrite &&
    policy.requireAttestationForOverwrite &&
    !input.incoming.attested
  ) {
    return {
      decision: "REVIEW",
      trustScoreIncoming,
      trustScoreCurrent,
      reasons: [
        {
          code: "ATTESTATION_REQUIRED",
          message: "Overwrite requires attested provenance.",
          details: { trustScoreIncoming, trustScoreCurrent }
        }
      ]
    };
  }

  if (input.current && trustScoreIncoming < trustScoreCurrent) {
    const decision = policy.lowerTrustOverwriteAction;
    return {
      decision,
      trustScoreIncoming,
      trustScoreCurrent,
      reasons: [
        {
          code: "LOWER_TRUST_OVERWRITE",
          message: "Incoming state is lower-trust than current state.",
          details: { trustScoreIncoming, trustScoreCurrent }
        }
      ]
    };
  }

  if (
    trustScoreIncoming >= policy.minAutoMergeTrustScore &&
    input.incoming.confidenceScore >= policy.minAutoMergeConfidence
  ) {
    return {
      decision: input.isOverwrite ? "ALLOW_MERGE" : "ALLOW_APPLY",
      trustScoreIncoming,
      trustScoreCurrent,
      reasons: [
        {
          code: "TRUST_THRESHOLD_MET",
          message: "Incoming state meets automatic promotion thresholds.",
          details: { trustScoreIncoming, confidence: input.incoming.confidenceScore }
        }
      ]
    };
  }

  return {
    decision: "REVIEW",
    trustScoreIncoming,
    trustScoreCurrent,
    reasons: [
      {
        code: "TRUST_BELOW_PROMOTION_THRESHOLD",
        message: "Incoming state does not clearly meet auto-promotion thresholds.",
        details: { trustScoreIncoming, threshold: policy.minAutoMergeTrustScore }
      }
    ]
  };
}

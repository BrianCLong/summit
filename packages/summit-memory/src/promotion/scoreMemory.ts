import type { PromotionPolicy, WriteSet } from "../types.js";

export interface PromotionScore {
  eligible: boolean;
  score: number;
  reasons: string[];
}

export function scoreMemory(
  writeSet: WriteSet,
  policy: PromotionPolicy
): PromotionScore {
  const reasons: string[] = [];
  let score = 0;

  if (writeSet.confidence >= policy.minConfidence) {
    score += 0.5;
    reasons.push("confidence-threshold-met");
  }

  if (writeSet.provenanceRefs.length >= policy.minProvenanceCount) {
    score += 0.3;
    reasons.push("provenance-threshold-met");
  }

  const denied =
    policy.denyTags?.some((tag) => writeSet.policyTags.includes(tag)) ?? false;
  if (denied) {
    reasons.push("deny-tag-present");
    return { eligible: false, score: 0, reasons };
  }

  const allowOk =
    !policy.allowTags || policy.allowTags.every((tag) => writeSet.policyTags.includes(tag));

  if (allowOk) {
    score += 0.2;
    reasons.push("policy-tags-satisfied");
  }

  return {
    eligible: score >= 0.8,
    score,
    reasons
  };
}

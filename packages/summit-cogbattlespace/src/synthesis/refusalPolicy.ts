import type { LaneCitation } from "./types";

export function shouldRefuseCanonicalTone(citations: LaneCitation[]): {
  shouldRefuse: boolean;
  reason?: string;
} {
  if (citations.length === 0) {
    return {
      shouldRefuse: true,
      reason: "No supporting citations available."
    };
  }

  const lanes = new Set(citations.map((c) => c.lane));

  if (lanes.has("PROMOTED")) {
    return { shouldRefuse: false };
  }

  if (lanes.has("TRUSTED")) {
    return {
      shouldRefuse: true,
      reason: "Support is strong but not promoted to canonical lane."
    };
  }

  if (lanes.has("OBSERVED")) {
    return {
      shouldRefuse: true,
      reason: "Support is observational and still developing."
    };
  }

  return {
    shouldRefuse: true,
    reason: "Support is only candidate-level and cannot sustain canonical phrasing."
  };
}

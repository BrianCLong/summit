import type { WriteSet } from "../types.js";

export interface RetentionDecision {
  keep: boolean;
  archive: boolean;
  reason: string;
}

export function applyRetention(
  writeSet: WriteSet,
  now: string,
  maxAgeDays: number
): RetentionDecision {
  const ageMs = Date.parse(now) - Date.parse(writeSet.ingestTime);
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  if (ageMs > maxAgeMs && writeSet.promotionState !== "promoted") {
    return {
      keep: false,
      archive: true,
      reason: "non-promoted-expired"
    };
  }

  return {
    keep: true,
    archive: false,
    reason: "retained"
  };
}

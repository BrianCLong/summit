import type { WriteSet } from "../types.js";

export function demote(writeSet: WriteSet, reason?: string): WriteSet {
  const priorSummary = writeSet.content.summary ?? "";
  return {
    ...writeSet,
    promotionState: "demoted",
    content: {
      ...writeSet.content,
      summary: [priorSummary, reason].filter(Boolean).join(" | ")
    }
  };
}

import type { WriteSet } from "../types.js";

export function quarantine(writeSet: WriteSet, reason: string): WriteSet {
  return {
    ...writeSet,
    promotionState: "quarantined",
    content: {
      ...writeSet.content,
      summary: [writeSet.content.summary, `QUARANTINED:${reason}`]
        .filter(Boolean)
        .join(" | ")
    }
  };
}

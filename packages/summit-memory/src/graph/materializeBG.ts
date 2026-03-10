import type { MemoryObject, WriteSet } from "../types.js";

/**
 * Belief Graph materialization:
 * candidates, linked, validated, promoted may all appear.
 */
export function materializeBG(writeSets: WriteSet[]): MemoryObject[] {
  return writeSets
    .filter((w) => w.graphIntents.includes("BG"))
    .map((w) => ({
      memoryObjectId: w.memoryObjectId,
      entityId: w.entityId,
      graphKind: "BG",
      tier: w.tier,
      state: w.promotionState,
      eventTime: w.eventTime,
      ingestTime: w.ingestTime,
      claimRefs: w.claimRefs,
      lineage: {
        supersedes: w.supersedes,
        supersededBy: [],
        conflictsWith: w.conflictsWith
      }
    }));
}

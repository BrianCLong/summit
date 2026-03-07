import type { MemoryObject, WriteSet } from "../types.js";

/**
 * Narrative Graph materialization:
 * statements/framings can remain candidate-rich.
 */
export function materializeNG(writeSets: WriteSet[]): MemoryObject[] {
  return writeSets
    .filter((w) => w.graphIntents.includes("NG"))
    .map((w) => ({
      memoryObjectId: w.memoryObjectId,
      entityId: w.entityId,
      graphKind: "NG",
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

import type { MemoryObject, WriteSet } from "../types.js";

/**
 * Reality Graph materialization:
 * only promoted/validated writesets explicitly intended for RG.
 */
export function materializeRG(writeSets: WriteSet[]): MemoryObject[] {
  return writeSets
    .filter((w) => w.graphIntents.includes("RG"))
    .filter((w) => w.promotionState === "validated" || w.promotionState === "promoted")
    .map((w) => ({
      memoryObjectId: w.memoryObjectId,
      entityId: w.entityId,
      graphKind: "RG",
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

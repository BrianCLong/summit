import type { Conflict, WriteSet } from "../types.js";

/**
 * Minimal contradiction detector for skeleton:
 * same entity + same claim ref set size + different body => possible conflict.
 */
export function detectConflicts(writeSets: WriteSet[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < writeSets.length; i += 1) {
    for (let j = i + 1; j < writeSets.length; j += 1) {
      const a = writeSets[i];
      const b = writeSets[j];

      if (
        a.entityId === b.entityId &&
        a.content.body &&
        b.content.body &&
        a.content.body !== b.content.body
      ) {
        conflicts.push({
          leftWriteSetId: a.writeSetId,
          rightWriteSetId: b.writeSetId,
          reason: "same-entity-different-body",
          severity: "high"
        });
      }
    }
  }

  return conflicts;
}

import type { WriteSet } from "../types.js";

export interface DedupeResult {
  isDuplicateBatch: boolean;
  isDuplicateEntityState: boolean;
  duplicateOf?: string;
}

/**
 * Placeholder dedupe:
 * - batch-level duplicate by identical writeSetId
 * - entity-level duplicate by same entity + same body + same eventTime
 */
export function dedupeWriteSet(
  incoming: WriteSet,
  existing: WriteSet[]
): DedupeResult {
  const batchDup = existing.find((w) => w.writeSetId === incoming.writeSetId);
  if (batchDup) {
    return {
      isDuplicateBatch: true,
      isDuplicateEntityState: true,
      duplicateOf: batchDup.writeSetId
    };
  }

  const entityDup = existing.find(
    (w) =>
      w.entityId === incoming.entityId &&
      w.eventTime === incoming.eventTime &&
      w.content.body === incoming.content.body
  );

  return {
    isDuplicateBatch: false,
    isDuplicateEntityState: Boolean(entityDup),
    duplicateOf: entityDup?.writeSetId
  };
}

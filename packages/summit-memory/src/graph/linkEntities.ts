import type { MemoryObject } from "../types.js";

export interface EntityLink {
  from: string;
  to: string;
  reason: string;
  score: number;
}

/**
 * Stub entity linker. Later this should use claim overlap, canonical IDs,
 * provenance, embeddings, and graph topology.
 */
export function linkEntities(objects: MemoryObject[]): EntityLink[] {
  const links: EntityLink[] = [];
  for (let i = 0; i < objects.length; i += 1) {
    for (let j = i + 1; j < objects.length; j += 1) {
      if (objects[i].entityId === objects[j].entityId) {
        links.push({
          from: objects[i].memoryObjectId,
          to: objects[j].memoryObjectId,
          reason: "same-entity-id",
          score: 1
        });
      }
    }
  }
  return links;
}

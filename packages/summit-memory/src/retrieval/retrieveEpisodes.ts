import type { MemoryObject } from "../types.js";

export function retrieveEpisodes(
  objects: MemoryObject[],
  entityId?: string
): MemoryObject[] {
  return objects.filter(
    (o) => o.tier === "episode" && (entityId ? o.entityId === entityId : true)
  );
}

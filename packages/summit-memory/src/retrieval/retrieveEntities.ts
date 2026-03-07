import type { MemoryObject } from "../types.js";

export function retrieveEntities(objects: MemoryObject[]): MemoryObject[] {
  return objects.filter((o) => o.tier === "entity");
}

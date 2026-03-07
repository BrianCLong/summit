import type { MemoryObject } from "../types.js";

export function retrievePatterns(objects: MemoryObject[]): MemoryObject[] {
  return objects.filter((o) => o.tier === "pattern" || o.tier === "doctrine");
}

import type { MemoryObject } from "../types.js";

export interface RankSignals {
  semantic?: number;
  recency?: number;
  provenance?: number;
  graph?: number;
}

export function hybridRank(
  objects: MemoryObject[],
  signalMap: Record<string, RankSignals>
): MemoryObject[] {
  return [...objects]
    .map((o) => {
      const s = signalMap[o.memoryObjectId] ?? {};
      const score =
        (s.semantic ?? 0) * 0.4 +
        (s.recency ?? 0) * 0.2 +
        (s.provenance ?? 0) * 0.2 +
        (s.graph ?? 0) * 0.2;

      return {
        ...o,
        score,
        why: [
          `semantic=${s.semantic ?? 0}`,
          `recency=${s.recency ?? 0}`,
          `provenance=${s.provenance ?? 0}`,
          `graph=${s.graph ?? 0}`
        ]
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

import type { ReplayQuery, WriteSet } from "../types.js";
import { replayAsOf } from "../temporal/replayAsOf.js";

export function replayFidelity(
  writeSets: WriteSet[],
  query: ReplayQuery,
  expectedIds: string[]
): number {
  const got = replayAsOf(writeSets, query).map((w) => w.writeSetId);
  return JSON.stringify(got) === JSON.stringify(expectedIds) ? 1 : 0;
}

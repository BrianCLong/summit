import type { WriteSet } from "../types.js";
import { replayAsOf } from "../temporal/replayAsOf.js";

export interface TemporalQAExample {
  entityId: string;
  asOfIngestTime: string;
  expectedWriteSetIds: string[];
}

export function runTemporalQA(
  writeSets: WriteSet[],
  examples: TemporalQAExample[]
): number {
  let correct = 0;
  for (const ex of examples) {
    const got = replayAsOf(writeSets, {
      entityId: ex.entityId,
      asOfIngestTime: ex.asOfIngestTime,
      includeQuarantined: false
    }).map((w) => w.writeSetId);

    if (JSON.stringify(got) === JSON.stringify(ex.expectedWriteSetIds)) {
      correct += 1;
    }
  }
  return examples.length === 0 ? 1 : correct / examples.length;
}

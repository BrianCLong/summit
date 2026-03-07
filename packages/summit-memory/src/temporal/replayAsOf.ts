import type { ReplayQuery, WriteSet } from "../types.js";
import { isVisibleAtEventTime, isVisibleAtIngestTime } from "./bitemporal.js";

/**
 * Deterministic replay filter over append-only ledger entries.
 */
export function replayAsOf(writeSets: WriteSet[], query: ReplayQuery): WriteSet[] {
  return writeSets
    .filter((w) => (query.entityId ? w.entityId === query.entityId : true))
    .filter((w) => (query.graphKind ? w.graphIntents.includes(query.graphKind) : true))
    .filter((w) =>
      query.includeQuarantined ? true : w.promotionState !== "quarantined"
    )
    .filter((w) =>
      query.asOfEventTime ? isVisibleAtEventTime(w, query.asOfEventTime) : true
    )
    .filter((w) =>
      query.asOfIngestTime ? isVisibleAtIngestTime(w, query.asOfIngestTime) : true
    )
    .sort((a, b) => Date.parse(a.ingestTime) - Date.parse(b.ingestTime));
}

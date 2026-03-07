import type { LedgerDbHandle } from "../db/initLedgerDb";
import { loadWriteSetsAsKnownAt } from "./replay";

export interface ReplayDiff {
  from: string;
  to: string;
  added_writeset_ids: string[];
}

export async function diffWriteSetsAsKnown(
  db: LedgerDbHandle,
  fromAsKnownAt: string,
  toAsKnownAt: string
): Promise<ReplayDiff> {
  const [fromRows, toRows] = await Promise.all([
    loadWriteSetsAsKnownAt(db, fromAsKnownAt),
    loadWriteSetsAsKnownAt(db, toAsKnownAt),
  ]);

  const fromIds = new Set(fromRows.map((w) => w.writeset_id));
  const added = toRows
    .map((w) => w.writeset_id)
    .filter((id) => !fromIds.has(id));

  return {
    from: fromAsKnownAt,
    to: toAsKnownAt,
    added_writeset_ids: added,
  };
}

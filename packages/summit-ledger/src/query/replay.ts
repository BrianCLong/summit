import type { LedgerDbHandle } from "../db/initLedgerDb";
import type { WriteSet } from "../types/writeset.types";

export async function loadWriteSetsAsKnownAt(
  db: LedgerDbHandle,
  asKnownAt: string
): Promise<WriteSet[]> {
  const rows = await db.listWriteSets();
  return rows
    .filter((row) => row.system_time <= asKnownAt)
    .sort((a, b) => {
      if (a.system_time === b.system_time) return a.writeset_id.localeCompare(b.writeset_id);
      return a.system_time.localeCompare(b.system_time);
    })
    .map((row) => JSON.parse(row.json) as WriteSet);
}

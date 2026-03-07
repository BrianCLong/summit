import { describe, expect, it } from "vitest";
import ngSurge from "../fixtures/ws.ng-surge.json";
import bgShift from "../fixtures/ws.bg-shift.json";
import { initLedgerDb } from "../../../summit-ledger/src/db/initLedgerDb";
import { appendWriteSet } from "../../../summit-ledger/src/ingest/appendWriteSet";
import { materializeAll } from "../../../summit-trigraph/src/materialize/materializeAll";
import type { WriteSet } from "../../../summit-ledger/src/types/writeset.types";

const policy = {
  minEvidenceCount: 2,
  primaryEvidenceTypes: ["official_record", "first_party_document", "direct_observation"],
};

describe("replay_as_known", () => {
  it("materializes the same state for the same asKnownAt cutoff", async () => {
    const db = await initLedgerDb();
    await appendWriteSet(db, ngSurge as WriteSet);
    await appendWriteSet(db, bgShift as WriteSet);

    const t = "2026-03-06T12:05:00Z";
    const first = await materializeAll({ db, asKnownAt: t, policy });
    const second = await materializeAll({ db, asKnownAt: t, policy });

    expect(second).toEqual(first);
  });

  it("excludes later writesets before their system_time", async () => {
    const db = await initLedgerDb();
    await appendWriteSet(db, ngSurge as WriteSet);
    await appendWriteSet(db, bgShift as WriteSet);

    const t1 = "2026-03-06T12:00:00Z";
    const t2 = "2026-03-06T12:05:00Z";

    const first = await materializeAll({ db, asKnownAt: t1, policy });
    const second = await materializeAll({ db, asKnownAt: t2, policy });

    expect(Object.keys(first.ng.claims).length).toBeGreaterThan(0);
    expect(Object.keys(first.bg.claims).length).toBe(0);
    expect(Object.keys(second.bg.claims).length).toBeGreaterThan(0);
  });
});

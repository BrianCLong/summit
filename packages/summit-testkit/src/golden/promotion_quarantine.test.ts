import { describe, expect, it } from "vitest";
import ngSurge from "../fixtures/ws.ng-surge.json";
import bgShift from "../fixtures/ws.bg-shift.json";
import promotionProposal from "../fixtures/ws.rg-promotion-proposal.json";
import { initLedgerDb } from "../../../summit-ledger/src/db/initLedgerDb";
import { appendWriteSet } from "../../../summit-ledger/src/ingest/appendWriteSet";
import { materializeAll } from "../../../summit-trigraph/src/materialize/materializeAll";
import type { WriteSet } from "../../../summit-ledger/src/types/writeset.types";

const policy = {
  minEvidenceCount: 2,
  primaryEvidenceTypes: ["official_record", "first_party_document", "direct_observation"],
};

describe("promotion_quarantine", () => {
  it("keeps RG clean when promotion evidence is insufficient", async () => {
    const db = await initLedgerDb();
    await appendWriteSet(db, ngSurge as WriteSet);
    await appendWriteSet(db, bgShift as WriteSet);
    await appendWriteSet(db, promotionProposal as WriteSet);

    const result = await materializeAll({
      db,
      asKnownAt: "2026-03-06T12:06:00Z",
      policy,
    });

    expect(Object.keys(result.ng.claims).length).toBeGreaterThan(0);
    expect(Object.keys(result.bg.claims).length).toBeGreaterThan(0);
    expect(result.rg.claims["bg_claim_001"]).toBeUndefined();
    expect(result.audit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          promotion_id: "promotion_001",
          claim_id: "bg_claim_001",
          decision: "QUARANTINE",
        }),
      ])
    );
  });
});

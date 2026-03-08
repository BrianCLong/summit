import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LedgerStore } from "../ledgerStore";
import type { WriteSet } from "../writeset";
import { diffAsOf } from "../ledgerQueries";

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

describe("ledger diff as-of", () => {
  it("diffs confidence changes between two tx times", async () => {
    const dbPath = path.join(process.cwd(), ".tmp", "ledger-diff.duckdb");
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });

    const store = new LedgerStore({ dbPath });
    await store.init();

    const ws1 = readJson(path.join(__dirname, "..", "fixtures", "writeset.min.json")) as WriteSet;
    const ws2 = readJson(path.join(__dirname, "..", "fixtures", "writeset.v2.addEvidence.json")) as WriteSet;

    await store.appendWriteSet(ws1);
    await store.appendWriteSet(ws2);

    const d = await diffAsOf(
      store,
      { tx_time_asof: "2026-03-05T06:05:00.000Z" },
      { tx_time_asof: "2026-03-05T06:15:00.000Z" }
    );

    expect(d.added_claim_ids).toEqual([]); // same claim_id present both times
    expect(d.removed_claim_ids).toEqual([]);
    expect(d.changed_confidence.length).toBe(1);
    expect(d.changed_confidence[0].claim_id).toBe("clm_001");
    expect(d.changed_confidence[0].from).toBeCloseTo(0.8);
    expect(d.changed_confidence[0].to).toBeCloseTo(0.92);
  });
});

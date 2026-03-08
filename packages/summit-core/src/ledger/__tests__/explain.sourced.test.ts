import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LedgerStore } from "../ledgerStore";
import type { WriteSet } from "../writeset";
import { explainClaim } from "../explain";

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

describe("Explain() must be fully sourced", () => {
  it("returns evidence + writeset source chain (no free-floating rationale)", async () => {
    const dbPath = path.join(process.cwd(), ".tmp", "ledger-explain.duckdb");
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });

    const store = new LedgerStore({ dbPath });
    await store.init();

    const ws1 = readJson(path.join(__dirname, "..", "fixtures", "writeset.min.json")) as WriteSet;
    const ws2 = readJson(path.join(__dirname, "..", "fixtures", "writeset.v2.addEvidence.json")) as WriteSet;

    await store.appendWriteSet(ws1);
    await store.appendWriteSet(ws2);

    const ex = await explainClaim(store, "clm_001");

    expect(ex.claim_id).toBe("clm_001");
    expect(ex.sourced_from_writesets.length).toBe(1);
    expect(ex.sourced_from_writesets[0].writeset_id).toBe("ws_0002"); // latest by tx_time

    // Must cite artifacts as "supported_by"
    expect(ex.supported_by.length).toBeGreaterThanOrEqual(1);
    const uris = ex.supported_by.map((x) => x.uri);
    expect(uris).toContain("https://example.local/report/2");
  });
});

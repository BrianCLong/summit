import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LedgerStore } from "../ledgerStore";
import type { WriteSet } from "../writeset";
import { listWritesetsAsOf } from "../ledgerQueries";

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

describe("ledger replay as-of", () => {
  it("replays writesets as-of tx_time", async () => {
    const dbPath = path.join(process.cwd(), ".tmp", "ledger-replay.duckdb");
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });

    const store = new LedgerStore({ dbPath });
    await store.init();

    const ws1 = readJson(path.join(__dirname, "..", "fixtures", "writeset.min.json")) as WriteSet;
    const ws2 = readJson(path.join(__dirname, "..", "fixtures", "writeset.v2.addEvidence.json")) as WriteSet;

    await store.appendWriteSet(ws1);
    await store.appendWriteSet(ws2);

    const asOf1 = await listWritesetsAsOf(store, { tx_time_asof: "2026-03-05T06:05:00.000Z" });
    expect(asOf1.map((x) => x.writeset_id)).toEqual(["ws_0001"]);

    const asOf2 = await listWritesetsAsOf(store, { tx_time_asof: "2026-03-05T06:15:00.000Z" });
    expect(asOf2.map((x) => x.writeset_id)).toEqual(["ws_0001", "ws_0002"]);
  });
});

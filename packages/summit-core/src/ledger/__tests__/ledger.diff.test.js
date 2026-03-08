"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const ledgerStore_1 = require("../ledgerStore");
const ledgerQueries_1 = require("../ledgerQueries");
function readJson(p) {
    return JSON.parse(node_fs_1.default.readFileSync(p, "utf8"));
}
(0, vitest_1.describe)("ledger diff as-of", () => {
    (0, vitest_1.it)("diffs confidence changes between two tx times", async () => {
        const dbPath = node_path_1.default.join(process.cwd(), ".tmp", "ledger-diff.duckdb");
        node_fs_1.default.rmSync(node_path_1.default.dirname(dbPath), { recursive: true, force: true });
        const store = new ledgerStore_1.LedgerStore({ dbPath });
        await store.init();
        const ws1 = readJson(node_path_1.default.join(__dirname, "..", "fixtures", "writeset.min.json"));
        const ws2 = readJson(node_path_1.default.join(__dirname, "..", "fixtures", "writeset.v2.addEvidence.json"));
        await store.appendWriteSet(ws1);
        await store.appendWriteSet(ws2);
        const d = await (0, ledgerQueries_1.diffAsOf)(store, { tx_time_asof: "2026-03-05T06:05:00.000Z" }, { tx_time_asof: "2026-03-05T06:15:00.000Z" });
        (0, vitest_1.expect)(d.added_claim_ids).toEqual([]); // same claim_id present both times
        (0, vitest_1.expect)(d.removed_claim_ids).toEqual([]);
        (0, vitest_1.expect)(d.changed_confidence.length).toBe(1);
        (0, vitest_1.expect)(d.changed_confidence[0].claim_id).toBe("clm_001");
        (0, vitest_1.expect)(d.changed_confidence[0].from).toBeCloseTo(0.8);
        (0, vitest_1.expect)(d.changed_confidence[0].to).toBeCloseTo(0.92);
    });
});

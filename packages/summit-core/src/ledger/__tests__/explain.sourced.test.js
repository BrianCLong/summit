"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const ledgerStore_1 = require("../ledgerStore");
const explain_1 = require("../explain");
function readJson(p) {
    return JSON.parse(node_fs_1.default.readFileSync(p, "utf8"));
}
(0, vitest_1.describe)("Explain() must be fully sourced", () => {
    (0, vitest_1.it)("returns evidence + writeset source chain (no free-floating rationale)", async () => {
        const dbPath = node_path_1.default.join(process.cwd(), ".tmp", "ledger-explain.duckdb");
        node_fs_1.default.rmSync(node_path_1.default.dirname(dbPath), { recursive: true, force: true });
        const store = new ledgerStore_1.LedgerStore({ dbPath });
        await store.init();
        const ws1 = readJson(node_path_1.default.join(__dirname, "..", "fixtures", "writeset.min.json"));
        const ws2 = readJson(node_path_1.default.join(__dirname, "..", "fixtures", "writeset.v2.addEvidence.json"));
        await store.appendWriteSet(ws1);
        await store.appendWriteSet(ws2);
        const ex = await (0, explain_1.explainClaim)(store, "clm_001");
        (0, vitest_1.expect)(ex.claim_id).toBe("clm_001");
        (0, vitest_1.expect)(ex.sourced_from_writesets.length).toBe(1);
        (0, vitest_1.expect)(ex.sourced_from_writesets[0].writeset_id).toBe("ws_0002"); // latest by tx_time
        // Must cite artifacts as "supported_by"
        (0, vitest_1.expect)(ex.supported_by.length).toBeGreaterThanOrEqual(1);
        const uris = ex.supported_by.map((x) => x.uri);
        (0, vitest_1.expect)(uris).toContain("https://example.local/report/2");
    });
});

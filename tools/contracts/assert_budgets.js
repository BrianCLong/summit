"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const spec = require('js-yaml').load(require('fs').readFileSync('.changespec.yml', 'utf8'));
async function get(path) {
    const t = Date.now();
    const r = await (0, node_fetch_1.default)(process.env.PREVIEW_BASE + path);
    return { ms: Date.now() - t, s: r.status };
}
(async () => {
    const paths = [
        '/health',
        '/api/ops/capacity?tenant=acme&from=2025-09-01&to=2025-09-07',
    ];
    const runs = await Promise.all(paths.map((p) => get(p)));
    const p95 = runs.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(runs.length * 0.95) - 1] || runs[0].ms;
    const err = (100 * runs.filter((r) => r.s >= 500).length) / Math.max(1, runs.length);
    const ok = p95 <= spec.budgets.p95_ms && err <= spec.budgets.err_rate_pct;
    if (!ok) {
        console.error(JSON.stringify({ want: spec.budgets, got: { p95, err } }, null, 2));
        process.exit(1);
    }
    console.log('budgets ok');
})();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRetentionOnce = runRetentionOnce;
exports.startRetentionWorker = startRetentionWorker;
exports.stopRetentionWorker = stopRetentionWorker;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pg_js_1 = require("../db/pg.js");
function readRetentionDays() {
    try {
        const p = node_path_1.default.resolve(process.cwd(), 'contracts/policy-pack/v0/data/retention.json');
        const raw = JSON.parse(node_fs_1.default.readFileSync(p, 'utf8'));
        const tiers = raw?.tiers || {};
        const defaults = raw?.defaults || {};
        const standardDays = tiers?.standard?.days ?? 180;
        const longDays = tiers?.long?.days ?? 365;
        return {
            riskDays: Number(process.env.RETENTION_RISK_DAYS || standardDays),
            evidenceDays: Number(process.env.RETENTION_EVIDENCE_DAYS || longDays),
        };
    }
    catch {
        return {
            riskDays: Number(process.env.RETENTION_RISK_DAYS || 180),
            evidenceDays: Number(process.env.RETENTION_EVIDENCE_DAYS || 365),
        };
    }
}
async function runRetentionOnce() {
    const { riskDays, evidenceDays } = readRetentionDays();
    await pg_js_1.pg.write(`DELETE FROM risk_signals WHERE created_at < now() - ($1 || ' days')::interval`, [String(riskDays)]);
    await pg_js_1.pg.write(`DELETE FROM evidence_bundles WHERE created_at < now() - ($1 || ' days')::interval`, [String(evidenceDays)]);
}
let timer;
function startRetentionWorker() {
    if (process.env.ENABLE_RETENTION_WORKER !== 'true')
        return;
    const intervalMs = Number(process.env.RETENTION_WORKER_INTERVAL_MS || 24 * 3600 * 1000);
    const tick = () => runRetentionOnce().catch((e) => console.warn('retention error', e));
    timer = setInterval(tick, intervalMs);
    tick();
}
function stopRetentionWorker() {
    if (timer)
        clearInterval(timer);
}

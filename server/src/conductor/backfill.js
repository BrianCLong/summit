"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planBackfill = planBackfill;
exports.runBackfill = runBackfill;
// @ts-nocheck
const yaml_1 = __importDefault(require("yaml"));
const luxon_1 = require("luxon");
const pg_1 = __importDefault(require("pg"));
const crypto_1 = require("crypto");
const start_js_1 = require("./start.js");
const { Pool } = pg_1.default;
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
async function planBackfill(rbYaml) {
    const rb = yaml_1.default.parse(rbYaml);
    const win = rb?.backfill?.window;
    if (!win)
        return [];
    const start = luxon_1.DateTime.fromISO(win.start);
    const end = luxon_1.DateTime.fromISO(win.end);
    const step = win.type === 'hourly'
        ? { unit: 'hours', n: 1 }
        : { unit: 'days', n: 1 };
    const slots = [];
    for (let t = start; t < end; t = t.plus({ [step.unit]: step.n })) {
        const s = t.toISO();
        const e = t.plus({ [step.unit]: step.n }).toISO();
        if (s && e)
            slots.push({ start: s, end: e });
    }
    return slots;
}
async function runBackfill(rbYaml, dry = true) {
    const slots = await planBackfill(rbYaml);
    const planned = [];
    for (const w of slots) {
        const idempotency = 'backfill:' +
            (0, crypto_1.createHash)('sha1').update(`${w.start}:${w.end}`).digest('hex');
        const exists = await pgPool.query(`SELECT 1 FROM run WHERE idempotency_key=$1`, [idempotency]);
        if (exists.rowCount)
            continue;
        if (!dry)
            await (0, start_js_1.startRun)({
                runbookYaml: rbYaml,
                runbookRef: 'backfill',
                labels: ['backfill'],
                idempotency,
            });
        planned.push({ window: w, idempotency });
    }
    return planned;
}

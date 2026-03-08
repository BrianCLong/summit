"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamProcess = streamProcess;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function streamProcess(ctx, step, msg) {
    const srcTs = msg.ts ? new Date(msg.ts) : new Date();
    const age = Date.now() - srcTs.getTime();
    if (step.freshness?.freshWithin &&
        age > parseISODuration(step.freshness.freshWithin)) {
        await pg.query(`INSERT INTO data_freshness(run_id,step_id,source_ts,age_ms) VALUES ($1,$2,$3,$4)
       ON CONFLICT (run_id,step_id) DO UPDATE SET source_ts=$3, age_ms=$4`, [ctx.id, step.id, srcTs, age]);
        return; // gate
    }
    const out = {
        ...(typeof msg.value === 'string'
            ? JSON.parse(msg.value || '{}')
            : msg.value || {}),
        _key: msg.key,
    };
    ctx.setOutputs(step.id, out);
}
function parseISODuration(s) {
    const m = /^(\d+)([smhd])$/.exec(s || '');
    const n = Number(m?.[1] || 0);
    const u = m?.[2] || 's';
    return n * (u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : 86400) * 1000;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffRuns = diffRuns;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function diffRuns(a, b) {
    const [A, B] = await Promise.all([snap(a), snap(b)]);
    const out = [];
    // artifacts
    for (const step of new Set([
        ...Object.keys(A.artifacts),
        ...Object.keys(B.artifacts),
    ])) {
        const da = new Set(A.artifacts[step] || []), db = new Set(B.artifacts[step] || []);
        const add = [...db].filter((x) => !da.has(x)), del = [...da].filter((x) => !db.has(x));
        if (add.length || del.length)
            out.push({
                stepId: step,
                type: 'artifact',
                before: [...da],
                after: [...db],
                severity: 'warn',
            });
    }
    // metrics
    for (const k of Object.keys(A.metrics)) {
        if (Math.abs((A.metrics[k] || 0) - (B.metrics[k] || 0)) > 1e-6)
            out.push({
                stepId: k,
                type: 'metric',
                before: A.metrics[k],
                after: B.metrics[k],
                severity: 'info',
            });
    }
    return out;
}
async function snap(runId) {
    const { rows: arts } = await pg.query(`SELECT step_id, digest FROM run_artifacts WHERE run_id=$1`, [runId]);
    const { rows: mets } = await pg.query(`SELECT key, val FROM run_metrics WHERE run_id=$1`, [runId]);
    return {
        artifacts: arts.reduce((m, r) => {
            (m[r.step_id] = m[r.step_id] || []).push(r.digest);
            return m;
        }, {}),
        metrics: Object.fromEntries(mets.map((m) => [m.key, Number(m.val)])),
    };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRun = startRun;
exports.onRunComplete = onRunComplete;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function startRun({ runbookYaml, runbookRef, parentRunId, labels, idempotency, }) {
    const { rows: [r], } = await pg.query(`INSERT INTO run (id, runbook, status, started_at, parent_run_id, idempotency_key)
    VALUES (gen_random_uuid(), $1, 'PENDING', now(), $2, $3) RETURNING id`, [runbookRef || 'inline', parentRunId || null, idempotency || null]);
    return { id: r.id };
}
async function onRunComplete(runId, _cancel) {
    // Placeholder: in a real system, subscribe to completion; here just a no-op
    return { id: runId };
}

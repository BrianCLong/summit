"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileRoots = reconcileRoots;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function reconcileRoots(runId) {
    const { rows } = await pg.query(`SELECT payload->>'root' AS root FROM run_ledger WHERE run_id=$1 AND event='prov.root'`, [runId]);
    if (!rows.length)
        return { ok: false };
    const roots = new Set(rows.map((r) => r.root));
    if (roots.size === 1)
        return { ok: true, root: roots.values().next().value };
    return { ok: false, conflict: Array.from(roots) };
}

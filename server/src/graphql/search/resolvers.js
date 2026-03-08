"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchResolvers = void 0;
const postgres_js_1 = require("../../db/postgres.js");
exports.searchResolvers = {
    Query: {
        searchRuns: async (_, { q }) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const cond = [];
            const params = [];
            if (q?.tenant) {
                params.push(q.tenant);
                cond.push(`(run.runbook ilike '%'||$${params.length}||'%')`);
            }
            if (q?.status) {
                params.push(q.status);
                cond.push(`run.status=$${params.length}`);
            }
            if (q?.since) {
                params.push(q.since);
                cond.push(`run.started_at >= $${params.length}`);
            }
            if (q?.until) {
                params.push(q.until);
                cond.push(`run.started_at <= $${params.length}`);
            }
            const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
            const sql = `SELECT id, status, started_at, runbook FROM run ${where} ORDER BY started_at DESC LIMIT 200`;
            const { rows } = await pool.query(sql, params);
            return rows.map((r) => ({
                runId: r.id,
                status: r.status,
                startedAt: r.started_at,
                tenant: 'n/a',
                summary: `${r.status} ${r.runbook}`,
            }));
        },
    },
};

import { getPostgresPool } from '../../db/postgres.js';

export const searchResolvers = {
  Query: {
    searchRuns: async (_: any, { q }: any) => {
      const pool = getPostgresPool();
      const cond: string[] = [];
      const params: any[] = [];
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
      return rows.map((r: any) => ({
        runId: r.id,
        status: r.status,
        startedAt: r.started_at,
        tenant: 'n/a',
        summary: `${r.status} ${r.runbook}`,
      }));
    },
  },
};

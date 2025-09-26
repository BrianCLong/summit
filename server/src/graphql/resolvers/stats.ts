import { getPostgresPool } from '../../config/database.js';
import { cached } from '../../cache/responseCache.js';
import type { Pool } from 'pg';

type CountsArgs = { status?: string };

const CASE_COUNTS_TTL = 45;
const SUMMARY_TTL = 120;

export async function loadCaseCounts(pool: Pool, tenant: string) {
  const sql = `SELECT status, COUNT(*)::int AS c FROM investigations WHERE tenant_id=$1 GROUP BY status`;
  const r = await pool.query(sql, [tenant]);
  const list = Array.isArray(r?.rows) ? r.rows : [];
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of list) {
    const k = String((row as any)?.status ?? 'UNKNOWN');
    const v = Number((row as any)?.c ?? (row as any)?.count ?? 0);
    byStatus[k] = (byStatus[k] || 0) + v;
    total += v;
  }
  return { byStatus, total };
}

export async function loadSummaryStats(pool: Pool, tenant: string) {
  const summaryQuery = `
    SELECT metric, value FROM (
      SELECT 'entities' AS metric, COUNT(*)::int AS value FROM entities WHERE tenant_id = $1
      UNION ALL
      SELECT 'relationships' AS metric, COUNT(*)::int AS value FROM relationships WHERE tenant_id = $1
      UNION ALL
      SELECT 'investigations' AS metric, COUNT(*)::int AS value FROM investigations WHERE tenant_id = $1
    ) AS counts
  `;
  const r = await pool.query(summaryQuery, [tenant]);
  const summary = {
    entities: 0,
    relationships: 0,
    investigations: 0,
  };
  for (const row of r.rows ?? []) {
    const metric = String((row as any)?.metric ?? '').toLowerCase();
    const value = Number((row as any)?.value ?? 0);
    if (metric in summary) {
      (summary as any)[metric] = value;
    }
  }
  return summary;
}

export const statsResolvers = {
  Query: {
    // Returns counts for cases/investigations; aggregates only (no PII)
    async caseCounts(_: unknown, _args: CountsArgs = {}, ctx: any) {
      const tenant = ctx?.tenantId || ctx?.user?.tenant || 'anon';
      const key = ['counts', tenant];
      const result = await cached(
        key,
        CASE_COUNTS_TTL,
        async () => loadCaseCounts(getPostgresPool(), tenant),
        'caseCounts',
      );
      return result;
    },

    // Basic summary; keep non-sensitive aggregates only
    async summaryStats(_: unknown, _args: any, ctx: any) {
      const tenant = ctx?.tenantId || ctx?.user?.tenant || 'anon';
      const key = ['summary', tenant];
      return await cached(
        key,
        SUMMARY_TTL,
        async () => loadSummaryStats(getPostgresPool(), tenant),
        'summaryStats',
      );
    },
  },
};

export default statsResolvers;

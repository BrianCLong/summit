import { getPostgresPool } from '../../config/database.js';
import { cached } from '../../cache/responseCache.js';

type CountsArgs = { status?: string };

export const statsResolvers = {
  Query: {
    // Returns counts for cases/investigations; aggregates only (no PII)
    async caseCounts(_: unknown, _args: CountsArgs = {}, ctx: any) {
      const tenant = ctx?.tenantId || ctx?.user?.tenant || 'anon';
      const key = ['counts', tenant];
      const result = await cached(key, 45, async () => {
        const pool = getPostgresPool();
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
      });
      return result;
    },

    // Basic summary; keep non-sensitive aggregates only
    async summaryStats(_: unknown, _args: any, ctx: any) {
      const tenant = ctx?.tenantId || ctx?.user?.tenant || 'anon';
      const key = ['summary', tenant];
      return await cached(key, 120, async () => {
        const pool = getPostgresPool();
        const r1 = await pool.query(
          `SELECT COUNT(*)::int AS entities FROM entities WHERE tenant_id = $1`,
          [tenant]
        );
        const r2 = await pool.query(
          `SELECT COUNT(*)::int AS relationships FROM relationships WHERE tenant_id = $1`,
          [tenant]
        );
        const r3 = await pool.query(
          `SELECT COUNT(*)::int AS investigations FROM investigations WHERE tenant_id = $1`,
          [tenant]
        );
        return {
          entities: r1.rows?.[0]?.entities || 0,
          relationships: r2.rows?.[0]?.relationships || 0,
          investigations: r3.rows?.[0]?.investigations || 0,
        };
      });
    },
  },
};

export default statsResolvers;

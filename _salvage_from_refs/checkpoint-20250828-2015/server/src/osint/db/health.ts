import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database';

export class OsintHealthRepo {
  constructor(private pool: Pool = getPostgresPool()) {}

  async health(sourceId?: string) {
    const params: any[] = [];
    const srcSql = `SELECT id as source_id, name, last_run_at, last_status, items_ingested, error_rate, next_run_at, 
      NULL::BIGINT as avg_latency, NULL::BIGINT as p95_latency
      FROM osint_sources` + (sourceId ? ` WHERE id=$1` : ``) + ` ORDER BY name`;
    if (sourceId) params.push(sourceId);
    const { rows } = await this.pool.query(srcSql, params);
    for (const r of rows) {
      const m = await this.pool.query(
        `SELECT AVG(latency_ms)::BIGINT as avg_latency,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency
         FROM osint_runs WHERE source_id=$1 AND started_at > now() - interval '7 days'`,
        [r.source_id]
      );
      r.avg_latency = Number(m.rows[0]?.avg_latency || 0);
      r.p95_latency = Number(m.rows[0]?.p95_latency || 0);
    }
    return rows.map((r:any)=> ({
      sourceId: r.source_id,
      name: r.name,
      lastRunAt: r.last_run_at,
      lastStatus: r.last_status,
      itemsIngested: Number(r.items_ingested || 0),
      errorRate: Number(r.error_rate || 0),
      nextRunAt: r.next_run_at,
      avgLatency: Number(r.avg_latency || 0),
      p95Latency: Number(r.p95_latency || 0),
    }));
  }
}


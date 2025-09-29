import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database';

export type OsintSourceRow = {
  id: string;
  name: string;
  kind: string;
  url: string;
  license_id: string | null;
  rate_limit_per_min: number;
  enabled: boolean;
  tags: string[];
  last_run_at: Date | null;
};

export class OsintSourcesRepo {
  private pool: Pool;
  constructor(pool?: Pool) { this.pool = pool || getPostgresPool(); }

  // ensure removed; rely on SQL migrations

  async create(input: { name:string; kind:string; url:string; licenseId?:string; rateLimitPerMin?:number; tags?:string[]; cron?:string }) {
    const { rows } = await this.pool.query(
      `INSERT INTO osint_sources(name, kind, url, license_id, rate_limit_per_min, tags, cron)
       VALUES($1,$2,$3,$4,$5,COALESCE($6, '{}'), COALESCE($7, '*/15 * * * *'))
       RETURNING id, name, kind, url, license_id, rate_limit_per_min, enabled, tags, last_run_at, cron, last_status, items_ingested, error_rate, next_run_at`,
      [input.name, input.kind, input.url, input.licenseId || null, input.rateLimitPerMin ?? 60, input.tags || [], input.cron || null]
    );
    return rows[0] as OsintSourceRow;
  }

  async get(id: string) {
    const { rows } = await this.pool.query(
      `SELECT id, name, kind, url, license_id, rate_limit_per_min, enabled, tags, last_run_at, cron, last_status, items_ingested, error_rate, next_run_at FROM osint_sources WHERE id=$1`,
      [id]
    );
    return rows[0] as OsintSourceRow | undefined;
  }

  async list(args: { search?: string; kind?: string; enabled?: boolean } = {}) {
    const where: string[] = [];
    const params: any[] = [];
    if (typeof args.enabled === 'boolean') { where.push(`enabled = $${params.push(args.enabled)}`); }
    if (args.kind) { where.push(`kind = $${params.push(args.kind)}`); }
    if (args.search) {
      const q = `%${args.search}%`;
      where.push(`(name ILIKE $${params.push(q)} OR url ILIKE $${params.push(q)} OR $${params.push(args.search)} = ANY(tags))`);
    }
    const sql = `SELECT id, name, kind, url, license_id, rate_limit_per_min, enabled, tags, last_run_at, cron, last_status, items_ingested, error_rate, next_run_at FROM osint_sources` + (where.length?` WHERE ${where.join(' AND ')}`:'') + ` ORDER BY name ASC`;
    const { rows } = await this.pool.query(sql, params);
    return rows as OsintSourceRow[];
  }

  async update(id: string, patch: Partial<{ name:string; url:string; enabled:boolean; rateLimitPerMin:number; tags:string[] }>) {
    const fields: string[] = [];
    const params: any[] = [];
    if (patch.name !== undefined) fields.push(`name = $${params.push(patch.name)}`);
    if (patch.url !== undefined) fields.push(`url = $${params.push(patch.url)}`);
    if (patch.enabled !== undefined) fields.push(`enabled = $${params.push(patch.enabled)}`);
    if (patch.rateLimitPerMin !== undefined) fields.push(`rate_limit_per_min = $${params.push(patch.rateLimitPerMin)}`);
    if (patch.tags !== undefined) fields.push(`tags = $${params.push(patch.tags)}`);
    if (!fields.length) return this.get(id);
    params.push(id);
    const { rows } = await this.pool.query(
      `UPDATE osint_sources SET ${fields.join(', ')}, updated_at = now() WHERE id=$${params.length} RETURNING id, name, kind, url, license_id, rate_limit_per_min, enabled, tags, last_run_at`,
      params
    );
    return rows[0] as OsintSourceRow | undefined;
  }

  async remove(id: string) {
    await this.pool.query(`DELETE FROM osint_sources WHERE id=$1`, [id]);
    return true;
  }

  async updateHealth(id: string, patch: Partial<{ last_status:string; last_run_at: Date; items_ingested: number; error_rate: number; next_run_at: Date }>) {
    const sets: string[] = []; const params: any[] = [];
    if (patch.last_status !== undefined) sets.push(`last_status=$${params.push(patch.last_status)}`);
    if (patch.last_run_at !== undefined) sets.push(`last_run_at=$${params.push(patch.last_run_at)}`);
    if (patch.items_ingested !== undefined) sets.push(`items_ingested=COALESCE(items_ingested,0)+$${params.push(patch.items_ingested)}`);
    if (patch.error_rate !== undefined) sets.push(`error_rate=$${params.push(patch.error_rate)}`);
    if (patch.next_run_at !== undefined) sets.push(`next_run_at=$${params.push(patch.next_run_at)}`);
    if (!sets.length) return;
    params.push(id);
    await this.pool.query(`UPDATE osint_sources SET ${sets.join(', ')}, updated_at=now() WHERE id=$${params.length}`, params);
  }
}

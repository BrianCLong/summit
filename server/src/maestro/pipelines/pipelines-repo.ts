import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database.js';

export interface PipelineRecord {
  id: string;
  name: string;
  spec: any;
  created_at: string;
  updated_at: string;
}

export class PipelinesRepo {
  private pool: Pool;
  private initialized = false;
  constructor() { this.pool = getPostgresPool(); }
  private async ensureTable() {
    if (this.initialized) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        spec JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pipelines_name ON pipelines(name);
    `);
    this.initialized = true;
  }
  async create(name: string, spec: any): Promise<PipelineRecord> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `INSERT INTO pipelines (name, spec) VALUES ($1, $2)
       RETURNING id, name, spec, created_at, updated_at`,
      [name, spec]
    );
    return rows[0];
  }
  async list(): Promise<PipelineRecord[]> {
    await this.ensureTable();
    const { rows } = await this.pool.query(`SELECT id, name, spec, created_at, updated_at FROM pipelines ORDER BY created_at DESC`);
    return rows;
  }
  async get(id: string): Promise<PipelineRecord | null> {
    await this.ensureTable();
    const { rows } = await this.pool.query(`SELECT id, name, spec, created_at, updated_at FROM pipelines WHERE id=$1`, [id]);
    return rows[0] || null;
  }
  async update(id: string, patch: { name?: string; spec?: any }): Promise<PipelineRecord | null> {
    await this.ensureTable();
    const sets: string[] = []; const vals: any[] = []; let i = 1;
    if (patch.name !== undefined) { sets.push(`name=$${i++}`); vals.push(patch.name); }
    if (patch.spec !== undefined) { sets.push(`spec=$${i++}`); vals.push(patch.spec); }
    sets.push(`updated_at=CURRENT_TIMESTAMP`);
    vals.push(id);
    const { rows } = await this.pool.query(
      `UPDATE pipelines SET ${sets.join(', ')} WHERE id=$${i}
       RETURNING id, name, spec, created_at, updated_at`, vals);
    return rows[0] || null;
  }
  async delete(id: string): Promise<boolean> {
    await this.ensureTable();
    const { rowCount } = await this.pool.query(`DELETE FROM pipelines WHERE id=$1`, [id]);
    return rowCount > 0;
  }
}

export const pipelinesRepo = new PipelinesRepo();


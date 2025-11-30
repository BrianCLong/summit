import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database.js';

export interface ExecutorRecord {
  id: string;
  name: string;
  kind: 'cpu' | 'gpu';
  labels: string[];
  capacity: number;
  status: 'ready' | 'busy' | 'offline';
  last_heartbeat: string | null;
  tenant_id: string; // Added tenant_id
}

export class ExecutorsRepo {
  private pool: Pool | null = null;
  private initialized = false;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = getPostgresPool();
    }
    return this.pool;
  }
  private async ensureTable() {
    if (this.initialized) return;
    // The table creation is handled by migrations now, but we keep this for initial setup if no migrations are run
    await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS executors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL,
        labels TEXT[] NOT NULL DEFAULT '{}',
        capacity INT NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'ready',
        last_heartbeat TIMESTAMP,
        tenant_id TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_executors_tenant_id ON executors(tenant_id);
    `);
    this.initialized = true;
  }
  async create(
    r: Omit<ExecutorRecord, 'id' | 'last_heartbeat' | 'tenant_id'>,
    tenantId: string,
  ): Promise<ExecutorRecord> {
    await this.ensureTable();
    const { rows } = await this.getPool().query(
      `INSERT INTO executors (name, kind, labels, capacity, status, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, kind, labels, capacity, status, last_heartbeat, tenant_id`,
      [r.name, r.kind, r.labels, r.capacity, r.status, tenantId],
    );
    return rows[0];
  }
  async list(tenantId: string): Promise<ExecutorRecord[]> {
    await this.ensureTable();
    const { rows } = await this.getPool().query(
      `SELECT id, name, kind, labels, capacity, status, last_heartbeat, tenant_id FROM executors WHERE tenant_id = $1 ORDER BY name`,
      [tenantId],
    );
    return rows;
  }

  async update(id: string, updates: Partial<ExecutorRecord>, tenantId: string): Promise<ExecutorRecord | null> {
      await this.ensureTable();
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (updates.status) {
          fields.push(`status = $${idx++}`);
          values.push(updates.status);
      }
      // Add other fields as needed

      if (fields.length === 0) return null;

      values.push(id);
      values.push(tenantId);

      const { rows } = await this.getPool().query(
          `UPDATE executors SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx+1} RETURNING *`,
          values
      );
      return rows[0] || null;
  }
}

let _executorsRepo: ExecutorsRepo | null = null;

export const executorsRepo = {
  get instance(): ExecutorsRepo {
    if (!_executorsRepo) {
      _executorsRepo = new ExecutorsRepo();
    }
    return _executorsRepo;
  },

  // Proxy methods for backward compatibility
  async create(
    r: Omit<ExecutorRecord, 'id' | 'last_heartbeat' | 'tenant_id'>,
    tenantId: string,
  ): Promise<ExecutorRecord> {
    return this.instance.create(r, tenantId);
  },

  async list(tenantId: string): Promise<ExecutorRecord[]> {
    return this.instance.list(tenantId);
  },

  async update(id: string, updates: Partial<ExecutorRecord>, tenantId: string): Promise<ExecutorRecord | null> {
      return this.instance.update(id, updates, tenantId);
  }
};

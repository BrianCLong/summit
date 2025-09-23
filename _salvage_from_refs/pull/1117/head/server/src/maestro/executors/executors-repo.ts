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
    await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS executors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL,
        labels TEXT[] NOT NULL DEFAULT '{}',
        capacity INT NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'ready',
        last_heartbeat TIMESTAMP
      );
    `);
    this.initialized = true;
  }
  async create(r: Omit<ExecutorRecord, 'id' | 'last_heartbeat'>): Promise<ExecutorRecord> {
    await this.ensureTable();
    const { rows } = await this.getPool().query(
      `INSERT INTO executors (name, kind, labels, capacity, status)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, kind, labels, capacity, status, last_heartbeat`,
      [r.name, r.kind, r.labels, r.capacity, r.status],
    );
    return rows[0];
  }
  async list(): Promise<ExecutorRecord[]> {
    await this.ensureTable();
    const { rows } = await this.getPool().query(
      `SELECT id, name, kind, labels, capacity, status, last_heartbeat FROM executors ORDER BY name`,
    );
    return rows;
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
  async create(r: Omit<ExecutorRecord, 'id' | 'last_heartbeat'>): Promise<ExecutorRecord> {
    return this.instance.create(r);
  },

  async list(): Promise<ExecutorRecord[]> {
    return this.instance.list();
  },
};

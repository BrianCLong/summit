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
  private pool: Pool = getPostgresPool();
  private initialized = false;
  private async ensureTable() {
    if (this.initialized) return;
    await this.pool.query(`
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
  async create(r: Omit<ExecutorRecord,'id'|'last_heartbeat'>): Promise<ExecutorRecord> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `INSERT INTO executors (name, kind, labels, capacity, status)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, kind, labels, capacity, status, last_heartbeat`,
      [r.name, r.kind, r.labels, r.capacity, r.status]
    );
    return rows[0];
  }
  async list(): Promise<ExecutorRecord[]> {
    await this.ensureTable();
    const { rows } = await this.pool.query(`SELECT id, name, kind, labels, capacity, status, last_heartbeat FROM executors ORDER BY name`);
    return rows;
  }
}

export const executorsRepo = new ExecutorsRepo();

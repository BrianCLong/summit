/* istanbul ignore file */
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import type { AdapterFactoryOptions, DatabaseAdapter } from './base-adapter.js';
import type { MigrationMeta } from '../types.js';

export interface PostgresAdapterOptions extends AdapterFactoryOptions {
  readonly pool?: Pool;
  readonly statementTimeoutMs?: number;
}

export class PostgresAdapter implements DatabaseAdapter<PoolClient> {
  public readonly dialect = 'postgres';
  private readonly pool: Pool;

  constructor(private readonly options: PostgresAdapterOptions) {
    this.pool = options.pool ?? new Pool({ connectionString: options.connectionString });
  }

  async connect(): Promise<void> {
    await this.pool.connect().then((client) => client.release());
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async beginTransaction(): Promise<PoolClient> {
    const client = await this.pool.connect();
    if (this.options.statementTimeoutMs) {
      await client.query('SET statement_timeout = $1', [this.options.statementTimeoutMs]);
    }
    await client.query('BEGIN');
    return client;
  }

  async commit(transaction: PoolClient): Promise<void> {
    await transaction.query('COMMIT');
    transaction.release();
  }

  async rollback(transaction: PoolClient): Promise<void> {
    try {
      await transaction.query('ROLLBACK');
    } finally {
      transaction.release();
    }
  }

  async runInTransaction<R>(callback: (transaction: PoolClient) => Promise<R>): Promise<R> {
    const client = await this.beginTransaction();
    try {
      const result = await callback(client);
      await this.commit(client);
      return result;
    } catch (error) {
      await this.rollback(client);
      throw error;
    }
  }

  async ensureSafety(meta: MigrationMeta): Promise<void> {
    await this.pool.query(
      'insert into migration_audits(id, checksum, checked_at) values($1, $2, now()) on conflict do nothing',
      [meta.id ?? randomUUID(), meta.checksum]
    ).catch(() => {
      // The audit table may not exist; ignore silently but keep the hook for operators to observe.
    });
  }

  async dryRun(meta: MigrationMeta): Promise<void> {
    await this.pool.query('select $1::text as migration_id', [meta.id]);
  }
}

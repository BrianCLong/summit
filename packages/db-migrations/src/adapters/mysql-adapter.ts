/* istanbul ignore file */
import type { Pool, PoolConnection } from 'mysql2/promise';
import { createPool } from 'mysql2/promise';
import type { AdapterFactoryOptions, DatabaseAdapter } from './base-adapter.js';
import type { MigrationMeta } from '../types.js';

export interface MysqlAdapterOptions extends AdapterFactoryOptions {
  readonly pool?: Pool;
  readonly isolationLevel?: string;
}

export class MysqlAdapter implements DatabaseAdapter<PoolConnection> {
  public readonly dialect = 'mysql';
  private readonly pool: Pool;

  constructor(private readonly options: MysqlAdapterOptions) {
    this.pool = options.pool ?? createPool(options.connectionString ?? '');
  }

  async connect(): Promise<void> {
    const connection = await this.pool.getConnection();
    connection.release();
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async beginTransaction(): Promise<PoolConnection> {
    const connection = await this.pool.getConnection();
    if (this.options.isolationLevel) {
      await connection.query(`SET TRANSACTION ISOLATION LEVEL ${this.options.isolationLevel}`);
    }
    await connection.beginTransaction();
    return connection;
  }

  async commit(transaction: PoolConnection): Promise<void> {
    await transaction.commit();
    transaction.release();
  }

  async rollback(transaction: PoolConnection): Promise<void> {
    try {
      await transaction.rollback();
    } finally {
      transaction.release();
    }
  }

  async runInTransaction<R>(callback: (transaction: PoolConnection) => Promise<R>): Promise<R> {
    const connection = await this.beginTransaction();
    try {
      const result = await callback(connection);
      await this.commit(connection);
      return result;
    } catch (error) {
      await this.rollback(connection);
      throw error;
    }
  }

  async ensureSafety(meta: MigrationMeta): Promise<void> {
    await this.pool
      .query('INSERT IGNORE INTO migration_audits (id, checksum, checked_at) VALUES (?, ?, NOW())', [
        meta.id,
        meta.checksum,
      ])
      .catch(() => {
        /* optional audit table */
      });
  }

  async dryRun(meta: MigrationMeta): Promise<void> {
    await this.pool.query('SELECT ? as migration_id', [meta.id]);
  }
}

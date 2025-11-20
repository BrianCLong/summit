/**
 * PostgreSQL connector
 */

import { Pool, PoolConfig, QueryResult } from 'pg';
import {
  BaseDatabaseConnector,
  ConnectionConfig,
  ReadOptions,
  WriteOptions,
  WriteResult,
  SchemaInfo,
  FieldInfo,
  DataSourceType,
} from '@intelgraph/data-integration';

/**
 * PostgreSQL connector implementation
 */
export class PostgresConnector extends BaseDatabaseConnector {
  private pool?: Pool;

  constructor() {
    super({
      name: 'PostgreSQL Connector',
      version: '1.0.0',
      description: 'Connector for PostgreSQL databases',
      type: DataSourceType.POSTGRES,
      capabilities: {
        supportsStreaming: true,
        supportsBatch: true,
        supportsIncremental: true,
        supportsCDC: true,
        supportsSchema: true,
        supportsPartitioning: true,
        supportsTransactions: true,
        maxBatchSize: 10000,
        maxConcurrency: 10,
      },
      configSchema: {},
    });
  }

  /**
   * Connect to PostgreSQL
   */
  async connect(config: ConnectionConfig): Promise<void> {
    this.config = config;

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      max: config.poolSize || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: config.timeout || 5000,
    };

    this.pool = new Pool(poolConfig);
    this.connected = true;

    this.emit('connected');
  }

  /**
   * Disconnect from PostgreSQL
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
    this.connected = false;
    this.emit('disconnected');
  }

  /**
   * Read data from PostgreSQL
   */
  async *read(options?: ReadOptions): AsyncIterableIterator<any> {
    if (!this.pool) {
      throw new Error('Not connected');
    }

    // Build query
    const query = this.buildSelectQuery(options);
    const result = await this.pool.query(query);

    for (const row of result.rows) {
      yield row;
    }
  }

  /**
   * Write data to PostgreSQL
   */
  async write(data: any[], options?: WriteOptions): Promise<WriteResult> {
    if (!this.pool) {
      throw new Error('Not connected');
    }

    const tableName = options?.mode || 'public.data';
    return this.writeBatch(data, tableName, options);
  }

  /**
   * Get schema information
   */
  protected async getTableSchema(tableName: string): Promise<SchemaInfo> {
    if (!this.pool) {
      throw new Error('Not connected');
    }

    const [schema, table] = tableName.includes('.')
      ? tableName.split('.')
      : ['public', tableName];

    const query = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;

    const result = await this.pool.query(query, [schema, table]);

    const fields: FieldInfo[] = result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      maxLength: row.character_maximum_length,
      precision: row.numeric_precision,
      scale: row.numeric_scale,
    }));

    return {
      name: tableName,
      type: 'table',
      fields,
    };
  }

  /**
   * Get all schemas
   */
  protected async getAllSchemas(): Promise<SchemaInfo[]> {
    if (!this.pool) {
      throw new Error('Not connected');
    }

    const query = `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `;

    const result = await this.pool.query(query);
    const schemas: SchemaInfo[] = [];

    for (const row of result.rows) {
      const tableName = `${row.table_schema}.${row.table_name}`;
      try {
        const schema = await this.getTableSchema(tableName);
        schemas.push(schema);
      } catch (error) {
        // Skip tables we can't access
      }
    }

    return schemas;
  }

  /**
   * Execute query
   */
  protected async executeQuery(query: string, params?: any[]): Promise<any[]> {
    if (!this.pool) {
      throw new Error('Not connected');
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Execute update
   */
  protected async executeUpdate(query: string, params?: any[]): Promise<number> {
    if (!this.pool) {
      throw new Error('Not connected');
    }

    const result = await this.pool.query(query, params);
    return result.rowCount || 0;
  }

  /**
   * Insert batch
   */
  protected async insertBatch(tableName: string, data: any[], options?: WriteOptions): Promise<number> {
    if (!this.pool) {
      throw new Error('Not connected');
    }

    if (data.length === 0) return 0;

    const columns = Object.keys(data[0]);
    const values = data.map(row => columns.map(col => row[col]));

    // Build INSERT query
    const placeholders = values.map((_, i) =>
      `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
    ).join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders}
      ${options?.mode === 'upsert' ? `ON CONFLICT DO NOTHING` : ''}
    `;

    const flatValues = values.flat();
    const result = await this.pool.query(query, flatValues);

    return result.rowCount || 0;
  }

  /**
   * Build SELECT query
   */
  private buildSelectQuery(options?: ReadOptions): string {
    const table = options?.filter?.table || 'data';
    const columns = options?.projection?.join(', ') || '*';
    const where = options?.filter?.where || '';
    const limit = options?.limit ? `LIMIT ${options.limit}` : '';
    const offset = options?.offset ? `OFFSET ${options.offset}` : '';

    return `SELECT ${columns} FROM ${table} ${where} ${limit} ${offset}`.trim();
  }
}

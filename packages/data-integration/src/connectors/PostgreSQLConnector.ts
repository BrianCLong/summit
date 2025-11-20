/**
 * PostgreSQL database connector
 */

import { Pool, PoolClient } from 'pg';
import { BaseConnector } from '../core/BaseConnector';
import { ConnectorCapabilities, DataSourceConfig } from '../types';
import { Logger } from 'winston';

export class PostgreSQLConnector extends BaseConnector {
  private pool: Pool | null = null;
  private client: PoolClient | null = null;

  constructor(config: DataSourceConfig, logger: Logger) {
    super(config, logger);
    this.validateConfig();
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: this.config.connectionConfig.host,
        port: this.config.connectionConfig.port || 5432,
        database: this.config.connectionConfig.database,
        user: this.config.connectionConfig.username,
        password: this.config.connectionConfig.password,
        ssl: this.config.connectionConfig.sslConfig?.enabled
          ? {
              rejectUnauthorized: this.config.connectionConfig.sslConfig.rejectUnauthorized,
              ca: this.config.connectionConfig.sslConfig.ca,
              cert: this.config.connectionConfig.sslConfig.cert,
              key: this.config.connectionConfig.sslConfig.key
            }
          : false,
        min: this.config.connectionConfig.connectionPoolConfig?.min || 2,
        max: this.config.connectionConfig.connectionPoolConfig?.max || 10,
        idleTimeoutMillis: this.config.connectionConfig.connectionPoolConfig?.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.connectionConfig.connectionPoolConfig?.acquireTimeoutMillis || 2000
      });

      this.client = await this.pool.connect();
      this.isConnected = true;
      this.logger.info(`Connected to PostgreSQL database: ${this.config.connectionConfig.database}`);
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      this.isConnected = false;
      this.logger.info('Disconnected from PostgreSQL');
    } catch (error) {
      this.logger.error('Error disconnecting from PostgreSQL', { error });
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.withRetry(async () => {
        const result = await this.client!.query('SELECT 1');
        return result.rows.length > 0;
      }, 'Test connection');
      return true;
    } catch (error) {
      this.logger.error('Connection test failed', { error });
      return false;
    }
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      supportsStreaming: true,
      supportsIncremental: true,
      supportsCDC: false, // Would require additional setup (e.g., Debezium)
      supportsSchema: true,
      supportsPartitioning: true,
      maxConcurrentConnections: this.config.connectionConfig.connectionPoolConfig?.max || 10
    };
  }

  async *extract(): AsyncGenerator<any[], void, unknown> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to database');
    }

    const query = this.buildQuery();
    const batchSize = this.config.extractionConfig.batchSize || 1000;

    this.logger.info(`Extracting data from PostgreSQL with query: ${query}`);

    try {
      // Use cursor for efficient streaming
      const cursorName = `cursor_${Date.now()}`;
      await this.client.query('BEGIN');
      await this.client.query(`DECLARE ${cursorName} CURSOR FOR ${query}`);

      let hasMore = true;
      let totalRecords = 0;

      while (hasMore) {
        const result = await this.client.query(`FETCH ${batchSize} FROM ${cursorName}`);

        if (result.rows.length === 0) {
          hasMore = false;
        } else {
          totalRecords += result.rows.length;
          this.emitProgress(totalRecords, 0);
          yield result.rows;
        }

        await this.rateLimit();
      }

      await this.client.query('COMMIT');
      this.logger.info(`Extracted ${totalRecords} records from PostgreSQL`);
    } catch (error) {
      await this.client.query('ROLLBACK');
      this.logger.error('Error extracting data from PostgreSQL', { error });
      throw error;
    }
  }

  async getSchema(): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to database');
    }

    const tableName = this.extractTableName();

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
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;

    try {
      const result = await this.client.query(query, [tableName]);
      return {
        tableName,
        columns: result.rows.map(row => ({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
          maxLength: row.character_maximum_length,
          precision: row.numeric_precision,
          scale: row.numeric_scale
        }))
      };
    } catch (error) {
      this.logger.error('Error getting schema from PostgreSQL', { error });
      throw error;
    }
  }

  private buildQuery(): string {
    const { query, incrementalColumn, lastExtractedValue, filterConfig } = this.config.extractionConfig;

    if (query) {
      return query;
    }

    // Build basic SELECT query
    const tableName = this.extractTableName();
    let sql = `SELECT * FROM ${tableName}`;
    const conditions: string[] = [];

    // Add incremental filter
    if (incrementalColumn && lastExtractedValue !== undefined) {
      conditions.push(`${incrementalColumn} > '${lastExtractedValue}'`);
    }

    // Add WHERE clause
    if (filterConfig?.whereClause) {
      conditions.push(filterConfig.whereClause);
    }

    // Add date range filter
    if (filterConfig?.dateRange) {
      conditions.push(
        `created_at >= '${filterConfig.dateRange.start.toISOString()}'`,
        `created_at <= '${filterConfig.dateRange.end.toISOString()}'`
      );
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY for incremental extraction
    if (incrementalColumn) {
      sql += ` ORDER BY ${incrementalColumn}`;
    }

    return sql;
  }

  private extractTableName(): string {
    const loadConfig = this.config.loadConfig;
    return loadConfig.targetSchema
      ? `${loadConfig.targetSchema}.${loadConfig.targetTable}`
      : loadConfig.targetTable;
  }
}

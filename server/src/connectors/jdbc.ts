// Maestro Conductor v24.3.0 - JDBC Connector for PostgreSQL/MySQL
// Epic E15: New Connectors - Database connectivity for external sources

// No-op tracer shim to avoid OTEL dependency
import { Pool, PoolClient, types as pgTypes } from 'pg';
import mysql from 'mysql2/promise';
import { Counter, Histogram, Gauge } from 'prom-client';
import { EventEmitter } from 'events';

const tracer = {
  startActiveSpan: async (_name: string, fn: (span: any) => Promise<any> | any) => {
    const span = {
      setAttributes: (_a?: any) => {},
      recordException: (_e?: any) => {},
      setStatus: (_s?: any) => {},
      end: () => {},
    };
    return await fn(span);
  },
};

// Fix PostgreSQL parsing for large integers
pgTypes.setTypeParser(20, (val) => parseInt(val, 10)); // BIGINT
pgTypes.setTypeParser(1700, (val) => parseFloat(val)); // NUMERIC

// Metrics
const jdbcOperations = new Counter({
  name: 'jdbc_operations_total',
  help: 'Total JDBC operations',
  labelNames: ['tenant_id', 'database_type', 'operation', 'result']
});

const jdbcLatency = new Histogram({
  name: 'jdbc_operation_latency_ms',
  help: 'JDBC operation latency',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  labelNames: ['database_type', 'operation']
});

const jdbcConnections = new Gauge({
  name: 'jdbc_active_connections',
  help: 'Active JDBC connections',
  labelNames: ['tenant_id', 'database_type', 'host']
});

const jdbcQueryRows = new Histogram({
  name: 'jdbc_query_rows',
  help: 'Number of rows returned by queries',
  buckets: [1, 10, 100, 1000, 10000, 100000],
  labelNames: ['database_type', 'operation']
});

export type DatabaseType = 'postgresql' | 'mysql';

export interface JDBCConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  queryTimeout?: number;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionString?: string;
  schema?: string; // PostgreSQL schema or MySQL database
}

export interface QueryOptions {
  timeout?: number;
  maxRows?: number;
  fetchSize?: number;
  readOnly?: boolean;
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    length?: number;
  }>;
  executionTime: number;
}

export interface BatchResult {
  totalRows: number;
  affectedRows: number[];
  executionTime: number;
  errors?: Array<{ index: number; error: string }>;
}

export interface SchemaInfo {
  tables: Array<{
    name: string;
    schema: string;
    type: 'TABLE' | 'VIEW';
    comment?: string;
  }>;
  columns: Array<{
    table: string;
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
  }>;
  indexes: Array<{
    table: string;
    name: string;
    columns: string[];
    unique: boolean;
    type: string;
  }>;
}

export class JDBCConnector extends EventEmitter {
  private config: JDBCConfig;
  private tenantId: string;
  private pool: Pool | mysql.Pool | null = null;
  private connected = false;

  constructor(tenantId: string, config: JDBCConfig) {
    super();
    this.tenantId = tenantId;
    this.config = config;
  }

  async connect(): Promise<void> {
    return tracer.startActiveSpan('jdbc.connect', async (span: any) => {
      span.setAttributes?.({
        'tenant_id': this.tenantId,
        'database_type': this.config.type,
        'host': this.config.host,
        'port': this.config.port,
        'database': this.config.database
      });

      try {
        if (this.config.type === 'postgresql') {
          await this.connectPostgreSQL();
        } else if (this.config.type === 'mysql') {
          await this.connectMySQL();
        } else {
          throw new Error(`Unsupported database type: ${this.config.type}`);
        }

        this.connected = true;
        jdbcConnections.inc({ 
          tenant_id: this.tenantId, 
          database_type: this.config.type,
          host: this.config.host 
        });

        this.emit('connected', { 
          tenantId: this.tenantId, 
          type: this.config.type, 
          host: this.config.host 
        });

      } catch (error) {
        span.recordException?.(error as Error);
        span.setStatus?.({ message: (error as Error).message });
        this.emit('error', { tenantId: this.tenantId, error });
        throw error;
      } finally {
        span.end?.();
      }
    });
  }

  private async connectPostgreSQL(): Promise<void> {
    const poolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl,
      max: this.config.maxConnections || 20,
      idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: this.config.connectionTimeout || 10000,
      application_name: `maestro-jdbc-${this.tenantId}`,
      search_path: this.config.schema || 'public',
    };

    this.pool = new Pool(poolConfig);

    // Test connection
    const client = await (this.pool as Pool).connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  private async connectMySQL(): Promise<void> {
    const poolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl,
      connectionLimit: this.config.maxConnections || 20,
      acquireTimeout: this.config.connectionTimeout || 10000,
      timeout: this.config.queryTimeout || 30000,
      multipleStatements: false,
      dateStrings: true,
    };

    this.pool = mysql.createPool(poolConfig);

    // Test connection
    const connection = await (this.pool as mysql.Pool).getConnection();
    try {
      await connection.execute('SELECT 1');
    } finally {
      connection.release();
    }
  }

  async query(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<QueryResult> {
    return tracer.startActiveSpan('jdbc.query', async (span: any) => {
      span.setAttributes?.({
        'tenant_id': this.tenantId,
        'database_type': this.config.type,
        'sql_length': sql.length,
        'param_count': params.length,
        'read_only': options.readOnly || false
      });

      if (!this.connected || !this.pool) {
        throw new Error('Database not connected');
      }

      const startTime = Date.now();

      try {
        let result: QueryResult;

        if (this.config.type === 'postgresql') {
          result = await this.executePostgreSQLQuery(sql, params, options);
        } else {
          result = await this.executeMySQLQuery(sql, params, options);
        }

        const executionTime = Date.now() - startTime;
        result.executionTime = executionTime;

        jdbcLatency.observe(
          { database_type: this.config.type, operation: 'query' },
          executionTime
        );

        jdbcQueryRows.observe(
          { database_type: this.config.type, operation: 'query' },
          result.rowCount
        );

        jdbcOperations.inc({ 
          tenant_id: this.tenantId, 
          database_type: this.config.type, 
          operation: 'query', 
          result: 'success' 
        });

        span.setAttributes({
          'row_count': result.rowCount,
          'field_count': result.fields.length,
          'execution_time': executionTime
        });

        this.emit('queryExecuted', { 
          tenantId: this.tenantId, 
          sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
          rowCount: result.rowCount,
          executionTime 
        });

        return result;

      } catch (error) {
        span.recordException?.(error as Error);
        span.setStatus?.({ message: (error as Error).message });
        jdbcOperations.inc({ 
          tenant_id: this.tenantId, 
          database_type: this.config.type, 
          operation: 'query', 
          result: 'error' 
        });
        throw error;
      } finally {
        span.end?.();
      }
    });
  }

  private async executePostgreSQLQuery(sql: string, params: any[], options: QueryOptions): Promise<QueryResult> {
    const client = await (this.pool as Pool).connect();
    
    try {
      // Set query timeout if specified
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }

      // Set isolation level if specified
      if (options.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }

      const pgResult = await client.query(sql, params);

      return {
        rows: pgResult.rows,
        rowCount: pgResult.rowCount || pgResult.rows.length,
        fields: pgResult.fields.map(field => ({
          name: field.name,
          type: this.mapPostgreSQLType(field.dataTypeID),
          nullable: true, // PostgreSQL doesn't provide this info easily
        })),
        executionTime: 0 // Will be set by caller
      };

    } finally {
      client.release();
    }
  }

  private async executeMySQLQuery(sql: string, params: any[], options: QueryOptions): Promise<QueryResult> {
    const connection = await (this.pool as mysql.Pool).getConnection();
    
    try {
      // Set query timeout if specified
      if (options.timeout) {
        await connection.execute(`SET SESSION wait_timeout = ${Math.ceil(options.timeout / 1000)}`);
      }

      // Set isolation level if specified
      if (options.isolationLevel) {
        await connection.execute(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel.replace('_', ' ')}`);
      }

      const [rows, fields] = await connection.execute(sql, params);

      return {
        rows: Array.isArray(rows) ? rows : [],
        rowCount: Array.isArray(rows) ? rows.length : 0,
        fields: Array.isArray(fields) ? fields.map(field => ({
          name: field.name,
          type: this.mapMySQLType(field.type),
          nullable: (field.flags & 1) === 0, // NOT_NULL flag
          length: field.length,
        })) : [],
        executionTime: 0 // Will be set by caller
      };

    } finally {
      connection.release();
    }
  }

  async batchExecute(sqls: string[], paramSets: any[][], options: QueryOptions = {}): Promise<BatchResult> {
    return tracer.startActiveSpan('jdbc.batch_execute', async (span: any) => {
      span.setAttributes?.({
        'tenant_id': this.tenantId,
        'database_type': this.config.type,
        'batch_size': sqls.length
      });

      if (!this.connected || !this.pool) {
        throw new Error('Database not connected');
      }

      const startTime = Date.now();
      const affectedRows: number[] = [];
      const errors: Array<{ index: number; error: string }> = [];
      let totalRows = 0;

      try {
        for (let i = 0; i < sqls.length; i++) {
          try {
            const result = await this.query(sqls[i], paramSets[i] || [], options);
            affectedRows.push(result.rowCount);
            totalRows += result.rowCount;
          } catch (error) {
            affectedRows.push(0);
            errors.push({ index: i, error: (error as Error).message });
          }
        }

        const executionTime = Date.now() - startTime;

        jdbcLatency.observe(
          { database_type: this.config.type, operation: 'batch' },
          executionTime
        );

        jdbcOperations.inc({ 
          tenant_id: this.tenantId, 
          database_type: this.config.type, 
          operation: 'batch', 
          result: errors.length > 0 ? 'partial' : 'success' 
        });

        span.setAttributes({
          'total_rows': totalRows,
          'error_count': errors.length,
          'execution_time': executionTime
        });

        const result: BatchResult = {
          totalRows,
          affectedRows,
          executionTime,
          errors: errors.length > 0 ? errors : undefined
        };

        this.emit('batchExecuted', { 
          tenantId: this.tenantId, 
          batchSize: sqls.length,
          totalRows,
          errorCount: errors.length,
          executionTime 
        });

        return result;

      } catch (error) {
        span.recordException?.(error as Error);
        span.setStatus?.({ message: (error as Error).message });
        jdbcOperations.inc({ 
          tenant_id: this.tenantId, 
          database_type: this.config.type, 
          operation: 'batch', 
          result: 'error' 
        });
        throw error;
      } finally {
        span.end?.();
      }
    });
  }

  async getSchemaInfo(schemaName?: string): Promise<SchemaInfo> {
    return tracer.startActiveSpan('jdbc.get_schema_info', async (span: any) => {
      span.setAttributes?.({
        'tenant_id': this.tenantId,
        'database_type': this.config.type,
        'schema_name': schemaName || 'default'
      });

      try {
        if (this.config.type === 'postgresql') {
          return await this.getPostgreSQLSchemaInfo(schemaName || 'public');
        } else {
          return await this.getMySQLSchemaInfo(schemaName || this.config.database);
        }
      } catch (error) {
        span.recordException?.(error as Error);
        span.setStatus?.({ message: (error as Error).message });
        throw error;
      } finally {
        span.end?.();
      }
    });
  }

  private async getPostgreSQLSchemaInfo(schemaName: string): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT table_name, table_schema, table_type, 
             obj_description(c.oid) as comment
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE table_schema = $1
      ORDER BY table_name;
    `;

    const columnsQuery = `
      SELECT c.table_name, c.column_name, c.data_type, 
             c.is_nullable::boolean as nullable,
             c.column_default as default_value,
             CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END as is_primary_key,
             CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN true ELSE false END as is_foreign_key
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
      WHERE c.table_schema = $1
      ORDER BY c.table_name, c.ordinal_position;
    `;

    const indexesQuery = `
      SELECT t.relname as table_name, i.relname as index_name,
             array_agg(a.attname ORDER BY a.attnum) as columns,
             ix.indisunique as unique,
             am.amname as type
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_am am ON i.relam = am.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = $1
      GROUP BY t.relname, i.relname, ix.indisunique, am.amname
      ORDER BY t.relname, i.relname;
    `;

    const [tablesResult, columnsResult, indexesResult] = await Promise.all([
      this.query(tablesQuery, [schemaName]),
      this.query(columnsQuery, [schemaName]),
      this.query(indexesQuery, [schemaName])
    ]);

    return {
      tables: tablesResult.rows.map(row => ({
        name: row.table_name,
        schema: row.table_schema,
        type: row.table_type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
        comment: row.comment
      })),
      columns: columnsResult.rows.map(row => ({
        table: row.table_name,
        name: row.column_name,
        type: row.data_type,
        nullable: row.nullable,
        defaultValue: row.default_value,
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key
      })),
      indexes: indexesResult.rows.map(row => ({
        table: row.table_name,
        name: row.index_name,
        columns: row.columns,
        unique: row.unique,
        type: row.type
      }))
    };
  }

  private async getMySQLSchemaInfo(databaseName: string): Promise<SchemaInfo> {
    const tablesQuery = `
      SELECT table_name, table_schema, table_type, table_comment as comment
      FROM information_schema.tables 
      WHERE table_schema = ?
      ORDER BY table_name;
    `;

    const columnsQuery = `
      SELECT table_name, column_name, data_type, 
             is_nullable = 'YES' as nullable,
             column_default as default_value,
             column_key = 'PRI' as is_primary_key,
             column_key = 'MUL' as is_foreign_key
      FROM information_schema.columns 
      WHERE table_schema = ?
      ORDER BY table_name, ordinal_position;
    `;

    const indexesQuery = `
      SELECT table_name, index_name,
             GROUP_CONCAT(column_name ORDER BY seq_in_index) as columns,
             non_unique = 0 as unique,
             index_type as type
      FROM information_schema.statistics 
      WHERE table_schema = ?
      GROUP BY table_name, index_name, non_unique, index_type
      ORDER BY table_name, index_name;
    `;

    const [tablesResult, columnsResult, indexesResult] = await Promise.all([
      this.query(tablesQuery, [databaseName]),
      this.query(columnsQuery, [databaseName]),
      this.query(indexesQuery, [databaseName])
    ]);

    return {
      tables: tablesResult.rows.map(row => ({
        name: row.table_name,
        schema: row.table_schema,
        type: row.table_type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
        comment: row.comment
      })),
      columns: columnsResult.rows.map(row => ({
        table: row.table_name,
        name: row.column_name,
        type: row.data_type,
        nullable: row.nullable,
        defaultValue: row.default_value,
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key
      })),
      indexes: indexesResult.rows.map(row => ({
        table: row.table_name,
        name: row.index_name,
        columns: row.columns.split(','),
        unique: row.unique,
        type: row.type
      }))
    };
  }

  private mapPostgreSQLType(typeId: number): string {
    const typeMap: { [key: number]: string } = {
      16: 'boolean',
      17: 'bytea',
      20: 'bigint',
      21: 'smallint',
      23: 'integer',
      25: 'text',
      1043: 'varchar',
      1082: 'date',
      1083: 'time',
      1114: 'timestamp',
      1184: 'timestamptz',
      1700: 'numeric',
      2950: 'uuid'
    };
    
    return typeMap[typeId] || `unknown(${typeId})`;
  }

  private mapMySQLType(type: number): string {
    const typeMap: { [key: number]: string } = {
      0: 'decimal',
      1: 'tinyint',
      2: 'smallint',
      3: 'int',
      4: 'float',
      5: 'double',
      7: 'timestamp',
      8: 'bigint',
      9: 'mediumint',
      10: 'date',
      11: 'time',
      12: 'datetime',
      13: 'year',
      15: 'varchar',
      252: 'text',
      253: 'varchar',
      254: 'char'
    };
    
    return typeMap[type] || `unknown(${type})`;
  }

  async testConnection(): Promise<{ connected: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      if (this.config.type === 'postgresql') {
        await this.query('SELECT 1 as test');
      } else {
        await this.query('SELECT 1 as test');
      }
      
      return { 
        connected: true, 
        latency: Date.now() - startTime 
      };
    } catch (error) {
      return { 
        connected: false, 
        latency: Date.now() - startTime,
        error: (error as Error).message 
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      if (this.config.type === 'postgresql') {
        await (this.pool as Pool).end();
      } else {
        await (this.pool as mysql.Pool).end();
      }
      
      this.pool = null;
      this.connected = false;
      
      jdbcConnections.dec({ 
        tenant_id: this.tenantId, 
        database_type: this.config.type,
        host: this.config.host 
      });

      this.emit('disconnected', { 
        tenantId: this.tenantId, 
        type: this.config.type, 
        host: this.config.host 
      });
    }
  }

  getTenantId(): string {
    return this.tenantId;
  }

  getConfig(): JDBCConfig {
    // Return config without sensitive data
    const { password, ...safeConfig } = this.config;
    return safeConfig as JDBCConfig;
  }

  isConnected(): boolean {
    return this.connected && this.pool !== null;
  }

  getDatabaseType(): DatabaseType {
    return this.config.type;
  }
}
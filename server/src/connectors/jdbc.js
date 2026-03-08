"use strict";
// Maestro Conductor v24.3.0 - JDBC Connector for PostgreSQL/MySQL
// Epic E15: New Connectors - Database connectivity for external sources
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JDBCConnector = void 0;
// No-op tracer shim to avoid OTEL dependency
const pg_1 = __importDefault(require("pg"));
const { Pool: PgPool, types } = pg_1.default;
const promise_1 = __importDefault(require("mysql2/promise"));
const prom_client_1 = require("prom-client");
const events_1 = require("events");
const stream_1 = require("stream");
const tracer = {
    startActiveSpan: async (_name, fn) => {
        const span = {
            setAttributes: (_a) => { },
            recordException: (_e) => { },
            setStatus: (_s) => { },
            end: () => { },
        };
        return await fn(span);
    },
};
// Fix PostgreSQL parsing for large integers
types.setTypeParser(20, (val) => parseInt(val, 10)); // BIGINT
types.setTypeParser(1700, (val) => parseFloat(val)); // NUMERIC
// Metrics
const jdbcOperations = new prom_client_1.Counter({
    name: 'jdbc_operations_total',
    help: 'Total JDBC operations',
    labelNames: ['tenant_id', 'database_type', 'operation', 'result'],
});
const jdbcLatency = new prom_client_1.Histogram({
    name: 'jdbc_operation_latency_ms',
    help: 'JDBC operation latency',
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    labelNames: ['database_type', 'operation'],
});
const jdbcConnections = new prom_client_1.Gauge({
    name: 'jdbc_active_connections',
    help: 'Active JDBC connections',
    labelNames: ['tenant_id', 'database_type', 'host'],
});
const jdbcQueryRows = new prom_client_1.Histogram({
    name: 'jdbc_query_rows',
    help: 'Number of rows returned by queries',
    buckets: [1, 10, 100, 1000, 10000, 100000],
    labelNames: ['database_type', 'operation'],
});
class JDBCConnector extends events_1.EventEmitter {
    config;
    tenantId;
    pool = null;
    connected = false;
    constructor(tenantId, config) {
        super();
        this.tenantId = tenantId;
        this.config = config;
    }
    async connect() {
        return tracer.startActiveSpan('jdbc.connect', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                database_type: this.config.type,
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
            });
            try {
                if (this.config.type === 'postgresql') {
                    await this.connectPostgreSQL();
                }
                else if (this.config.type === 'mysql') {
                    await this.connectMySQL();
                }
                else {
                    throw new Error(`Unsupported database type: ${this.config.type}`);
                }
                this.connected = true;
                jdbcConnections.inc({
                    tenant_id: this.tenantId,
                    database_type: this.config.type,
                    host: this.config.host,
                });
                this.emit('connected', {
                    tenantId: this.tenantId,
                    type: this.config.type,
                    host: this.config.host,
                });
            }
            catch (error) {
                span.recordException?.(error);
                span.setStatus?.({ message: error.message });
                this.emit('error', { tenantId: this.tenantId, error });
                throw error;
            }
            finally {
                span.end?.();
            }
        });
    }
    async connectPostgreSQL() {
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
        this.pool = new PgPool(poolConfig);
        // Test connection
        const client = await this.pool.connect();
        try {
            await client.query('SELECT 1');
        }
        finally {
            client.release();
        }
    }
    async connectMySQL() {
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
        this.pool = promise_1.default.createPool(poolConfig);
        // Test connection
        const connection = await this.pool.getConnection();
        try {
            await connection.execute('SELECT 1');
        }
        finally {
            connection.release();
        }
    }
    async query(sql, params = [], options = {}) {
        return tracer.startActiveSpan('jdbc.query', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                database_type: this.config.type,
                sql_length: sql.length,
                param_count: params.length,
                read_only: options.readOnly || false,
            });
            if (!this.connected || !this.pool) {
                throw new Error('Database not connected');
            }
            const startTime = Date.now();
            try {
                let result;
                if (this.config.type === 'postgresql') {
                    result = await this.executePostgreSQLQuery(sql, params, options);
                }
                else {
                    result = await this.executeMySQLQuery(sql, params, options);
                }
                const executionTime = Date.now() - startTime;
                result.executionTime = executionTime;
                jdbcLatency.observe({ database_type: this.config.type, operation: 'query' }, executionTime);
                jdbcQueryRows.observe({ database_type: this.config.type, operation: 'query' }, result.rowCount);
                jdbcOperations.inc({
                    tenant_id: this.tenantId,
                    database_type: this.config.type,
                    operation: 'query',
                    result: 'success',
                });
                span.setAttributes({
                    row_count: result.rowCount,
                    field_count: result.fields.length,
                    execution_time: executionTime,
                });
                this.emit('queryExecuted', {
                    tenantId: this.tenantId,
                    sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
                    rowCount: result.rowCount,
                    executionTime,
                });
                return result;
            }
            catch (error) {
                span.recordException?.(error);
                span.setStatus?.({ message: error.message });
                jdbcOperations.inc({
                    tenant_id: this.tenantId,
                    database_type: this.config.type,
                    operation: 'query',
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end?.();
            }
        });
    }
    /**
     * Stream query results.
     * Returns a standard Node.js Readable stream.
     *
     * For PostgreSQL: Wraps pg-cursor in a Readable stream.
     * For MySQL: Returns the native stream.
     */
    async queryStream(sql, params = [], options = {}) {
        return tracer.startActiveSpan('jdbc.query_stream', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                database_type: this.config.type,
                sql_length: sql.length,
                stream: true,
            });
            if (!this.connected || !this.pool) {
                throw new Error('Database not connected');
            }
            try {
                if (this.config.type === 'postgresql') {
                    const client = await this.pool.connect();
                    const Cursor = await Promise.resolve().then(() => __importStar(require('pg-cursor'))).then((m) => m.default || m);
                    const cursor = client.query(new Cursor(sql, params));
                    const fetchSize = options.fetchSize || 100;
                    // Wrap Cursor in Readable
                    const stream = new stream_1.Readable({
                        objectMode: true,
                        read() {
                            cursor.read(fetchSize, (err, rows) => {
                                if (err) {
                                    this.destroy(err);
                                    return;
                                }
                                if (!rows || rows.length === 0) {
                                    this.push(null);
                                }
                                else {
                                    rows.forEach((row) => this.push(row));
                                }
                            });
                        },
                        destroy(err, callback) {
                            cursor.close(() => {
                                client.release();
                                callback(err);
                            });
                        },
                    });
                    return stream;
                }
                else if (this.config.type === 'mysql') {
                    const connection = await this.pool.getConnection();
                    const stream = connection.connection
                        .query(sql, params)
                        .stream({ highWaterMark: options.fetchSize || 100 });
                    stream.on('end', () => {
                        connection.release();
                    });
                    stream.on('error', () => {
                        connection.release();
                    });
                    return stream;
                }
                else {
                    throw new Error('Unsupported database type for streaming');
                }
            }
            catch (error) {
                span.recordException?.(error);
                throw error;
            }
        });
    }
    async executePostgreSQLQuery(sql, params, options) {
        const client = await this.pool.connect();
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
                fields: pgResult.fields.map((field) => ({
                    name: field.name,
                    type: this.mapPostgreSQLType(field.dataTypeID),
                    nullable: true, // PostgreSQL doesn't provide this info easily
                })),
                executionTime: 0, // Will be set by caller
            };
        }
        finally {
            client.release();
        }
    }
    async executeMySQLQuery(sql, params, options) {
        const connection = await this.pool.getConnection();
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
                fields: Array.isArray(fields)
                    ? fields.map((field) => ({
                        name: field.name,
                        type: this.mapMySQLType(field.type),
                        nullable: (field.flags & 1) === 0, // NOT_NULL flag
                        length: field.length,
                    }))
                    : [],
                executionTime: 0, // Will be set by caller
            };
        }
        finally {
            connection.release();
        }
    }
    async batchExecute(sqls, paramSets, options = {}) {
        return tracer.startActiveSpan('jdbc.batch_execute', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                database_type: this.config.type,
                batch_size: sqls.length,
            });
            if (!this.connected || !this.pool) {
                throw new Error('Database not connected');
            }
            const startTime = Date.now();
            const affectedRows = [];
            const errors = [];
            let totalRows = 0;
            try {
                for (let i = 0; i < sqls.length; i++) {
                    try {
                        const result = await this.query(sqls[i], paramSets[i] || [], options);
                        affectedRows.push(result.rowCount);
                        totalRows += result.rowCount;
                    }
                    catch (error) {
                        affectedRows.push(0);
                        errors.push({ index: i, error: error.message });
                    }
                }
                const executionTime = Date.now() - startTime;
                jdbcLatency.observe({ database_type: this.config.type, operation: 'batch' }, executionTime);
                jdbcOperations.inc({
                    tenant_id: this.tenantId,
                    database_type: this.config.type,
                    operation: 'batch',
                    result: errors.length > 0 ? 'partial' : 'success',
                });
                span.setAttributes({
                    total_rows: totalRows,
                    error_count: errors.length,
                    execution_time: executionTime,
                });
                const result = {
                    totalRows,
                    affectedRows,
                    executionTime,
                    errors: errors.length > 0 ? errors : undefined,
                };
                this.emit('batchExecuted', {
                    tenantId: this.tenantId,
                    batchSize: sqls.length,
                    totalRows,
                    errorCount: errors.length,
                    executionTime,
                });
                return result;
            }
            catch (error) {
                span.recordException?.(error);
                span.setStatus?.({ message: error.message });
                jdbcOperations.inc({
                    tenant_id: this.tenantId,
                    database_type: this.config.type,
                    operation: 'batch',
                    result: 'error',
                });
                throw error;
            }
            finally {
                span.end?.();
            }
        });
    }
    async getSchemaInfo(schemaName) {
        return tracer.startActiveSpan('jdbc.get_schema_info', async (span) => {
            span.setAttributes?.({
                tenant_id: this.tenantId,
                database_type: this.config.type,
                schema_name: schemaName || 'default',
            });
            try {
                if (this.config.type === 'postgresql') {
                    return await this.getPostgreSQLSchemaInfo(schemaName || 'public');
                }
                else {
                    return await this.getMySQLSchemaInfo(schemaName || this.config.database);
                }
            }
            catch (error) {
                span.recordException?.(error);
                span.setStatus?.({ message: error.message });
                throw error;
            }
            finally {
                span.end?.();
            }
        });
    }
    async getPostgreSQLSchemaInfo(schemaName) {
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
            this.query(indexesQuery, [schemaName]),
        ]);
        return {
            tables: tablesResult.rows.map((row) => ({
                name: row.table_name,
                schema: row.table_schema,
                type: row.table_type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
                comment: row.comment,
            })),
            columns: columnsResult.rows.map((row) => ({
                table: row.table_name,
                name: row.column_name,
                type: row.data_type,
                nullable: row.nullable,
                defaultValue: row.default_value,
                isPrimaryKey: row.is_primary_key,
                isForeignKey: row.is_foreign_key,
            })),
            indexes: indexesResult.rows.map((row) => ({
                table: row.table_name,
                name: row.index_name,
                columns: row.columns,
                unique: row.unique,
                type: row.type,
            })),
        };
    }
    async getMySQLSchemaInfo(databaseName) {
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
            this.query(indexesQuery, [databaseName]),
        ]);
        return {
            tables: tablesResult.rows.map((row) => ({
                name: row.table_name,
                schema: row.table_schema,
                type: row.table_type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
                comment: row.comment,
            })),
            columns: columnsResult.rows.map((row) => ({
                table: row.table_name,
                name: row.column_name,
                type: row.data_type,
                nullable: row.nullable,
                defaultValue: row.default_value,
                isPrimaryKey: row.is_primary_key,
                isForeignKey: row.is_foreign_key,
            })),
            indexes: indexesResult.rows.map((row) => ({
                table: row.table_name,
                name: row.index_name,
                columns: row.columns.split(','),
                unique: row.unique,
                type: row.type,
            })),
        };
    }
    mapPostgreSQLType(typeId) {
        const typeMap = {
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
            2950: 'uuid',
        };
        return typeMap[typeId] || `unknown(${typeId})`;
    }
    mapMySQLType(type) {
        const typeMap = {
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
            254: 'char',
        };
        return typeMap[type] || `unknown(${type})`;
    }
    async testConnection() {
        const startTime = Date.now();
        try {
            if (this.config.type === 'postgresql') {
                await this.query('SELECT 1 as test');
            }
            else {
                await this.query('SELECT 1 as test');
            }
            return {
                connected: true,
                latency: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                connected: false,
                latency: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async disconnect() {
        if (this.pool) {
            if (this.config.type === 'postgresql') {
                await this.pool.end();
            }
            else {
                await this.pool.end();
            }
            this.pool = null;
            this.connected = false;
            jdbcConnections.dec({
                tenant_id: this.tenantId,
                database_type: this.config.type,
                host: this.config.host,
            });
            this.emit('disconnected', {
                tenantId: this.tenantId,
                type: this.config.type,
                host: this.config.host,
            });
        }
    }
    getTenantId() {
        return this.tenantId;
    }
    getConfig() {
        // Return config without sensitive data
        const { password, ...safeConfig } = this.config;
        return safeConfig;
    }
    isConnected() {
        return this.connected && this.pool !== null;
    }
    getDatabaseType() {
        return this.config.type;
    }
}
exports.JDBCConnector = JDBCConnector;

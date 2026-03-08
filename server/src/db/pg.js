"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pg = exports.pool = void 0;
// @ts-nocheck
const pg_1 = require("pg");
const api_1 = require("@opentelemetry/api");
const prom_client_1 = require("prom-client");
const redis_js_1 = require("../cache/redis.js");
const query_scope_js_1 = require("./query-scope.js");
const tracer = api_1.trace.getTracer('maestro-postgres', '24.3.0');
// Reviver to restore Date objects from JSON cache
const jsonDateReviver = (key, value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime()))
            return date;
    }
    return value;
};
const toInt = (value, fallback) => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const writePoolSize = toInt(process.env.PG_WRITE_POOL_SIZE, 20);
const readPoolSize = toInt(process.env.PG_READ_POOL_SIZE, 30);
const idleTimeoutMs = toInt(process.env.PG_IDLE_TIMEOUT_MS, 30000);
const connectionTimeoutMs = toInt(process.env.PG_CONNECTION_TIMEOUT_MS, 5000);
const maxUses = toInt(process.env.PG_POOL_MAX_USES, 5000);
const statementTimeoutMs = toInt(process.env.PG_STATEMENT_TIMEOUT_MS, 0);
// Region-aware database metrics
function createCounter(config) {
    try {
        return new prom_client_1.Counter(config);
    }
    catch (e) {
        return { inc: () => { }, labels: () => ({ inc: () => { } }) };
    }
}
function createHistogram(config) {
    try {
        return new prom_client_1.Histogram(config);
    }
    catch (e) {
        return { observe: () => { }, labels: () => ({ observe: () => { } }) };
    }
}
const dbConnectionsActive = prom_client_1.register?.getSingleMetric('db_connections_active_total') ||
    createCounter({
        name: 'db_connections_active_total',
        help: 'Total active database connections',
        labelNames: ['region', 'pool_type', 'tenant_id'],
    });
const dbQueryDuration = prom_client_1.register?.getSingleMetric('db_query_duration_seconds') ||
    createHistogram({
        name: 'db_query_duration_seconds',
        help: 'Database query duration',
        labelNames: ['region', 'pool_type', 'operation', 'tenant_id'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    });
const dbReplicationLag = prom_client_1.register?.getSingleMetric('db_replication_lag_seconds') ||
    createHistogram({
        name: 'db_replication_lag_seconds',
        help: 'Database replication lag in seconds',
        labelNames: ['region', 'primary_region'],
        buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
    });
// Connection pools for read/write separation
const writePool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_WRITE_URL,
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : false,
    max: writePoolSize,
    idleTimeoutMillis: idleTimeoutMs,
    connectionTimeoutMillis: connectionTimeoutMs,
    maxUses,
    keepAlive: true,
    ...(statementTimeoutMs > 0
        ? { statement_timeout: statementTimeoutMs }
        : {}),
    application_name: `maestro-write-${process.env.CURRENT_REGION || 'unknown'}`,
});
const readPool = new pg_1.Pool({
    connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : false,
    max: readPoolSize, // More read connections
    idleTimeoutMillis: idleTimeoutMs,
    connectionTimeoutMillis: connectionTimeoutMs,
    maxUses,
    keepAlive: true,
    ...(statementTimeoutMs > 0
        ? { statement_timeout: statementTimeoutMs }
        : {}),
    application_name: `maestro-read-${process.env.CURRENT_REGION || 'unknown'}`,
});
// Legacy pool for backward compatibility
exports.pool = writePool;
// Helper function to determine query type and select appropriate pool
function getPoolForQuery(query, forceWrite = false) {
    const operation = query.trim().split(' ')[0].toLowerCase();
    const isWriteOperation = [
        'insert',
        'update',
        'delete',
        'create',
        'alter',
        'drop',
        'truncate',
    ].includes(operation);
    if (forceWrite ||
        isWriteOperation ||
        process.env.READ_ONLY_REGION !== 'true') {
        return { pool: writePool, poolType: 'write' };
    }
    else {
        return { pool: readPool, poolType: 'read' };
    }
}
async function _executeQuery(spanName, query, params, options, returnMany) {
    return tracer.startActiveSpan(spanName, async (span) => {
        const operation = query.split(' ')[0].toLowerCase();
        const { pool: selectedPool, poolType } = options.poolType
            ? {
                pool: options.poolType === 'read' ? readPool : writePool,
                poolType: options.poolType,
            }
            : getPoolForQuery(query, options?.forceWrite);
        const currentRegion = process.env.CURRENT_REGION || 'unknown';
        span.setAttributes({
            'db.system': 'postgresql',
            'db.statement': query,
            'db.operation': operation,
            'db.pool_type': poolType,
            'db.region': currentRegion,
            tenant_id: options?.tenantId || 'unknown',
        });
        const scopedQuery = (0, query_scope_js_1.validateAndScopeQuery)(query, params, options?.tenantId);
        const startTime = Date.now();
        try {
            dbConnectionsActive.inc({
                region: currentRegion,
                pool_type: poolType,
                tenant_id: options?.tenantId || 'unknown',
            });
            const result = await selectedPool.query(scopedQuery.query, scopedQuery.params);
            const duration = (Date.now() - startTime) / 1000;
            dbQueryDuration.observe({
                region: currentRegion,
                pool_type: poolType,
                operation,
                tenant_id: options?.tenantId || 'unknown',
            }, duration);
            span.setAttributes({
                'db.rows_affected': result.rowCount || 0,
                'db.tenant_scoped': scopedQuery.wasScoped,
                'db.query_duration': duration,
            });
            return returnMany ? result.rows : result.rows[0] || null;
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
exports.pg = {
    // Legacy method with automatic pool selection
    oneOrNone: async (query, params = [], options) => {
        return _executeQuery('postgres.query', query, params, options || {}, false);
    },
    // Explicit read-only method
    read: async (query, params = [], options) => {
        if (options?.cache) {
            try {
                const redis = redis_js_1.RedisService.getInstance();
                const cached = await redis.get(options.cache.key);
                if (cached) {
                    return JSON.parse(cached, jsonDateReviver);
                }
            }
            catch (e) {
                console.warn('Cache retrieval failed:', e);
            }
        }
        const result = await _executeQuery('postgres.read', query, params, { ...options, poolType: 'read' }, false);
        if (options?.cache && result) {
            try {
                const redis = redis_js_1.RedisService.getInstance();
                await redis.set(options.cache.key, JSON.stringify(result), options.cache.ttl);
            }
            catch (e) {
                console.warn('Cache set failed:', e);
            }
        }
        return result;
    },
    // Explicit write method
    write: async (query, params = [], options) => {
        return _executeQuery('postgres.write', query, params, { ...options, poolType: 'write' }, false);
    },
    // Read many records
    readMany: async (query, params = [], options) => {
        if (options?.cache) {
            try {
                const redis = redis_js_1.RedisService.getInstance();
                const cached = await redis.get(options.cache.key);
                if (cached) {
                    return JSON.parse(cached);
                }
            }
            catch (e) {
                console.warn('Cache retrieval failed:', e);
            }
        }
        const result = await _executeQuery('postgres.read_many', query, params, { ...options, poolType: 'read' }, true);
        if (options?.cache && result) {
            try {
                const redis = redis_js_1.RedisService.getInstance();
                await redis.set(options.cache.key, JSON.stringify(result), options.cache.ttl);
            }
            catch (e) {
                console.warn('Cache set failed:', e);
            }
        }
        return result;
    },
    many: async (query, params = [], options) => {
        return tracer.startActiveSpan('postgres.query.many', async (span) => {
            span.setAttributes({
                'db.system': 'postgresql',
                'db.statement': query,
                'db.operation': query.split(' ')[0].toLowerCase(),
                tenant_id: options?.tenantId || 'unknown',
            });
            // Enhanced tenant scoping validation
            const scopedQuery = (0, query_scope_js_1.validateAndScopeQuery)(query, params, options?.tenantId);
            try {
                const result = await exports.pool.query(scopedQuery.query, scopedQuery.params);
                span.setAttributes({
                    'db.rows_affected': result.rowCount || 0,
                    'db.tenant_scoped': scopedQuery.wasScoped,
                });
                return result.rows;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                throw error;
            }
            finally {
                span.end();
            }
        });
    },
    // Tenant-scoped transaction support
    withTenant: async (tenantId, callback) => {
        return tracer.startActiveSpan('postgres.with_tenant', async (span) => {
            span.setAttributes({
                tenant_id: tenantId,
                'db.system': 'postgresql',
            });
            const scopedPg = {
                oneOrNone: (query, params = []) => exports.pg.oneOrNone(query, params, { tenantId }),
                many: (query, params = []) => exports.pg.many(query, params, { tenantId }),
            };
            try {
                return await callback(scopedPg);
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                throw error;
            }
            finally {
                span.end();
            }
        });
    },
    // Generic transaction support
    transaction: async (callback) => {
        const client = await exports.pool.connect();
        try {
            await client.query('BEGIN');
            const tx = {
                query: async (text, params = []) => {
                    return (await client.query(text, params)).rows;
                },
            };
            const result = await callback(tx);
            await client.query('COMMIT');
            return result;
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    },
    healthCheck: async () => {
        try {
            await exports.pool.query('SELECT 1');
            return true;
        }
        catch (error) {
            console.error('PostgreSQL health check failed:', error);
            return false;
        }
    },
    close: async () => {
        await exports.pool.end();
    },
};

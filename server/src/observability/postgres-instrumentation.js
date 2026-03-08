"use strict";
/**
 * PostgreSQL Connection Pool Instrumentation
 * Monitors pool health, connection metrics, and query performance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorPostgresPool = monitorPostgresPool;
exports.instrumentPostgresPool = instrumentPostgresPool;
exports.getPoolStats = getPoolStats;
const enhanced_metrics_js_1 = require("./enhanced-metrics.js");
const metrics_js_1 = require("../monitoring/metrics.js");
const tracer_js_1 = require("./tracer.js");
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'postgres-instrumentation' });
/**
 * Start monitoring PostgreSQL connection pool metrics
 */
function monitorPostgresPool(pool, poolName = 'default', intervalMs = 15000) {
    const monitorInterval = setInterval(() => {
        try {
            // Access pool internals (these are available in pg Pool)
            const totalCount = pool.totalCount || 0;
            const idleCount = pool.idleCount || 0;
            const waitingCount = pool.waitingCount || 0;
            // Update metrics
            (0, enhanced_metrics_js_1.recordDbPoolStats)('postgresql', poolName, {
                total: totalCount,
                active: totalCount - idleCount,
                idle: idleCount,
                waiting: waitingCount,
            });
            logger.debug({
                poolName,
                total: totalCount,
                active: totalCount - idleCount,
                idle: idleCount,
                waiting: waitingCount,
            }, 'PostgreSQL pool stats');
        }
        catch (error) {
            logger.error({ poolName, error: error.message }, 'Failed to collect pool stats');
        }
    }, intervalMs);
    // Allow process to exit even if interval is active
    if (typeof monitorInterval.unref === 'function') {
        monitorInterval.unref();
    }
    return monitorInterval;
}
/**
 * Instrument PostgreSQL pool with metrics and tracing
 */
function instrumentPostgresPool(pool, poolName = 'default') {
    // Monitor pool events
    pool.on('error', (error, client) => {
        enhanced_metrics_js_1.dbConnectionErrors.inc({
            database: 'postgresql',
            pool: poolName,
            error_type: error.name || 'Error',
        });
        logger.error({ poolName, error: error.message }, 'PostgreSQL pool error');
    });
    pool.on('connect', (client) => {
        logger.debug({ poolName }, 'New PostgreSQL client connected to pool');
    });
    pool.on('acquire', (client) => {
        logger.debug({ poolName }, 'PostgreSQL client acquired from pool');
    });
    pool.on('remove', (client) => {
        logger.debug({ poolName }, 'PostgreSQL client removed from pool');
    });
    // Start monitoring pool metrics
    monitorPostgresPool(pool, poolName);
    // Wrap query method with metrics and tracing
    const originalQuery = pool.query.bind(pool);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pool.query = async function (queryTextOrConfig, values, callback) {
        const queryText = typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text;
        const operation = extractOperationType(queryText);
        const startTime = Date.now();
        const tracer = (0, tracer_js_1.getTracer)();
        // Measure connection acquisition time
        const acquireStart = Date.now();
        let connectionAcquired = false;
        try {
            // Trace the database query
            return await tracer.withSpan(`db.postgresql.${operation}`, async (span) => {
                span.setAttributes({
                    'db.system': 'postgresql',
                    'db.operation': operation,
                    'db.statement': queryText.length > 500 ? queryText.substring(0, 500) + '...' : queryText,
                    'db.pool': poolName,
                });
                const result = await originalQuery(queryTextOrConfig, values, callback);
                // Connection was successfully acquired
                if (!connectionAcquired) {
                    const acquireDuration = (Date.now() - acquireStart) / 1000;
                    enhanced_metrics_js_1.dbConnectionAcquisitionDuration.observe({ database: 'postgresql', pool: poolName }, acquireDuration);
                    connectionAcquired = true;
                }
                const duration = (Date.now() - startTime) / 1000;
                // Record metrics
                metrics_js_1.dbQueryDuration.observe({ database: 'postgresql', operation }, duration);
                metrics_js_1.dbQueriesTotal.inc({ database: 'postgresql', operation, status: 'success' });
                // Add result size to span
                span.setAttribute('db.result.rows', result?.rows?.length || 0);
                return result;
            }, { kind: api_1.SpanKind.CLIENT });
        }
        catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            metrics_js_1.dbQueryDuration.observe({ database: 'postgresql', operation }, duration);
            metrics_js_1.dbQueriesTotal.inc({ database: 'postgresql', operation, status: 'error' });
            enhanced_metrics_js_1.dbConnectionErrors.inc({
                database: 'postgresql',
                pool: poolName,
                error_type: 'query_error',
            });
            logger.error({
                poolName,
                operation,
                error: error.message,
                duration,
            }, 'PostgreSQL query failed');
            throw error;
        }
    };
    return pool;
}
/**
 * Extract operation type from SQL query
 */
function extractOperationType(query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.startsWith('select'))
        return 'select';
    if (normalizedQuery.startsWith('insert'))
        return 'insert';
    if (normalizedQuery.startsWith('update'))
        return 'update';
    if (normalizedQuery.startsWith('delete'))
        return 'delete';
    if (normalizedQuery.startsWith('create'))
        return 'create';
    if (normalizedQuery.startsWith('drop'))
        return 'drop';
    if (normalizedQuery.startsWith('alter'))
        return 'alter';
    if (normalizedQuery.startsWith('truncate'))
        return 'truncate';
    if (normalizedQuery.startsWith('begin'))
        return 'begin';
    if (normalizedQuery.startsWith('commit'))
        return 'commit';
    if (normalizedQuery.startsWith('rollback'))
        return 'rollback';
    if (normalizedQuery.startsWith('with'))
        return 'with'; // CTE
    return 'other';
}
/**
 * Get current pool statistics
 */
function getPoolStats(pool) {
    const totalCount = pool.totalCount || 0;
    const idleCount = pool.idleCount || 0;
    const waitingCount = pool.waitingCount || 0;
    return {
        total: totalCount,
        active: totalCount - idleCount,
        idle: idleCount,
        waiting: waitingCount,
    };
}

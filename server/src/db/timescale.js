"use strict";
// @ts-nocheck
/**
 * IntelGraph TimescaleDB Connection - GA-Core Enhanced
 * Committee Specification: Temporal functions with event hypertables
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timescalePool = void 0;
exports.query = query;
exports.insertEvent = insertEvent;
exports.queryTemporalPatterns = queryTemporalPatterns;
exports.insertAnalyticsTrace = insertAnalyticsTrace;
exports.healthCheck = healthCheck;
exports.closePool = closePool;
const pg_1 = require("pg");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// Enhanced connection configuration for GA-Core
const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'intelgraph',
    user: process.env.POSTGRES_USER || 'intelgraph',
    password: process.env.POSTGRES_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};
exports.timescalePool = new pg_1.Pool(config);
// Enhanced error handling for GA-Core reliability
exports.timescalePool.on('error', (err) => {
    logger_js_1.default.error({
        message: 'TimescaleDB pool error',
        error: err instanceof Error ? err.message : String(err),
        config: {
            host: config.host,
            port: config.port,
            database: config.database,
        },
    });
});
exports.timescalePool.on('connect', (client) => {
    logger_js_1.default.info({
        message: 'TimescaleDB client connected',
        totalCount: exports.timescalePool.totalCount,
        idleCount: exports.timescalePool.idleCount,
    });
});
// Committee requirement: Query performance monitoring
async function query(text, params) {
    const start = Date.now();
    const client = await exports.timescalePool.connect();
    try {
        const result = await client.query(text, params);
        const duration = Date.now() - start;
        // Committee spec: Log slow queries for GA-Core optimization
        if (duration > 1000) {
            logger_js_1.default.warn({
                message: 'Slow TimescaleDB query detected',
                duration,
                query: text.substring(0, 100) + '...',
                paramCount: params?.length || 0,
                rowCount: result.rowCount,
            });
        }
        // Committee spec: Performance metrics for XAI tracing
        if (duration > 5000) {
            logger_js_1.default.error({
                message: 'Critical TimescaleDB performance issue',
                duration,
                query: text.substring(0, 200),
                severity: 'HIGH',
            });
        }
        return result;
    }
    finally {
        client.release();
    }
}
// Committee requirement: Temporal event insertion
async function insertEvent(eventData) {
    const { event_type, event_source, entity_id, entity_type, observed_at = new Date(), metadata = {}, confidence = 1.0, severity = 'INFO', tags = [], } = eventData;
    const insertQuery = `
    INSERT INTO events (
      event_type, event_source, entity_id, entity_type,
      observed_at, metadata, confidence, severity, tags
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, observed_at
  `;
    return query(insertQuery, [
        event_type,
        event_source,
        entity_id,
        entity_type,
        observed_at,
        JSON.stringify(metadata),
        confidence,
        severity,
        tags,
    ]);
}
// Committee requirement: Temporal pattern analysis
async function queryTemporalPatterns(entityId, timeRange, patternType) {
    let whereClause = 'WHERE entity_id = $1 AND observed_at BETWEEN $2 AND $3';
    const params = [entityId, timeRange.start, timeRange.end];
    if (patternType) {
        whereClause += ' AND event_type = $4';
        params.push(patternType);
    }
    const query_text = `
    SELECT
      event_type,
      COUNT(*) as event_count,
      AVG(confidence) as avg_confidence,
      MIN(observed_at) as first_occurrence,
      MAX(observed_at) as last_occurrence,
      array_agg(DISTINCT severity) as severities
    FROM events
    ${whereClause}
    GROUP BY event_type
    ORDER BY event_count DESC
  `;
    return query(query_text, params);
}
// Committee requirement: XAI analytics tracing
async function insertAnalyticsTrace(traceData) {
    const { trace_id, operation_type, execution_time = new Date(), duration_ms, input_hash, output_hash, model_version = 'ga-core-1.0', performance_metrics = {}, } = traceData;
    const insertQuery = `
    INSERT INTO analytics_traces (
      trace_id, operation_type, execution_time, duration_ms,
      input_hash, output_hash, model_version, performance_metrics
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `;
    return query(insertQuery, [
        trace_id,
        operation_type,
        execution_time,
        duration_ms,
        input_hash,
        output_hash,
        model_version,
        JSON.stringify(performance_metrics),
    ]);
}
// Health check for committee's golden path smoke test
async function healthCheck() {
    try {
        const result = await query('SELECT NOW(), version()');
        return result.rowCount !== null && result.rowCount > 0;
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'TimescaleDB health check failed',
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
// Committee requirement: Graceful shutdown
async function closePool() {
    try {
        await exports.timescalePool.end();
        logger_js_1.default.info({ message: 'TimescaleDB pool closed gracefully' });
    }
    catch (error) {
        logger_js_1.default.error({
            message: 'Error closing TimescaleDB pool',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
exports.default = {
    query,
    insertEvent,
    queryTemporalPatterns,
    insertAnalyticsTrace,
    healthCheck,
    closePool,
    pool: exports.timescalePool,
};

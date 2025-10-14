/**
 * IntelGraph TimescaleDB Connection - GA-Core Enhanced
 * Committee Specification: Temporal functions with event hypertables
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
import { Pool } from 'pg';
import logger from '../utils/logger.js';
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
export const timescalePool = new Pool(config);
// Enhanced error handling for GA-Core reliability
timescalePool.on('error', (err) => {
    logger.error({
        message: 'TimescaleDB pool error',
        error: err instanceof Error ? err.message : String(err),
        config: {
            host: config.host,
            port: config.port,
            database: config.database,
        },
    });
});
timescalePool.on('connect', (client) => {
    logger.info({
        message: 'TimescaleDB client connected',
        totalCount: timescalePool.totalCount,
        idleCount: timescalePool.idleCount,
    });
});
// Committee requirement: Query performance monitoring
export async function query(text, params) {
    const start = Date.now();
    const client = await timescalePool.connect();
    try {
        const result = await client.query(text, params);
        const duration = Date.now() - start;
        // Committee spec: Log slow queries for GA-Core optimization
        if (duration > 1000) {
            logger.warn({
                message: 'Slow TimescaleDB query detected',
                duration,
                query: text.substring(0, 100) + '...',
                paramCount: params?.length || 0,
                rowCount: result.rowCount,
            });
        }
        // Committee spec: Performance metrics for XAI tracing
        if (duration > 5000) {
            logger.error({
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
export async function insertEvent(eventData) {
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
export async function queryTemporalPatterns(entityId, timeRange, patternType) {
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
export async function insertAnalyticsTrace(traceData) {
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
export async function healthCheck() {
    try {
        const result = await query('SELECT NOW(), version()');
        return result.rowCount !== null && result.rowCount > 0;
    }
    catch (error) {
        logger.error({
            message: 'TimescaleDB health check failed',
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
// Committee requirement: Graceful shutdown
export async function closePool() {
    try {
        await timescalePool.end();
        logger.info({ message: 'TimescaleDB pool closed gracefully' });
    }
    catch (error) {
        logger.error({
            message: 'Error closing TimescaleDB pool',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
export default {
    query,
    insertEvent,
    queryTemporalPatterns,
    insertAnalyticsTrace,
    healthCheck,
    closePool,
    pool: timescalePool,
};
//# sourceMappingURL=timescale.js.map
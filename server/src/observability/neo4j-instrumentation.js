"use strict";
/**
 * Neo4j Driver Instrumentation
 * Monitors Neo4j sessions, transactions, and query performance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentNeo4jDriver = instrumentNeo4jDriver;
exports.getNeo4jStats = getNeo4jStats;
exports.resetNeo4jStats = resetNeo4jStats;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const enhanced_metrics_js_1 = require("./enhanced-metrics.js");
const neo4jMetrics_js_1 = require("../metrics/neo4jMetrics.js");
const tracer_js_1 = require("./tracer.js");
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'neo4j-instrumentation' });
// Track active sessions
let activeSessionCount = 0;
/**
 * Instrument Neo4j driver with observability
 */
function instrumentNeo4jDriver(driver) {
    // Wrap session creation
    const originalSession = driver.session.bind(driver);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    driver.session = function (config) {
        const session = originalSession(config);
        const mode = config?.defaultAccessMode === neo4j_driver_1.default.session.WRITE ? 'write' : 'read';
        // Track session lifecycle
        activeSessionCount++;
        enhanced_metrics_js_1.neo4jSessionsActive.set(activeSessionCount);
        logger.debug({ mode, activeSessions: activeSessionCount }, 'Neo4j session created');
        // Wrap session close
        const originalClose = session.close.bind(session);
        session.close = async function () {
            activeSessionCount--;
            enhanced_metrics_js_1.neo4jSessionsActive.set(activeSessionCount);
            logger.debug({ mode, activeSessions: activeSessionCount }, 'Neo4j session closed');
            return originalClose();
        };
        // Wrap session run method with metrics
        const originalRun = session.run.bind(session);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.run = async function (query, parameters) {
            const operation = extractCypherOperation(query);
            const startTime = Date.now();
            const tracer = (0, tracer_js_1.getTracer)();
            return tracer.withSpan(`db.neo4j.${operation}`, async (span) => {
                span.setAttributes({
                    'db.system': 'neo4j',
                    'db.operation': operation,
                    'db.statement': query.length > 500 ? query.substring(0, 500) + '...' : query,
                    'db.neo4j.access_mode': mode,
                });
                try {
                    const result = await originalRun(query, parameters);
                    const duration = Date.now() - startTime;
                    // Record metrics
                    neo4jMetrics_js_1.neo4jQueryTotal.inc({ operation, label: 'success' });
                    neo4jMetrics_js_1.neo4jQueryLatencyMs.observe({ operation, label: 'success' }, duration);
                    // Count records
                    const records = await result.records;
                    const recordCount = Array.isArray(records) ? records.length : 0;
                    enhanced_metrics_js_1.neo4jResultSize.observe({ operation }, recordCount);
                    span.setAttribute('db.neo4j.result_count', recordCount);
                    logger.debug({
                        operation,
                        duration,
                        recordCount,
                    }, 'Neo4j query completed');
                    return { ...result, records };
                }
                catch (error) {
                    const duration = Date.now() - startTime;
                    neo4jMetrics_js_1.neo4jQueryErrorsTotal.inc({ operation, label: 'error' });
                    neo4jMetrics_js_1.neo4jQueryLatencyMs.observe({ operation, label: 'error' }, duration);
                    logger.error({
                        operation,
                        duration,
                        error: error.message,
                    }, 'Neo4j query failed');
                    throw error;
                }
            }, { kind: api_1.SpanKind.CLIENT });
        };
        // Wrap transaction methods
        wrapTransactionMethods(session, mode);
        return session;
    };
    return driver;
}
/**
 * Wrap transaction methods with metrics
 */
function wrapTransactionMethods(session, mode) {
    // Wrap readTransaction
    const originalReadTransaction = session.readTransaction?.bind(session);
    if (originalReadTransaction) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.readTransaction = async function (transactionWork) {
            const startTime = Date.now();
            try {
                const result = await originalReadTransaction(transactionWork);
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.neo4jTransactionDuration.observe({ mode: 'read' }, duration);
                return result;
            }
            catch (error) {
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.neo4jTransactionDuration.observe({ mode: 'read' }, duration);
                throw error;
            }
        };
    }
    // Wrap writeTransaction
    const originalWriteTransaction = session.writeTransaction?.bind(session);
    if (originalWriteTransaction) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.writeTransaction = async function (transactionWork) {
            const startTime = Date.now();
            try {
                const result = await originalWriteTransaction(transactionWork);
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.neo4jTransactionDuration.observe({ mode: 'write' }, duration);
                return result;
            }
            catch (error) {
                const duration = (Date.now() - startTime) / 1000;
                enhanced_metrics_js_1.neo4jTransactionDuration.observe({ mode: 'write' }, duration);
                throw error;
            }
        };
    }
}
/**
 * Extract operation type from Cypher query
 */
function extractCypherOperation(query) {
    const normalizedQuery = query.trim().toLowerCase();
    // Match patterns
    if (normalizedQuery.startsWith('match'))
        return 'match';
    if (normalizedQuery.startsWith('create'))
        return 'create';
    if (normalizedQuery.startsWith('merge'))
        return 'merge';
    if (normalizedQuery.startsWith('delete'))
        return 'delete';
    if (normalizedQuery.startsWith('remove'))
        return 'remove';
    if (normalizedQuery.startsWith('set'))
        return 'set';
    if (normalizedQuery.includes('call db.index'))
        return 'index';
    if (normalizedQuery.startsWith('call'))
        return 'procedure';
    if (normalizedQuery.startsWith('with'))
        return 'with';
    if (normalizedQuery.startsWith('unwind'))
        return 'unwind';
    if (normalizedQuery.startsWith('return'))
        return 'return';
    // Check for multi-clause queries
    if (normalizedQuery.includes('create') && normalizedQuery.includes('match')) {
        return 'match_create';
    }
    if (normalizedQuery.includes('merge') && normalizedQuery.includes('match')) {
        return 'match_merge';
    }
    return 'other';
}
/**
 * Get Neo4j driver statistics
 */
function getNeo4jStats() {
    return {
        activeSessions: activeSessionCount,
    };
}
/**
 * Reset session counter (useful for testing)
 */
function resetNeo4jStats() {
    activeSessionCount = 0;
    enhanced_metrics_js_1.neo4jSessionsActive.set(0);
}

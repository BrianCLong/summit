"use strict";
/**
 * OTEL spans and Prometheus metrics for Safe Mutations system
 * Comprehensive observability for budget enforcement, rate limiting, and rollbacks
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = exports.SafeMutationMetrics = exports.SafeMutationTracing = void 0;
exports.createMetricsContext = createMetricsContext;
exports.getPrometheusMetrics = getPrometheusMetrics;
exports.startMetricsCollection = startMetricsCollection;
exports.stopMetricsCollection = stopMetricsCollection;
const telemetry_js_1 = require("../observability/telemetry.js");
const prom_client_1 = require("prom-client");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// No-op tracer provided by observability/telemetry.ts
// Prometheus metrics
const budgetDenialsTotal = new prom_client_1.Counter({
    name: 'budget_denials_total',
    help: 'Total number of budget denials by reason, tenant, provider, and model',
    labelNames: ['reason', 'tenant', 'provider', 'model', 'field_name'],
    registers: [prom_client_1.register],
});
const tokenEstimationErrorRatio = new prom_client_1.Histogram({
    name: 'token_estimation_error_ratio',
    help: 'Ratio of actual to estimated tokens (for accuracy tracking)',
    buckets: [0.5, 0.7, 0.9, 1.0, 1.1, 1.3, 1.5, 2.0, 3.0],
    labelNames: ['provider', 'model', 'estimation_method'],
    registers: [prom_client_1.register],
});
const rollbackEventsTotal = new prom_client_1.Counter({
    name: 'rollback_events_total',
    help: 'Total number of rollback events by reason and type',
    labelNames: ['reason', 'type', 'tenant', 'operation'],
    registers: [prom_client_1.register],
});
const mutationLatencyMs = new prom_client_1.Histogram({
    name: 'mutation_latency_ms',
    help: 'Latency of safe mutations in milliseconds',
    buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
    labelNames: ['mutation', 'tenant', 'success'],
    registers: [prom_client_1.register],
});
const rateLimitHitsTotal = new prom_client_1.Counter({
    name: 'rate_limit_hits_total',
    help: 'Total number of rate limit hits by tenant and operation',
    labelNames: ['tenant', 'operation', 'bucket_type'],
    registers: [prom_client_1.register],
});
const activeTokenBuckets = new prom_client_1.Gauge({
    name: 'active_token_buckets_total',
    help: 'Number of active token buckets',
    labelNames: ['bucket_type'],
    registers: [prom_client_1.register],
});
const compensationLogSize = new prom_client_1.Gauge({
    name: 'compensation_log_size',
    help: 'Number of entries in compensation log',
    labelNames: ['status'],
    registers: [prom_client_1.register],
});
const tokenCacheHitRate = new prom_client_1.Histogram({
    name: 'token_cache_hit_rate',
    help: 'Token counting cache hit rate',
    buckets: [0.0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0],
    registers: [prom_client_1.register],
});
const budgetUsageRatio = new prom_client_1.Histogram({
    name: 'budget_usage_ratio',
    help: 'Ratio of used to total budget per tenant',
    buckets: [0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0],
    labelNames: ['tenant', 'time_window'],
    registers: [prom_client_1.register],
});
/**
 * OTEL span utilities for safe mutations
 */
class SafeMutationTracing {
    /**
     * Create a span for GraphQL budget enforcement
     */
    static async withBudgetSpan(fieldName, operation, attributes) {
        return telemetry_js_1.tracer.startActiveSpan(`graphql.budget.${fieldName}`, {
            kind: telemetry_js_1.SpanKind.INTERNAL,
            attributes: {
                'graphql.field.name': fieldName,
                'mutation.type': 'safe_mutation',
                ...attributes,
            },
        }, async (span) => {
            const startTime = Date.now();
            try {
                const result = await operation(span);
                span.setStatus({ code: telemetry_js_1.SpanStatusCode.OK });
                span.setAttributes({
                    'mutation.success': true,
                    'mutation.duration_ms': Date.now() - startTime,
                });
                return result;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                span.setStatus({
                    code: telemetry_js_1.SpanStatusCode.ERROR,
                    message: errorMessage,
                });
                span.setAttributes({
                    'mutation.success': false,
                    'mutation.duration_ms': Date.now() - startTime,
                    'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
                    'error.message': errorMessage,
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Create a span for token counting operations
     */
    static async withTokenCountSpan(provider, model, operation, attributes) {
        return telemetry_js_1.tracer.startActiveSpan(`tokcount.estimate`, {
            kind: telemetry_js_1.SpanKind.INTERNAL,
            attributes: {
                'tokcount.provider': provider,
                'tokcount.model': model,
                ...attributes,
            },
        }, async (span) => {
            try {
                const result = await operation(span);
                span.setStatus({ code: telemetry_js_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: telemetry_js_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Create a span for rate limiting operations
     */
    static async withRateLimitSpan(tenant, operation, operationFn) {
        return telemetry_js_1.tracer.startActiveSpan(`ratelimit.check`, {
            kind: telemetry_js_1.SpanKind.INTERNAL,
            attributes: {
                'ratelimit.tenant': tenant,
                'ratelimit.operation': operation,
            },
        }, operationFn);
    }
    /**
     * Create a span for compensation log operations
     */
    static async withCompensationSpan(correlationId, operationType, operation) {
        return telemetry_js_1.tracer.startActiveSpan(`compensation.${operationType}`, {
            kind: telemetry_js_1.SpanKind.INTERNAL,
            attributes: {
                'compensation.correlation_id': correlationId,
                'compensation.operation_type': operationType,
            },
        }, operation);
    }
}
exports.SafeMutationTracing = SafeMutationTracing;
/**
 * Metrics collection utilities
 */
class SafeMutationMetrics {
    /**
     * Record a budget denial
     */
    static recordBudgetDenial(reason, tenant, provider, model, fieldName) {
        budgetDenialsTotal.inc({
            reason,
            tenant,
            provider,
            model,
            field_name: fieldName,
        });
        logger_js_1.default.warn('Budget denial recorded', {
            reason,
            tenant,
            provider,
            model,
            fieldName,
        });
    }
    /**
     * Record token estimation accuracy
     */
    static recordTokenEstimationAccuracy(provider, model, estimationMethod, actualTokens, estimatedTokens) {
        const ratio = actualTokens / Math.max(estimatedTokens, 1);
        tokenEstimationErrorRatio
            .labels({ provider, model, estimation_method: estimationMethod })
            .observe(ratio);
    }
    /**
     * Record rollback event
     */
    static recordRollback(reason, type, tenant, operation) {
        rollbackEventsTotal.inc({ reason, type, tenant, operation });
        logger_js_1.default.warn('Rollback event recorded', {
            reason,
            type,
            tenant,
            operation,
        });
    }
    /**
     * Record mutation latency
     */
    static recordMutationLatency(mutation, tenant, durationMs, success) {
        mutationLatencyMs
            .labels({ mutation, tenant, success: success.toString() })
            .observe(durationMs);
    }
    /**
     * Record rate limit hit
     */
    static recordRateLimitHit(tenant, operation, bucketType) {
        rateLimitHitsTotal.inc({ tenant, operation, bucket_type: bucketType });
    }
    /**
     * Update active token buckets count
     */
    static updateActiveTokenBuckets(count, bucketType) {
        activeTokenBuckets.labels({ bucket_type: bucketType }).set(count);
    }
    /**
     * Update compensation log size
     */
    static updateCompensationLogSize(count, status) {
        compensationLogSize.labels({ status }).set(count);
    }
    /**
     * Record token cache performance
     */
    static recordTokenCacheHit(hitRate) {
        tokenCacheHitRate.observe(hitRate);
    }
    /**
     * Record budget usage ratio
     */
    static recordBudgetUsage(tenant, usedBudget, totalBudget, timeWindow) {
        const ratio = usedBudget / Math.max(totalBudget, 1);
        budgetUsageRatio.labels({ tenant, time_window: timeWindow }).observe(ratio);
    }
    /**
     * Get current metrics snapshot for debugging
     */
    static async getMetricsSnapshot() {
        try {
            // This is a simplified snapshot - in production, you'd query the actual metric values
            return {
                budgetDenials: 0, // budgetDenialsTotal.get() // Not directly available
                rollbackEvents: 0,
                rateLimitHits: 0,
                activeTokenBuckets: 0,
            };
        }
        catch (error) {
            logger_js_1.default.error('Failed to get metrics snapshot', { error });
            return {
                budgetDenials: -1,
                rollbackEvents: -1,
                rateLimitHits: -1,
                activeTokenBuckets: -1,
            };
        }
    }
    /**
     * Health check for metrics system
     */
    static async healthCheck() {
        const errors = [];
        const metricNames = [];
        try {
            // Check if metrics are registered
            const registeredMetrics = prom_client_1.register.getMetricsAsArray();
            for (const metric of registeredMetrics) {
                if (metric.name.startsWith('budget_') ||
                    metric.name.startsWith('token_') ||
                    metric.name.startsWith('rollback_') ||
                    metric.name.startsWith('mutation_') ||
                    metric.name.startsWith('rate_limit_') ||
                    metric.name.startsWith('compensation_')) {
                    metricNames.push(metric.name);
                }
            }
            if (metricNames.length === 0) {
                errors.push('No safe mutation metrics found in registry');
            }
            return {
                healthy: errors.length === 0,
                metrics: metricNames,
                errors,
            };
        }
        catch (error) {
            errors.push(`Metrics health check failed: ${error instanceof Error ? error.message : String(error)}`);
            return {
                healthy: false,
                metrics: metricNames,
                errors,
            };
        }
    }
}
exports.SafeMutationMetrics = SafeMutationMetrics;
/**
 * Middleware to automatically add metrics to GraphQL context
 */
function createMetricsContext() {
    return {
        metrics: {
            budget_denials_total: {
                inc: (labels) => {
                    SafeMutationMetrics.recordBudgetDenial(labels.reason, labels.tenant || 'unknown', labels.provider || 'unknown', labels.model || 'unknown', labels.field_name || 'unknown');
                },
            },
            token_estimation_error_ratio: {
                observe: (ratio) => {
                    // This would be called with more context in real usage
                    tokenEstimationErrorRatio
                        .labels({
                        provider: 'unknown',
                        model: 'unknown',
                        estimation_method: 'unknown',
                    })
                        .observe(ratio);
                },
            },
        },
        tracing: SafeMutationTracing,
    };
}
/**
 * Export metrics for Prometheus scraping
 */
async function getPrometheusMetrics() {
    try {
        return await prom_client_1.register.metrics();
    }
    catch (error) {
        logger_js_1.default.error('Failed to export Prometheus metrics', { error });
        return '';
    }
}
/**
 * Background job to collect periodic metrics
 */
class MetricsCollector {
    intervalId = null;
    collectionIntervalMs;
    constructor(collectionIntervalMs = 60000) {
        // Default: 1 minute
        this.collectionIntervalMs = collectionIntervalMs;
    }
    /**
     * Start periodic metrics collection
     */
    start() {
        if (this.intervalId)
            return;
        this.intervalId = setInterval(async () => {
            try {
                await this.collectMetrics();
            }
            catch (error) {
                logger_js_1.default.error('Metrics collection failed', { error });
            }
        }, this.collectionIntervalMs);
        logger_js_1.default.info('Metrics collector started', {
            intervalMs: this.collectionIntervalMs,
        });
    }
    /**
     * Stop periodic metrics collection
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger_js_1.default.info('Metrics collector stopped');
        }
    }
    /**
     * Collect current system metrics
     */
    async collectMetrics() {
        // This would integrate with your Redis, Neo4j, and other systems
        // to collect real-time metrics
        try {
            // Example: collect token cache stats
            // const cacheStats = getCacheStats();
            // SafeMutationMetrics.recordTokenCacheHit(cacheStats.hitRate);
            // Example: collect active buckets from Redis
            // const bucketStats = await redisBucket.getGlobalStats();
            // SafeMutationMetrics.updateActiveTokenBuckets(bucketStats.activeBuckets, 'redis');
            // Example: collect compensation log size from Neo4j
            // const compensationStats = await compensationManager.getStats();
            // SafeMutationMetrics.updateCompensationLogSize(compensationStats.totalEntries, 'all');
            logger_js_1.default.debug('Metrics collection completed');
        }
        catch (error) {
            logger_js_1.default.error('Error during metrics collection', { error });
        }
    }
}
exports.MetricsCollector = MetricsCollector;
// Global metrics collector instance
let globalMetricsCollector = null;
function startMetricsCollection(intervalMs) {
    if (!globalMetricsCollector) {
        globalMetricsCollector = new MetricsCollector(intervalMs);
    }
    globalMetricsCollector.start();
    return globalMetricsCollector;
}
function stopMetricsCollection() {
    if (globalMetricsCollector) {
        globalMetricsCollector.stop();
    }
}

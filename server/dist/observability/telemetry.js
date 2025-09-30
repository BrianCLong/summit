import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { metrics, trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import pino from 'pino';
const logger = pino({ name: 'telemetry' });
// Service information
const SERVICE_NAME = process.env.SERVICE_NAME || 'intelgraph-server';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';
const DEPLOYMENT_ENVIRONMENT = process.env.NODE_ENV || 'development';
// Configure resource
const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: DEPLOYMENT_ENVIRONMENT,
});
// Initialize OpenTelemetry SDK
export function initializeTelemetry() {
    const sdk = new NodeSDK({
        resource,
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': {
                    enabled: false, // Disable file system instrumentation to reduce noise
                },
                '@opentelemetry/instrumentation-http': {
                    requestHook: (span, request) => {
                        // Add custom attributes to HTTP requests
                        span.setAttributes({
                            'http.user_agent': request.headers['user-agent'] || 'unknown',
                            'http.tenant_id': request.headers['x-tenant-id'] || 'unknown',
                            'http.request_id': request.headers['x-request-id'] || 'unknown',
                        });
                    },
                },
                '@opentelemetry/instrumentation-graphql': {
                    enabled: true,
                    mergeItems: true,
                },
            }),
        ],
        traceExporter: new JaegerExporter({
            endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
        }),
        metricReader: new PrometheusExporter({
            port: parseInt(process.env.METRICS_PORT || '9464'),
            endpoint: '/metrics',
        }),
    });
    // Add console exporter for development
    if (DEPLOYMENT_ENVIRONMENT === 'development') {
        sdk.addSpanProcessor(new BatchSpanProcessor(new ConsoleSpanExporter()));
    }
    logger.info('OpenTelemetry SDK initialized');
    return sdk;
}
// Custom metrics
const meter = metrics.getMeter('intelgraph', SERVICE_VERSION);
// Business metrics
export const businessMetrics = {
    // Query metrics
    nlToCypherRequests: meter.createCounter('nlq_parse_requests_total', {
        description: 'Total number of NL→Cypher translation requests',
    }),
    nlToCypherParseTime: meter.createHistogram('nlq_parse_time_ms', {
        description: 'Time taken to parse NL queries to Cypher',
        unit: 'ms',
    }),
    nlToCypherValidity: meter.createCounter('nlq_validity_total', {
        description: 'Count of valid vs invalid generated Cypher queries',
    }),
    cypherQueryExecutions: meter.createCounter('cypher_query_executions_total', {
        description: 'Total number of Cypher query executions',
    }),
    cypherQueryDuration: meter.createHistogram('cypher_query_duration_ms', {
        description: 'Cypher query execution time',
        unit: 'ms',
    }),
    // Graph metrics
    graphHopQueries: meter.createHistogram('graph_hop_queries_ms', {
        description: 'Graph hop query performance by hop count',
        unit: 'ms',
    }),
    graphQueryComplexity: meter.createHistogram('graph_query_complexity', {
        description: 'Graph query complexity score',
    }),
    // Provenance metrics
    provenanceWrites: meter.createCounter('provenance_writes_total', {
        description: 'Total provenance ledger write operations',
    }),
    evidenceRegistrations: meter.createCounter('evidence_registrations_total', {
        description: 'Total evidence registrations',
    }),
    claimCreations: meter.createCounter('claim_creations_total', {
        description: 'Total claim creations',
    }),
    exportRequests: meter.createCounter('export_requests_total', {
        description: 'Total export requests',
    }),
    exportBlocks: meter.createCounter('export_blocks_total', {
        description: 'Total blocked export requests by policy',
    }),
    // Policy metrics
    policyEvaluations: meter.createCounter('policy_evaluations_total', {
        description: 'Total OPA policy evaluations',
    }),
    policyDecisionTime: meter.createHistogram('policy_decision_time_ms', {
        description: 'Time taken for policy decisions',
        unit: 'ms',
    }),
    // Cost metrics
    costBudgetUtilization: meter.createGauge('cost_budget_utilization_ratio', {
        description: 'Current cost budget utilization ratio',
    }),
    queryBudgetConsumed: meter.createCounter('query_budget_consumed_total', {
        description: 'Total query budget consumed',
    }),
    // Connector metrics
    connectorIngests: meter.createCounter('connector_ingests_total', {
        description: 'Total connector ingest operations',
    }),
    connectorErrors: meter.createCounter('connector_errors_total', {
        description: 'Total connector errors',
    }),
    connectorLatency: meter.createHistogram('connector_latency_ms', {
        description: 'Connector operation latency',
        unit: 'ms',
    }),
};
// Tracing utilities
export const tracer = trace.getTracer('intelgraph', SERVICE_VERSION);
export function createSpan(name, fn, attributes) {
    return tracer.startActiveSpan(name, { kind: SpanKind.INTERNAL }, async (span) => {
        try {
            if (attributes) {
                span.setAttributes(attributes);
            }
            const result = await fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    });
}
class IntelGraphCostTracker {
    budgets = new Map();
    constructor() {
        // Initialize default budgets
        this.budgets.set('default', { used: 0, limit: 1000 });
    }
    track(operation, cost, metadata = {}) {
        const tenantId = metadata.tenantId || 'default';
        // Update budget tracking
        const budget = this.budgets.get(tenantId) || { used: 0, limit: 1000 };
        budget.used += cost;
        this.budgets.set(tenantId, budget);
        // Record metrics
        businessMetrics.queryBudgetConsumed.add(cost, {
            tenant_id: tenantId,
            operation,
        });
        // Update budget utilization gauge
        businessMetrics.costBudgetUtilization.record(budget.used / budget.limit, {
            tenant_id: tenantId,
        });
        logger.debug({
            operation,
            cost,
            tenantId,
            budgetUsed: budget.used,
            budgetLimit: budget.limit,
            utilization: budget.used / budget.limit,
        }, 'Cost tracked');
    }
    async getCurrentBudget(tenantId) {
        const budget = this.budgets.get(tenantId) || { used: 0, limit: 1000 };
        return budget.limit - budget.used;
    }
    async checkBudgetLimit(tenantId, cost) {
        const remainingBudget = await this.getCurrentBudget(tenantId);
        return cost <= remainingBudget;
    }
}
export const costTracker = new IntelGraphCostTracker();
class Neo4jSlowQueryKiller {
    activeQueries = new Map();
    registerQuery(queryId, query, timeout) {
        const startTime = new Date();
        const timeoutHandle = setTimeout(() => {
            this.killQuery(queryId, 'timeout');
        }, timeout);
        this.activeQueries.set(queryId, {
            query,
            startTime,
            timeout,
            timeoutHandle,
        });
        logger.debug({ queryId, timeout }, 'Query registered for timeout monitoring');
    }
    killQuery(queryId, reason) {
        const queryInfo = this.activeQueries.get(queryId);
        if (!queryInfo) {
            return;
        }
        clearTimeout(queryInfo.timeoutHandle);
        this.activeQueries.delete(queryId);
        // Record metrics
        const duration = Date.now() - queryInfo.startTime.getTime();
        businessMetrics.cypherQueryDuration.record(duration, {
            status: 'killed',
            reason,
        });
        logger.warn({
            queryId,
            reason,
            duration,
            query: queryInfo.query.substring(0, 100),
        }, 'Query killed');
        // In a real implementation, this would send a kill command to Neo4j
        // For now, we just log and track metrics
    }
    getActiveQueries() {
        return Array.from(this.activeQueries.entries()).map(([id, info]) => ({
            id,
            query: info.query,
            startTime: info.startTime,
            timeout: info.timeout,
        }));
    }
    // Complete a query normally
    completeQuery(queryId) {
        const queryInfo = this.activeQueries.get(queryId);
        if (!queryInfo) {
            return;
        }
        clearTimeout(queryInfo.timeoutHandle);
        this.activeQueries.delete(queryId);
        // Record success metrics
        const duration = Date.now() - queryInfo.startTime.getTime();
        businessMetrics.cypherQueryDuration.record(duration, {
            status: 'completed',
        });
    }
}
export const slowQueryKiller = new Neo4jSlowQueryKiller();
// Express middleware for request tracing
export function tracingMiddleware() {
    return (req, res, next) => {
        const startTime = Date.now();
        // Create span for the request
        tracer.startActiveSpan(`${req.method} ${req.path}`, {
            kind: SpanKind.SERVER,
            attributes: {
                'http.method': req.method,
                'http.url': req.url,
                'http.path': req.path,
                'http.user_agent': req.headers['user-agent'] || 'unknown',
                'http.tenant_id': req.headers['x-tenant-id'] || 'unknown',
            },
        }, (span) => {
            // Add request context
            req.span = span;
            req.traceId = span.spanContext().traceId;
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                span.setAttributes({
                    'http.status_code': res.statusCode,
                    'http.response_time_ms': duration,
                });
                if (res.statusCode >= 400) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: `HTTP ${res.statusCode}`,
                    });
                }
                else {
                    span.setStatus({ code: SpanStatusCode.OK });
                }
                span.end();
            });
            next();
        });
    };
}
// Utility to add custom attributes to current span
export function addSpanAttributes(attributes) {
    const span = trace.getActiveSpan();
    if (span) {
        span.setAttributes(attributes);
    }
}
// Health check for observability services
export async function checkObservabilityHealth() {
    return {
        metrics: true, // Prometheus metrics are always available
        tracing: true, // Assume Jaeger is healthy for now
        cost_tracking: true, // In-memory cost tracking is always available
    };
}
// Initialize telemetry on module load if not in test environment
if (process.env.NODE_ENV !== 'test') {
    const sdk = initializeTelemetry();
    sdk.start();
    // Graceful shutdown
    process.on('SIGTERM', () => {
        sdk.shutdown()
            .then(() => logger.info('OpenTelemetry SDK shut down'))
            .catch((error) => logger.error('Error shutting down OpenTelemetry SDK', error));
    });
}
export { SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT };

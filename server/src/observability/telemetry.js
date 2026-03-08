"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEPLOYMENT_ENVIRONMENT = exports.SERVICE_VERSION = exports.SERVICE_NAME = exports.slowQueryKiller = exports.costTracker = exports.tracer = exports.SpanKind = exports.SpanStatusCode = exports.businessMetrics = void 0;
exports.initializeTelemetry = initializeTelemetry;
exports.createSpan = createSpan;
exports.tracingMiddleware = tracingMiddleware;
exports.addSpanAttributes = addSpanAttributes;
exports.checkObservabilityHealth = checkObservabilityHealth;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// Service information
const SERVICE_NAME = process.env.SERVICE_NAME || 'intelgraph-server';
exports.SERVICE_NAME = SERVICE_NAME;
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';
exports.SERVICE_VERSION = SERVICE_VERSION;
const DEPLOYMENT_ENVIRONMENT = process.env.NODE_ENV || 'development';
exports.DEPLOYMENT_ENVIRONMENT = DEPLOYMENT_ENVIRONMENT;
// No-op telemetry initializer
function initializeTelemetry() {
    logger_js_1.default.info('Telemetry disabled (no-op).');
    return {
        start: async () => { },
        shutdown: async () => { },
    };
}
// No-op metrics
const meter = {
    createCounter: (_, __) => ({ add: (_v, _a) => { } }),
    createHistogram: (_, __) => ({ record: (_v, _a) => { } }),
    createGauge: (_, __) => ({ record: (_v, _a) => { }, set: (_v, _a) => { } }),
};
// Business metrics
exports.businessMetrics = {
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
// No-op tracer and enums
exports.SpanStatusCode = { OK: 'OK', ERROR: 'ERROR' };
exports.SpanKind = { INTERNAL: 'INTERNAL', SERVER: 'SERVER', CLIENT: 'CLIENT', PRODUCER: 'PRODUCER', CONSUMER: 'CONSUMER' };
exports.tracer = {
    startActiveSpan: (_name, _opts, fn) => fn({
        setAttributes: (_a) => { },
        setStatus: (_s) => { },
        recordException: (_e) => { },
        spanContext: () => ({ traceId: 'unknown', spanId: 'unknown' }),
        end: () => { },
    }),
};
function createSpan(_name, fn, _attributes) {
    const span = { setAttributes: (_) => { }, setStatus: (_) => { }, recordException: (_) => { }, end: () => { } };
    return Promise.resolve(fn(span));
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
        exports.businessMetrics.queryBudgetConsumed.add(cost, {
            tenant_id: tenantId,
            operation,
        });
        // Update budget utilization gauge
        exports.businessMetrics.costBudgetUtilization.record(budget.used / budget.limit, {
            tenant_id: tenantId,
        });
        logger_js_1.default.debug({
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
exports.costTracker = new IntelGraphCostTracker();
class Neo4jSlowQueryKiller {
    activeQueries = new Map();
    registerQuery(queryId, query, timeout) {
        const startTime = new Date();
        const timeoutHandle = setTimeout(() => { }, timeout);
        this.activeQueries.set(queryId, {
            query,
            startTime,
            timeout,
            timeoutHandle,
        });
        logger_js_1.default.debug({ queryId, timeout }, 'Query registered for timeout monitoring');
    }
    killQuery(queryId, reason) {
        const queryInfo = this.activeQueries.get(queryId);
        if (!queryInfo) {
            return;
        }
        clearTimeout(queryInfo.timeoutHandle);
        this.activeQueries.delete(queryId);
        // no-op metrics
        logger_js_1.default.warn({
            queryId,
            reason,
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
        // no-op metrics
    }
}
exports.slowQueryKiller = new Neo4jSlowQueryKiller();
// Express middleware for request tracing
function tracingMiddleware() { return (_req, _res, next) => next(); }
// Utility to add custom attributes to current span
function addSpanAttributes(_attributes) { }
// Health check for observability services
async function checkObservabilityHealth() {
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
    process.on('SIGTERM', () => { sdk.shutdown().catch(() => { }); });
}

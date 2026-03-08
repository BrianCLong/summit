"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.relationshipsTotal = exports.entitiesTotal = exports.investigationsTotal = exports.llmRequestDuration = exports.aiJobDuration = exports.aiJobsQueued = exports.ingestBacklog = exports.ingestDedupeRate = exports.subscriptionBatchesEmitted = exports.subscriptionBackpressureTotal = exports.subscriptionFanoutLatency = exports.websocketMessagesTotal = exports.websocketConnectionsActive = exports.cacheSize = exports.cacheMissesTotal = exports.cacheHitsTotal = exports.dbConnectionsActive = exports.postgresQueriesTotal = exports.postgresQueryDuration = exports.neo4jQueriesTotal = exports.neo4jQueryDuration = exports.graphqlResolverDuration = exports.graphqlErrorsTotal = exports.graphqlRequestsTotal = exports.gqlDuration = exports.httpRequestDuration = exports.httpRequestsTotal = exports.registry = void 0;
exports.recordHttpRequest = recordHttpRequest;
exports.recordGraphQLOperation = recordGraphQLOperation;
exports.recordDatabaseQuery = recordDatabaseQuery;
exports.recordCacheAccess = recordCacheAccess;
const client = __importStar(require("prom-client"));
// Create a Registry to hold metrics
exports.registry = new client.Registry();
// Collect default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
    register: exports.registry,
    prefix: 'nodejs_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});
// ==================== HTTP Metrics ====================
exports.httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [exports.registry]
});
exports.httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
    registers: [exports.registry]
});
// ==================== GraphQL Metrics ====================
exports.gqlDuration = new client.Histogram({
    name: 'graphql_request_duration_seconds',
    help: 'GraphQL request duration in seconds',
    labelNames: ['operation', 'operation_type'],
    buckets: [0.05, 0.1, 0.2, 0.35, 0.7, 1, 1.5, 3, 5],
    registers: [exports.registry]
});
exports.graphqlRequestsTotal = new client.Counter({
    name: 'graphql_requests_total',
    help: 'Total number of GraphQL requests',
    labelNames: ['operation', 'operation_type'],
    registers: [exports.registry]
});
exports.graphqlErrorsTotal = new client.Counter({
    name: 'graphql_errors_total',
    help: 'Total number of GraphQL errors',
    labelNames: ['operation', 'error_type'],
    registers: [exports.registry]
});
exports.graphqlResolverDuration = new client.Histogram({
    name: 'graphql_resolver_duration_seconds',
    help: 'GraphQL resolver execution duration',
    labelNames: ['resolver', 'parent_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [exports.registry]
});
// ==================== Database Metrics ====================
exports.neo4jQueryDuration = new client.Histogram({
    name: 'neo4j_query_duration_seconds',
    help: 'Neo4j query duration in seconds',
    labelNames: ['query_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [exports.registry]
});
exports.neo4jQueriesTotal = new client.Counter({
    name: 'neo4j_queries_total',
    help: 'Total number of Neo4j queries',
    labelNames: ['query_type', 'status'],
    registers: [exports.registry]
});
exports.postgresQueryDuration = new client.Histogram({
    name: 'postgres_query_duration_seconds',
    help: 'PostgreSQL query duration in seconds',
    labelNames: ['query_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [exports.registry]
});
exports.postgresQueriesTotal = new client.Counter({
    name: 'postgres_queries_total',
    help: 'Total number of PostgreSQL queries',
    labelNames: ['query_type', 'status'],
    registers: [exports.registry]
});
exports.dbConnectionsActive = new client.Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections',
    labelNames: ['database'],
    registers: [exports.registry]
});
// ==================== Cache Metrics ====================
exports.cacheHitsTotal = new client.Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_name'],
    registers: [exports.registry]
});
exports.cacheMissesTotal = new client.Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_name'],
    registers: [exports.registry]
});
exports.cacheSize = new client.Gauge({
    name: 'cache_size_bytes',
    help: 'Current cache size in bytes',
    labelNames: ['cache_name'],
    registers: [exports.registry]
});
// ==================== WebSocket Metrics ====================
exports.websocketConnectionsActive = new client.Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
    registers: [exports.registry]
});
exports.websocketMessagesTotal = new client.Counter({
    name: 'websocket_messages_total',
    help: 'Total number of WebSocket messages',
    labelNames: ['direction', 'type'],
    registers: [exports.registry]
});
// ==================== Subscription Metrics (existing) ====================
exports.subscriptionFanoutLatency = new client.Histogram({
    name: 'subscription_fanout_latency_ms',
    help: 'Subscription fan-out latency in milliseconds',
    buckets: [10, 50, 100, 250, 500, 1000],
    registers: [exports.registry]
});
exports.subscriptionBackpressureTotal = new client.Counter({
    name: 'subscription_backpressure_total',
    help: 'Count of WebSocket disconnects or drops caused by backpressure',
    registers: [exports.registry]
});
exports.subscriptionBatchesEmitted = new client.Histogram({
    name: 'subscription_batch_size',
    help: 'Distribution of batched subscription payload sizes',
    buckets: [1, 5, 10, 25, 50, 75, 100],
    registers: [exports.registry]
});
// ==================== Ingest Metrics (existing) ====================
exports.ingestDedupeRate = new client.Gauge({
    name: 'ingest_dedupe_rate',
    help: 'Rate of deduplicated ingest events',
    registers: [exports.registry]
});
exports.ingestBacklog = new client.Gauge({
    name: 'ingest_backlog',
    help: 'Current ingest backlog size',
    registers: [exports.registry]
});
// ==================== AI/ML Metrics ====================
exports.aiJobsQueued = new client.Gauge({
    name: 'ai_jobs_queued',
    help: 'Number of AI jobs in queue',
    labelNames: ['job_type'],
    registers: [exports.registry]
});
exports.aiJobDuration = new client.Histogram({
    name: 'ai_job_duration_seconds',
    help: 'AI job execution duration',
    labelNames: ['job_type'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600],
    registers: [exports.registry]
});
exports.llmRequestDuration = new client.Histogram({
    name: 'llm_request_duration_seconds',
    help: 'LLM API request duration',
    labelNames: ['model', 'provider'],
    buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
    registers: [exports.registry]
});
// ==================== Business Metrics ====================
exports.investigationsTotal = new client.Counter({
    name: 'investigations_total',
    help: 'Total number of investigations created',
    labelNames: ['status'],
    registers: [exports.registry]
});
exports.entitiesTotal = new client.Counter({
    name: 'entities_total',
    help: 'Total number of entities created',
    labelNames: ['entity_type'],
    registers: [exports.registry]
});
exports.relationshipsTotal = new client.Counter({
    name: 'relationships_total',
    help: 'Total number of relationships created',
    labelNames: ['relationship_type'],
    registers: [exports.registry]
});
// ==================== Helper Functions ====================
/**
 * Records an HTTP request
 */
function recordHttpRequest(method, route, statusCode, duration) {
    exports.httpRequestsTotal.labels(method, route, String(statusCode)).inc();
    exports.httpRequestDuration.labels(method, route, String(statusCode)).observe(duration);
}
/**
 * Records a GraphQL operation
 */
function recordGraphQLOperation(operation, operationType, duration, error) {
    exports.graphqlRequestsTotal.labels(operation, operationType).inc();
    exports.gqlDuration.labels(operation, operationType).observe(duration);
    if (error) {
        exports.graphqlErrorsTotal.labels(operation, error.name).inc();
    }
}
/**
 * Records a database query
 */
function recordDatabaseQuery(database, queryType, duration, success) {
    if (database === 'neo4j') {
        exports.neo4jQueriesTotal.labels(queryType, success ? 'success' : 'error').inc();
        exports.neo4jQueryDuration.labels(queryType).observe(duration);
    }
    else {
        exports.postgresQueriesTotal.labels(queryType, success ? 'success' : 'error').inc();
        exports.postgresQueryDuration.labels(queryType).observe(duration);
    }
}
/**
 * Records cache access
 */
function recordCacheAccess(cacheName, hit) {
    if (hit) {
        exports.cacheHitsTotal.labels(cacheName).inc();
    }
    else {
        exports.cacheMissesTotal.labels(cacheName).inc();
    }
}
exports.default = exports.registry;

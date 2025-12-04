import client from 'prom-client';

// Create a Registry to hold metrics
export const registry = new client.Registry();

// Collect default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register: registry,
  prefix: 'nodejs_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// ==================== HTTP Metrics ====================
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry]
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
  registers: [registry]
});

// ==================== GraphQL Metrics ====================
export const gqlDuration = new client.Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'GraphQL request duration in seconds',
  labelNames: ['operation', 'operation_type'],
  buckets: [0.05, 0.1, 0.2, 0.35, 0.7, 1, 1.5, 3, 5],
  registers: [registry]
});

export const graphqlRequestsTotal = new client.Counter({
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation', 'operation_type'],
  registers: [registry]
});

export const graphqlErrorsTotal = new client.Counter({
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation', 'error_type'],
  registers: [registry]
});

export const graphqlResolverDuration = new client.Histogram({
  name: 'graphql_resolver_duration_seconds',
  help: 'GraphQL resolver execution duration',
  labelNames: ['resolver', 'parent_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [registry]
});

// ==================== Database Metrics ====================
export const neo4jQueryDuration = new client.Histogram({
  name: 'neo4j_query_duration_seconds',
  help: 'Neo4j query duration in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [registry]
});

export const neo4jQueriesTotal = new client.Counter({
  name: 'neo4j_queries_total',
  help: 'Total number of Neo4j queries',
  labelNames: ['query_type', 'status'],
  registers: [registry]
});

export const postgresQueryDuration = new client.Histogram({
  name: 'postgres_query_duration_seconds',
  help: 'PostgreSQL query duration in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [registry]
});

export const postgresQueriesTotal = new client.Counter({
  name: 'postgres_queries_total',
  help: 'Total number of PostgreSQL queries',
  labelNames: ['query_type', 'status'],
  registers: [registry]
});

export const dbConnectionsActive = new client.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
  registers: [registry]
});

// ==================== Cache Metrics ====================
export const cacheHitsTotal = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name'],
  registers: [registry]
});

export const cacheMissesTotal = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name'],
  registers: [registry]
});

export const cacheSize = new client.Gauge({
  name: 'cache_size_bytes',
  help: 'Current cache size in bytes',
  labelNames: ['cache_name'],
  registers: [registry]
});

// ==================== WebSocket Metrics ====================
export const websocketConnectionsActive = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [registry]
});

export const websocketMessagesTotal = new client.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'type'],
  registers: [registry]
});

// ==================== Subscription Metrics (existing) ====================
export const subscriptionFanoutLatency = new client.Histogram({
  name: 'subscription_fanout_latency_ms',
  help: 'Subscription fan-out latency in milliseconds',
  buckets: [10, 50, 100, 250, 500, 1000],
  registers: [registry]
});

export const subscriptionBackpressureTotal = new client.Counter({
  name: 'subscription_backpressure_total',
  help: 'Count of WebSocket disconnects or drops caused by backpressure',
  registers: [registry]
});

export const subscriptionBatchesEmitted = new client.Histogram({
  name: 'subscription_batch_size',
  help: 'Distribution of batched subscription payload sizes',
  buckets: [1, 5, 10, 25, 50, 75, 100],
  registers: [registry]
});

// ==================== Ingest Metrics (existing) ====================
export const ingestDedupeRate = new client.Gauge({
  name: 'ingest_dedupe_rate',
  help: 'Rate of deduplicated ingest events',
  registers: [registry]
});

export const ingestBacklog = new client.Gauge({
  name: 'ingest_backlog',
  help: 'Current ingest backlog size',
  registers: [registry]
});

// ==================== AI/ML Metrics ====================
export const aiJobsQueued = new client.Gauge({
  name: 'ai_jobs_queued',
  help: 'Number of AI jobs in queue',
  labelNames: ['job_type'],
  registers: [registry]
});

export const aiJobDuration = new client.Histogram({
  name: 'ai_job_duration_seconds',
  help: 'AI job execution duration',
  labelNames: ['job_type'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry]
});

export const llmRequestDuration = new client.Histogram({
  name: 'llm_request_duration_seconds',
  help: 'LLM API request duration',
  labelNames: ['model', 'provider'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [registry]
});

// ==================== Business Metrics ====================
export const investigationsTotal = new client.Counter({
  name: 'investigations_total',
  help: 'Total number of investigations created',
  labelNames: ['status'],
  registers: [registry]
});

export const entitiesTotal = new client.Counter({
  name: 'entities_total',
  help: 'Total number of entities created',
  labelNames: ['entity_type'],
  registers: [registry]
});

export const relationshipsTotal = new client.Counter({
  name: 'relationships_total',
  help: 'Total number of relationships created',
  labelNames: ['relationship_type'],
  registers: [registry]
});

// ==================== Helper Functions ====================

/**
 * Records an HTTP request
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number
) {
  httpRequestsTotal.labels(method, route, String(statusCode)).inc();
  httpRequestDuration.labels(method, route, String(statusCode)).observe(duration);
}

/**
 * Records a GraphQL operation
 */
export function recordGraphQLOperation(
  operation: string,
  operationType: string,
  duration: number,
  error?: Error
) {
  graphqlRequestsTotal.labels(operation, operationType).inc();
  gqlDuration.labels(operation, operationType).observe(duration);

  if (error) {
    graphqlErrorsTotal.labels(operation, error.name).inc();
  }
}

/**
 * Records a database query
 */
export function recordDatabaseQuery(
  database: 'neo4j' | 'postgres',
  queryType: string,
  duration: number,
  success: boolean
) {
  if (database === 'neo4j') {
    neo4jQueriesTotal.labels(queryType, success ? 'success' : 'error').inc();
    neo4jQueryDuration.labels(queryType).observe(duration);
  } else {
    postgresQueriesTotal.labels(queryType, success ? 'success' : 'error').inc();
    postgresQueryDuration.labels(queryType).observe(duration);
  }
}

/**
 * Records cache access
 */
export function recordCacheAccess(cacheName: string, hit: boolean) {
  if (hit) {
    cacheHitsTotal.labels(cacheName).inc();
  } else {
    cacheMissesTotal.labels(cacheName).inc();
  }
}

export default registry;

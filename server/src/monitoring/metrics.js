/**
 * Prometheus metrics collection for IntelGraph Platform
 */
import * as client from 'prom-client';

// Create a Registry which registers the metrics
const register = new client.Registry();

// Check if metrics are already registered to avoid duplicates during testing/hot-reload
const getOrRegister = (name, type, config) => {
  const existing = client.register.getSingleMetric(name);
  if (existing) return existing;
  return new type(config);
};

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({
  register,
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection buckets
});

// Custom Application Metrics

// HTTP Request metrics
const httpRequestDuration = getOrRegister('http_request_duration_seconds', client.Histogram, {
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const httpRequestsTotal = getOrRegister('http_requests_total', client.Counter, {
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Business KPIs exposed as first-class metrics for the control plane
const businessUserSignupsTotal = getOrRegister('business_user_signups_total', client.Counter, {
  name: 'business_user_signups_total',
  help: 'Total number of customer or workspace signups',
  labelNames: ['tenant', 'plan'],
});

const businessApiCallsTotal = getOrRegister('business_api_calls_total', client.Counter, {
  name: 'business_api_calls_total',
  help: 'API calls attributed to customer activity and billing',
  labelNames: ['service', 'route', 'status_code', 'tenant'],
});

const businessRevenueTotal = getOrRegister('business_revenue_total', client.Counter, {
  name: 'business_revenue_total',
  help: "Recognized revenue amounts in the system's reporting currency",
  labelNames: ['tenant', 'currency'],
});

// GraphQL metrics
const graphqlRequestDuration = getOrRegister('graphql_request_duration_seconds', client.Histogram, {
  name: 'graphql_request_duration_seconds',
  help: 'Duration of GraphQL requests in seconds',
  labelNames: ['operation', 'operation_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const graphqlRequestsTotal = getOrRegister('graphql_requests_total', client.Counter, {
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation', 'operation_type', 'status'],
});

const graphqlErrors = getOrRegister('graphql_errors_total', client.Counter, {
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation', 'error_type'],
});

// Tenant isolation violations
const tenantScopeViolationsTotal = getOrRegister('tenant_scope_violations_total', client.Counter, {
  name: 'tenant_scope_violations_total',
  help: 'Total number of tenant scope violations',
});

// Database metrics
const dbConnectionsActive = getOrRegister('db_connections_active', client.Gauge, {
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
});

const dbQueryDuration = getOrRegister('db_query_duration_seconds', client.Histogram, {
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['database', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const dbQueriesTotal = getOrRegister('db_queries_total', client.Counter, {
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['database', 'operation', 'status'],
});

// AI/ML Processing metrics
const aiJobsQueued = getOrRegister('ai_jobs_queued', client.Gauge, {
  name: 'ai_jobs_queued',
  help: 'Number of AI/ML jobs in queue',
  labelNames: ['job_type'],
});

const aiJobsProcessing = getOrRegister('ai_jobs_processing', client.Gauge, {
  name: 'ai_jobs_processing',
  help: 'Number of AI/ML jobs currently processing',
  labelNames: ['job_type'],
});

const aiJobDuration = getOrRegister('ai_job_duration_seconds', client.Histogram, {
  name: 'ai_job_duration_seconds',
  help: 'Duration of AI/ML job processing in seconds',
  labelNames: ['job_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

const aiJobsTotal = getOrRegister('ai_jobs_total', client.Counter, {
  name: 'ai_jobs_total',
  help: 'Total number of AI/ML jobs processed',
  labelNames: ['job_type', 'status'],
});

// Graph operations metrics
const graphNodesTotal = getOrRegister('graph_nodes_total', client.Gauge, {
  name: 'graph_nodes_total',
  help: 'Total number of nodes in the graph',
  labelNames: ['investigation_id'],
});

const graphEdgesTotal = getOrRegister('graph_edges_total', client.Gauge, {
  name: 'graph_edges_total',
  help: 'Total number of edges in the graph',
  labelNames: ['investigation_id'],
});

const graphOperationDuration = getOrRegister('graph_operation_duration_seconds', client.Histogram, {
  name: 'graph_operation_duration_seconds',
  help: 'Duration of graph operations in seconds',
  labelNames: ['operation', 'investigation_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// WebSocket metrics
const websocketConnections = getOrRegister('websocket_connections_active', client.Gauge, {
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
});

const websocketMessages = getOrRegister('websocket_messages_total', client.Counter, {
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'event_type'],
});

// Investigation metrics
const investigationsActive = getOrRegister('investigations_active', client.Gauge, {
  name: 'investigations_active',
  help: 'Number of active investigations',
});

const investigationOperations = getOrRegister('investigation_operations_total', client.Counter, {
  name: 'investigation_operations_total',
  help: 'Total number of investigation operations',
  labelNames: ['operation', 'user_id'],
});

// Error tracking
const applicationErrors = getOrRegister('application_errors_total', client.Counter, {
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['module', 'error_type', 'severity'],
});

// Memory usage for specific components
const memoryUsage = getOrRegister('application_memory_usage_bytes', client.Gauge, {
  name: 'application_memory_usage_bytes',
  help: 'Memory usage by application component',
  labelNames: ['component'],
});

// Pipeline SLI metrics (labels: source, pipeline, env)
const pipelineUptimeRatio = getOrRegister('pipeline_uptime_ratio', client.Gauge, {
  name: 'pipeline_uptime_ratio',
  help: 'Pipeline availability ratio (0..1) over current window',
  labelNames: ['source', 'pipeline', 'env'],
});
const pipelineFreshnessSeconds = getOrRegister('pipeline_freshness_seconds', client.Gauge, {
  name: 'pipeline_freshness_seconds',
  help: 'Freshness (seconds) from source event to load completion',
  labelNames: ['source', 'pipeline', 'env'],
});
const pipelineCompletenessRatio = getOrRegister('pipeline_completeness_ratio', client.Gauge, {
  name: 'pipeline_completeness_ratio',
  help: 'Data completeness ratio (0..1) expected vs actual',
  labelNames: ['source', 'pipeline', 'env'],
});
const pipelineCorrectnessRatio = getOrRegister('pipeline_correctness_ratio', client.Gauge, {
  name: 'pipeline_correctness_ratio',
  help: 'Validation pass rate ratio (0..1)',
  labelNames: ['source', 'pipeline', 'env'],
});
const pipelineLatencySeconds = getOrRegister('pipeline_latency_seconds', client.Histogram, {
  name: 'pipeline_latency_seconds',
  help: 'End-to-end processing latency seconds',
  labelNames: ['source', 'pipeline', 'env'],
  buckets: [5, 15, 30, 60, 120, 300, 600, 1200],
});

// Register all metrics if not already registered
const registerMetricSafe = (metric) => {
  try {
    register.registerMetric(metric);
  } catch (e) {
    // Ignore registration errors if metric already exists in registry
  }
};

registerMetricSafe(httpRequestDuration);
registerMetricSafe(httpRequestsTotal);
registerMetricSafe(graphqlRequestDuration);
registerMetricSafe(graphqlRequestsTotal);
registerMetricSafe(graphqlErrors);
registerMetricSafe(tenantScopeViolationsTotal);
registerMetricSafe(dbConnectionsActive);
registerMetricSafe(dbQueryDuration);
registerMetricSafe(dbQueriesTotal);
registerMetricSafe(aiJobsQueued);
registerMetricSafe(aiJobsProcessing);
registerMetricSafe(aiJobDuration);
registerMetricSafe(aiJobsTotal);
registerMetricSafe(graphNodesTotal);
registerMetricSafe(graphEdgesTotal);
registerMetricSafe(graphOperationDuration);
registerMetricSafe(websocketConnections);
registerMetricSafe(websocketMessages);
registerMetricSafe(investigationsActive);
registerMetricSafe(investigationOperations);
registerMetricSafe(applicationErrors);
registerMetricSafe(memoryUsage);
registerMetricSafe(pipelineUptimeRatio);
registerMetricSafe(pipelineFreshnessSeconds);
registerMetricSafe(pipelineCompletenessRatio);
registerMetricSafe(pipelineCorrectnessRatio);
registerMetricSafe(pipelineLatencySeconds);

// GraphRAG metrics for schema validation and caching
const graphragSchemaFailuresTotal = getOrRegister('graphrag_schema_failures_total', client.Counter, {
  name: 'graphrag_schema_failures_total',
  help: 'Total number of GraphRAG schema validation failures',
});
const graphragCacheHitRatio = getOrRegister('graphrag_cache_hit_ratio', client.Gauge, {
  name: 'graphrag_cache_hit_ratio',
  help: 'Ratio of GraphRAG cache hits to total requests',
});
registerMetricSafe(graphragSchemaFailuresTotal);
registerMetricSafe(graphragCacheHitRatio);
const pbacDecisionsTotal = getOrRegister('pbac_decisions_total', client.Counter, {
  name: 'pbac_decisions_total',
  help: 'Total PBAC access decisions',
  labelNames: ['decision'],
});
registerMetricSafe(pbacDecisionsTotal);

const admissionDecisionsTotal = getOrRegister('admission_decisions_total', client.Counter, {
  name: 'admission_decisions_total',
  help: 'Total admission control decisions',
  labelNames: ['decision', 'policy'],
});
registerMetricSafe(admissionDecisionsTotal);

// Docling service metrics
const doclingInferenceDuration = getOrRegister('docling_inference_duration_seconds', client.Histogram, {
  name: 'docling_inference_duration_seconds',
  help: 'Docling document inference duration in seconds',
  labelNames: ['model', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});
registerMetricSafe(doclingInferenceDuration);

const doclingInferenceTotal = getOrRegister('docling_inference_total', client.Counter, {
  name: 'docling_inference_total',
  help: 'Total Docling inference requests',
  labelNames: ['model', 'status'],
});
registerMetricSafe(doclingInferenceTotal);

const doclingCharactersProcessed = getOrRegister('docling_characters_processed_total', client.Counter, {
  name: 'docling_characters_processed_total',
  help: 'Total characters processed by Docling',
  labelNames: ['model'],
});
registerMetricSafe(doclingCharactersProcessed);

const doclingCostUsd = getOrRegister('docling_cost_usd_total', client.Counter, {
  name: 'docling_cost_usd_total',
  help: 'Total cost in USD for Docling processing',
  labelNames: ['model'],
});
registerMetricSafe(doclingCostUsd);

// New domain metrics
const graphExpandRequestsTotal = getOrRegister('graph_expand_requests_total', client.Counter, {
  name: 'graph_expand_requests_total',
  help: 'Total expandNeighbors requests',
  labelNames: ['cached'],
});
const aiRequestTotal = getOrRegister('ai_request_total', client.Counter, {
  name: 'ai_request_total',
  help: 'AI request events',
  labelNames: ['status'],
});
const resolverLatencyMs = getOrRegister('resolver_latency_ms', client.Histogram, {
  name: 'resolver_latency_ms',
  help: 'Resolver latency in ms',
  labelNames: ['operation'],
  buckets: [5, 10, 25, 50, 100, 200, 400, 800, 1600],
});

const neighborhoodCacheHitRatio = getOrRegister('neighborhood_cache_hit_ratio', client.Gauge, {
  name: 'neighborhood_cache_hit_ratio',
  help: 'Neighborhood cache hit ratio',
});

const neighborhoodCacheLatencyMs = getOrRegister('neighborhood_cache_latency_ms', client.Histogram, {
  name: 'neighborhood_cache_latency_ms',
  help: 'Neighborhood cache lookup latency in ms',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

// Enhanced GraphQL resolver metrics
const graphqlResolverDurationSeconds = getOrRegister('graphql_resolver_duration_seconds', client.Histogram, {
  name: 'graphql_resolver_duration_seconds',
  help: 'Duration of GraphQL resolver execution in seconds',
  labelNames: ['resolver_name', 'field_name', 'type_name', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const graphqlResolverErrorsTotal = getOrRegister('graphql_resolver_errors_total', client.Counter, {
  name: 'graphql_resolver_errors_total',
  help: 'Total number of GraphQL resolver errors',
  labelNames: ['resolver_name', 'field_name', 'type_name', 'error_type'],
});

const graphqlResolverCallsTotal = getOrRegister('graphql_resolver_calls_total', client.Counter, {
  name: 'graphql_resolver_calls_total',
  help: 'Total number of GraphQL resolver calls',
  labelNames: ['resolver_name', 'field_name', 'type_name'],
});
// Web Vitals metrics reported from clients
const webVitalValue = getOrRegister('web_vital_value', client.Gauge, {
  name: 'web_vital_value',
  help: 'Latest reported Web Vitals values',
  labelNames: ['metric', 'id'],
});

// Real-time updates metrics
const realtimeConflictsTotal = getOrRegister('realtime_conflicts_total', client.Counter, {
  name: 'realtime_conflicts_total',
  help: 'Total number of real-time update conflicts (LWW)',
});

const idempotentHitsTotal = getOrRegister('idempotent_hits_total', client.Counter, {
  name: 'idempotent_hits_total',
  help: 'Total number of idempotent mutation hits',
});

// Auto-remediation execution tracking
const serviceAutoRemediationsTotal = getOrRegister('service_auto_remediations_total', client.Counter, {
  name: 'service_auto_remediations_total',
  help: 'Total number of automated remediation actions executed',
  labelNames: ['service', 'action', 'result'],
});

registerMetricSafe(graphExpandRequestsTotal);
registerMetricSafe(aiRequestTotal);
registerMetricSafe(resolverLatencyMs);
registerMetricSafe(neighborhoodCacheHitRatio);
registerMetricSafe(neighborhoodCacheLatencyMs);
registerMetricSafe(graphqlResolverDurationSeconds);
registerMetricSafe(graphqlResolverErrorsTotal);
registerMetricSafe(graphqlResolverCallsTotal);
registerMetricSafe(webVitalValue);
registerMetricSafe(realtimeConflictsTotal);
registerMetricSafe(idempotentHitsTotal);
registerMetricSafe(businessUserSignupsTotal);
registerMetricSafe(businessApiCallsTotal);
registerMetricSafe(businessRevenueTotal);
registerMetricSafe(serviceAutoRemediationsTotal);

const metrics = {
  graphExpandRequestsTotal,
  aiRequestTotal,
  resolverLatencyMs,
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
  neighborhoodCacheHitRatio,
  neighborhoodCacheLatencyMs,
  pbacDecisionsTotal,
};

// Update memory usage periodically
setInterval(() => {
  const usage = process.memoryUsage();
  memoryUsage.set({ component: 'heap_used' }, usage.heapUsed);
  memoryUsage.set({ component: 'heap_total' }, usage.heapTotal);
  memoryUsage.set({ component: 'external' }, usage.external);
  memoryUsage.set({ component: 'rss' }, usage.rss);
}, 30000); // Every 30 seconds

export {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  graphqlRequestDuration,
  graphqlRequestsTotal,
  graphqlErrors,
  dbConnectionsActive,
  dbQueryDuration,
  dbQueriesTotal,
  aiJobsQueued,
  aiJobsProcessing,
  aiJobDuration,
  aiJobsTotal,
  graphNodesTotal,
  graphEdgesTotal,
  graphOperationDuration,
  websocketConnections,
  websocketMessages,
  investigationsActive,
  investigationOperations,
  applicationErrors,
  tenantScopeViolationsTotal,
  memoryUsage,
  graphExpandRequestsTotal,
  aiRequestTotal,
  resolverLatencyMs,
  neighborhoodCacheHitRatio,
  neighborhoodCacheLatencyMs,
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
  pbacDecisionsTotal,
  admissionDecisionsTotal,
  doclingInferenceDuration,
  doclingInferenceTotal,
  doclingCharactersProcessed,
  doclingCostUsd,
  pipelineUptimeRatio,
  pipelineFreshnessSeconds,
  pipelineCompletenessRatio,
  pipelineCorrectnessRatio,
  pipelineLatencySeconds,
  graphqlResolverDurationSeconds,
  graphqlResolverErrorsTotal,
  graphqlResolverCallsTotal,
  webVitalValue,
  metrics,
  businessUserSignupsTotal,
  businessApiCallsTotal,
  businessRevenueTotal,
  serviceAutoRemediationsTotal,
};

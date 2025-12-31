/**
 * Prometheus metrics collection for IntelGraph Platform
 */
import client from 'prom-client';

// Create a Registry which registers the metrics
export const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({
  register,
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection buckets
});

// Custom Application Metrics

// HTTP Request metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Business KPIs exposed as first-class metrics for the control plane
export const businessUserSignupsTotal = new client.Counter({
  name: 'business_user_signups_total',
  help: 'Total number of customer or workspace signups',
  labelNames: ['tenant', 'plan'],
});

export const businessApiCallsTotal = new client.Counter({
  name: 'business_api_calls_total',
  help: 'API calls attributed to customer activity and billing',
  labelNames: ['service', 'route', 'status_code', 'tenant'],
});

export const businessRevenueTotal = new client.Counter({
  name: 'business_revenue_total',
  help: "Recognized revenue amounts in the system's reporting currency",
  labelNames: ['tenant', 'currency'],
});

// GraphQL metrics
export const graphqlRequestDuration = new client.Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'Duration of GraphQL requests in seconds',
  labelNames: ['operation', 'operation_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const graphqlRequestsTotal = new client.Counter({
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation', 'operation_type', 'status'],
});

export const graphqlErrors = new client.Counter({
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation', 'error_type'],
});

// Tenant isolation violations
export const tenantScopeViolationsTotal = new client.Counter({
  name: 'tenant_scope_violations_total',
  help: 'Total number of tenant scope violations',
});

// Database metrics
export const dbConnectionsActive = new client.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
});

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['database', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const dbQueriesTotal = new client.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['database', 'operation', 'status'],
});

// AI/ML Processing metrics
export const aiJobsQueued = new client.Gauge({
  name: 'ai_jobs_queued',
  help: 'Number of AI/ML jobs in queue',
  labelNames: ['job_type'],
});

export const aiJobsProcessing = new client.Gauge({
  name: 'ai_jobs_processing',
  help: 'Number of AI/ML jobs currently processing',
  labelNames: ['job_type'],
});

export const aiJobDuration = new client.Histogram({
  name: 'ai_job_duration_seconds',
  help: 'Duration of AI/ML job processing in seconds',
  labelNames: ['job_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

export const aiJobsTotal = new client.Counter({
  name: 'ai_jobs_total',
  help: 'Total number of AI/ML jobs processed',
  labelNames: ['job_type', 'status'],
});

// Graph operations metrics
export const graphNodesTotal = new client.Gauge({
  name: 'graph_nodes_total',
  help: 'Total number of nodes in the graph',
  labelNames: ['investigation_id'],
});

export const graphEdgesTotal = new client.Gauge({
  name: 'graph_edges_total',
  help: 'Total number of edges in the graph',
  labelNames: ['investigation_id'],
});

export const graphOperationDuration = new client.Histogram({
  name: 'graph_operation_duration_seconds',
  help: 'Duration of graph operations in seconds',
  labelNames: ['operation', 'investigation_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// WebSocket metrics
export const websocketConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
});

export const websocketMessages = new client.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'event_type'],
});

// Investigation metrics
export const investigationsActive = new client.Gauge({
  name: 'investigations_active',
  help: 'Number of active investigations',
});

export const investigationOperations = new client.Counter({
  name: 'investigation_operations_total',
  help: 'Total number of investigation operations',
  labelNames: ['operation', 'user_id'],
});

// Entity resolution merge outcomes
export const erMergeOutcomesTotal = new client.Counter({
  name: 'er_merge_outcomes_total',
  help: 'Total number of ER merge outcomes recorded',
  labelNames: ['decision', 'entity_type', 'method'],
});

// Deployment rollbacks
export const deploymentRollbacksTotal = new client.Counter({
  name: 'deployment_rollbacks_total',
  help: 'Total number of deployment rollbacks',
  labelNames: ['service', 'reason', 'success'],
});

// Error tracking
export const applicationErrors = new client.Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['module', 'error_type', 'severity'],
});

// Memory usage for specific components
export const memoryUsage = new client.Gauge({
  name: 'application_memory_usage_bytes',
  help: 'Memory usage by application component',
  labelNames: ['component'],
});

// Pipeline SLI metrics (labels: source, pipeline, env)
export const pipelineUptimeRatio = new client.Gauge({
  name: 'pipeline_uptime_ratio',
  help: 'Pipeline availability ratio (0..1) over current window',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineFreshnessSeconds = new client.Gauge({
  name: 'pipeline_freshness_seconds',
  help: 'Freshness (seconds) from source event to load completion',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineCompletenessRatio = new client.Gauge({
  name: 'pipeline_completeness_ratio',
  help: 'Data completeness ratio (0..1) expected vs actual',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineCorrectnessRatio = new client.Gauge({
  name: 'pipeline_correctness_ratio',
  help: 'Validation pass rate ratio (0..1)',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineLatencySeconds = new client.Histogram({
  name: 'pipeline_latency_seconds',
  help: 'End-to-end processing latency seconds',
  labelNames: ['source', 'pipeline', 'env'],
  buckets: [5, 15, 30, 60, 120, 300, 600, 1200],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(graphqlRequestDuration);
register.registerMetric(graphqlRequestsTotal);
register.registerMetric(graphqlErrors);
register.registerMetric(tenantScopeViolationsTotal);
register.registerMetric(dbConnectionsActive);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbQueriesTotal);
register.registerMetric(aiJobsQueued);
register.registerMetric(aiJobsProcessing);
register.registerMetric(aiJobDuration);
register.registerMetric(aiJobsTotal);
register.registerMetric(graphNodesTotal);
register.registerMetric(graphEdgesTotal);
register.registerMetric(graphOperationDuration);
register.registerMetric(websocketConnections);
register.registerMetric(websocketMessages);
register.registerMetric(investigationsActive);
register.registerMetric(investigationOperations);
register.registerMetric(erMergeOutcomesTotal);
register.registerMetric(deploymentRollbacksTotal);
register.registerMetric(applicationErrors);
register.registerMetric(memoryUsage);
register.registerMetric(pipelineUptimeRatio);
register.registerMetric(pipelineFreshnessSeconds);
register.registerMetric(pipelineCompletenessRatio);
register.registerMetric(pipelineCorrectnessRatio);
register.registerMetric(pipelineLatencySeconds);

// GraphRAG metrics for schema validation and caching
export const graphragSchemaFailuresTotal = new client.Counter({
  name: 'graphrag_schema_failures_total',
  help: 'Total number of GraphRAG schema validation failures',
});
export const graphragCacheHitRatio = new client.Gauge({
  name: 'graphrag_cache_hit_ratio',
  help: 'Ratio of GraphRAG cache hits to total requests',
});
register.registerMetric(graphragSchemaFailuresTotal);
register.registerMetric(graphragCacheHitRatio);
export const pbacDecisionsTotal = new client.Counter({
  name: 'pbac_decisions_total',
  help: 'Total PBAC access decisions',
  labelNames: ['decision'],
});
register.registerMetric(pbacDecisionsTotal);

export const admissionDecisionsTotal = new client.Counter({
  name: 'admission_decisions_total',
  help: 'Total admission control decisions',
  labelNames: ['decision', 'policy'],
});
register.registerMetric(admissionDecisionsTotal);

// Docling service metrics
export const doclingInferenceDuration = new client.Histogram({
  name: 'docling_inference_duration_seconds',
  help: 'Docling document inference duration in seconds',
  labelNames: ['model', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});
register.registerMetric(doclingInferenceDuration);

export const doclingInferenceTotal = new client.Counter({
  name: 'docling_inference_total',
  help: 'Total Docling inference requests',
  labelNames: ['model', 'status'],
});
register.registerMetric(doclingInferenceTotal);

export const doclingCharactersProcessed = new client.Counter({
  name: 'docling_characters_processed_total',
  help: 'Total characters processed by Docling',
  labelNames: ['model'],
});
register.registerMetric(doclingCharactersProcessed);

export const doclingCostUsd = new client.Counter({
  name: 'docling_cost_usd_total',
  help: 'Total cost in USD for Docling processing',
  labelNames: ['model'],
});
register.registerMetric(doclingCostUsd);

// New domain metrics
export const graphExpandRequestsTotal = new client.Counter({
  name: 'graph_expand_requests_total',
  help: 'Total expandNeighbors requests',
  labelNames: ['cached'],
});
export const aiRequestTotal = new client.Counter({
  name: 'ai_request_total',
  help: 'AI request events',
  labelNames: ['status'],
});
export const resolverLatencyMs = new client.Histogram({
  name: 'resolver_latency_ms',
  help: 'Resolver latency in ms',
  labelNames: ['operation'],
  buckets: [5, 10, 25, 50, 100, 200, 400, 800, 1600],
});

export const neighborhoodCacheHitRatio = new client.Gauge({
  name: 'neighborhood_cache_hit_ratio',
  help: 'Neighborhood cache hit ratio',
});

export const neighborhoodCacheLatencyMs = new client.Histogram({
  name: 'neighborhood_cache_latency_ms',
  help: 'Neighborhood cache lookup latency in ms',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

// Enhanced GraphQL resolver metrics
export const graphqlResolverDurationSeconds = new client.Histogram({
  name: 'graphql_resolver_duration_seconds',
  help: 'Duration of GraphQL resolver execution in seconds',
  labelNames: ['resolver_name', 'field_name', 'type_name', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const graphqlResolverErrorsTotal = new client.Counter({
  name: 'graphql_resolver_errors_total',
  help: 'Total number of GraphQL resolver errors',
  labelNames: ['resolver_name', 'field_name', 'type_name', 'error_type'],
});

export const graphqlResolverCallsTotal = new client.Counter({
  name: 'graphql_resolver_calls_total',
  help: 'Total number of GraphQL resolver calls',
  labelNames: ['resolver_name', 'field_name', 'type_name'],
});
// Web Vitals metrics reported from clients
export const webVitalValue = new client.Gauge({
  name: 'web_vital_value',
  help: 'Latest reported Web Vitals values',
  labelNames: ['metric', 'id'],
});

// Real-time updates metrics
export const realtimeConflictsTotal = new client.Counter({
  name: 'realtime_conflicts_total',
  help: 'Total number of real-time update conflicts (LWW)',
});

export const idempotentHitsTotal = new client.Counter({
  name: 'idempotent_hits_total',
  help: 'Total number of idempotent mutation hits',
});

// Cache metrics
export const intelgraphCacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});
export const intelgraphCacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
});
export const intelgraphJobsProcessed = new client.Counter({
  name: 'jobs_processed_total',
  help: 'Total number of background jobs processed',
  labelNames: ['job_type', 'status'],
});
export const intelgraphOutboxSyncLatency = new client.Histogram({
  name: 'outbox_sync_latency_seconds',
  help: 'Latency of outbox synchronization',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});
export const intelgraphActiveConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});
export const intelgraphDatabaseQueryDuration = dbQueryDuration;
export const intelgraphHttpRequestDuration = httpRequestDuration;
export const intelgraphGraphragQueryTotal = new client.Counter({
  name: 'graphrag_queries_total',
  help: 'Total number of GraphRAG queries',
  labelNames: ['status', 'hasPreview', 'redactionEnabled', 'provenanceEnabled'],
});
export const intelgraphGraphragQueryDurationMs = new client.Histogram({
  name: 'graphrag_query_duration_ms',
  help: 'Duration of GraphRAG queries in ms',
  buckets: [10, 50, 100, 500, 1000, 5000],
});
export const intelgraphQueryPreviewsTotal = new client.Counter({
  name: 'query_previews_total',
  help: 'Total number of query previews',
});
export const intelgraphQueryPreviewLatencyMs = new client.Histogram({
  name: 'query_preview_latency_ms',
  help: 'Latency of query previews in ms',
});
export const intelgraphQueryPreviewErrorsTotal = new client.Counter({
  name: 'query_preview_errors_total',
  help: 'Total number of query preview errors',
});
export const intelgraphQueryPreviewExecutionsTotal = new client.Counter({
  name: 'query_preview_executions_total',
  help: 'Total number of query preview executions',
});
export const intelgraphGlassBoxRunsTotal = new client.Counter({
  name: 'glassbox_runs_total',
  help: 'Total number of GlassBox runs',
});
export const intelgraphGlassBoxRunDurationMs = new client.Histogram({
  name: 'glassbox_run_duration_ms',
  help: 'Duration of GlassBox runs in ms',
});
export const intelgraphGlassBoxCacheHits = new client.Counter({
  name: 'glassbox_cache_hits_total',
  help: 'Total number of GlassBox cache hits',
});
export const copilotApiRequestTotal = new client.Counter({
  name: 'copilot_api_requests_total',
  help: 'Total number of Copilot API requests',
});
export const copilotApiRequestDurationMs = new client.Histogram({
  name: 'copilot_api_request_duration_ms',
  help: 'Duration of Copilot API requests in ms',
});
export const maestroDagExecutionDurationSeconds = new client.Histogram({
  name: 'maestro_dag_execution_duration_seconds',
  help: 'Maestro DAG execution duration in seconds',
});
export const maestroJobExecutionDurationSeconds = new client.Histogram({
  name: 'maestro_job_execution_duration_seconds',
  help: 'Maestro job execution duration in seconds',
  labelNames: ['job_type', 'status'],
});
export const llmTokensTotal = new client.Counter({
  name: 'llm_tokens_total',
  help: 'Total number of LLM tokens',
  labelNames: ['model', 'type'],
});
export const llmRequestDuration = new client.Histogram({
  name: 'llm_request_duration_seconds',
  help: 'Duration of LLM requests in seconds',
  labelNames: ['model'],
});

export const intelgraphJobQueueDepth = new client.Gauge({
  name: 'intelgraph_job_queue_depth',
  help: 'Current depth of job queues',
  labelNames: ['queue_name', 'status'],
});

// Golden Path Metrics
export const goldenPathStepTotal = new client.Counter({
  name: 'golden_path_step_total',
  help: 'Total number of golden path steps executed',
  labelNames: ['step', 'status', 'tenant_id'],
});

export const uiErrorBoundaryCatchTotal = new client.Counter({
  name: 'ui_error_boundary_catch_total',
  help: 'Total number of UI errors caught by boundary',
  labelNames: ['component', 'tenant_id'],
});

// DORA Metrics
export const maestroDeploymentsTotal = new client.Counter({
  name: 'maestro_deployments_total',
  help: 'Total number of deployments',
  labelNames: ['environment', 'status'],
});

export const maestroPrLeadTimeHours = new client.Histogram({
  name: 'maestro_pr_lead_time_hours',
  help: 'Lead time for changes in hours',
  buckets: [1, 4, 12, 24, 48, 168],
});

export const maestroChangeFailureRate = new client.Gauge({
  name: 'maestro_change_failure_rate',
  help: 'Change failure rate (0-1)',
});

export const maestroMttrHours = new client.Histogram({
  name: 'maestro_mttr_hours',
  help: 'Mean time to restore in hours',
  buckets: [0.1, 0.5, 1, 4, 24],
});

// Auto-remediation execution tracking
export const serviceAutoRemediationsTotal = new client.Counter({
  name: 'service_auto_remediations_total',
  help: 'Total number of automated remediation actions executed',
  labelNames: ['service', 'action', 'result'],
});

// Rate limiting and Circuit Breaker metrics
export const rateLimitExceededTotal = new client.Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['tenant', 'class'],
});

export const breakerState = new client.Gauge({
  name: 'breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['service'],
});

register.registerMetric(rateLimitExceededTotal);
register.registerMetric(breakerState);

register.registerMetric(graphExpandRequestsTotal);
register.registerMetric(aiRequestTotal);
register.registerMetric(resolverLatencyMs);
register.registerMetric(neighborhoodCacheHitRatio);
register.registerMetric(neighborhoodCacheLatencyMs);
register.registerMetric(graphqlResolverDurationSeconds);
register.registerMetric(graphqlResolverErrorsTotal);
register.registerMetric(graphqlResolverCallsTotal);
register.registerMetric(webVitalValue);
register.registerMetric(realtimeConflictsTotal);
register.registerMetric(idempotentHitsTotal);
register.registerMetric(businessUserSignupsTotal);
register.registerMetric(businessApiCallsTotal);
register.registerMetric(businessRevenueTotal);
register.registerMetric(serviceAutoRemediationsTotal);
register.registerMetric(intelgraphCacheHits);
register.registerMetric(intelgraphCacheMisses);
register.registerMetric(intelgraphJobsProcessed);
register.registerMetric(intelgraphOutboxSyncLatency);
register.registerMetric(intelgraphActiveConnections);
register.registerMetric(intelgraphGraphragQueryTotal);
register.registerMetric(intelgraphGraphragQueryDurationMs);
register.registerMetric(intelgraphQueryPreviewsTotal);
register.registerMetric(intelgraphQueryPreviewLatencyMs);
register.registerMetric(intelgraphQueryPreviewErrorsTotal);
register.registerMetric(intelgraphQueryPreviewExecutionsTotal);
register.registerMetric(intelgraphGlassBoxRunsTotal);
register.registerMetric(intelgraphGlassBoxRunDurationMs);
register.registerMetric(intelgraphGlassBoxCacheHits);
register.registerMetric(copilotApiRequestTotal);
register.registerMetric(copilotApiRequestDurationMs);
register.registerMetric(maestroDagExecutionDurationSeconds);
register.registerMetric(maestroJobExecutionDurationSeconds);
register.registerMetric(llmTokensTotal);
register.registerMetric(llmRequestDuration);

export const metrics = {
  graphExpandRequestsTotal,
  aiRequestTotal,
  resolverLatencyMs,
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
  neighborhoodCacheHitRatio,
  neighborhoodCacheLatencyMs,
  pbacDecisionsTotal,
  intelgraphCacheHits,
  intelgraphCacheMisses,
  intelgraphJobsProcessed,
  intelgraphOutboxSyncLatency,
  intelgraphActiveConnections,
  intelgraphDatabaseQueryDuration,
  intelgraphHttpRequestDuration,
  intelgraphGraphragQueryTotal,
  intelgraphGraphragQueryDurationMs,
  intelgraphQueryPreviewsTotal,
  intelgraphQueryPreviewLatencyMs,
  intelgraphQueryPreviewErrorsTotal,
  intelgraphQueryPreviewExecutionsTotal,
  intelgraphGlassBoxRunsTotal,
  intelgraphGlassBoxRunDurationMs,
  intelgraphGlassBoxCacheHits,
  copilotApiRequestTotal,
  copilotApiRequestDurationMs,
  maestroDagExecutionDurationSeconds,
  maestroJobExecutionDurationSeconds,
  llmTokensTotal,
  llmRequestDuration,
  rateLimitExceededTotal,
  breakerState,
  intelgraphJobQueueDepth,
  goldenPathStepTotal,
  uiErrorBoundaryCatchTotal,
  maestroDeploymentsTotal,
  maestroPrLeadTimeHours,
  maestroChangeFailureRate,
  maestroMttrHours
};

// Update memory usage periodically
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const usage = process.memoryUsage();
    memoryUsage.set({ component: 'heap_used' }, usage.heapUsed);
    memoryUsage.set({ component: 'heap_total' }, usage.heapTotal);
    memoryUsage.set({ component: 'external' }, usage.external);
    memoryUsage.set({ component: 'rss' }, usage.rss);
  }, 30000); // Every 30 seconds
}

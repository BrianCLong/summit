/**
 * Prometheus metrics collection for IntelGraph Platform
 */
import * as client from 'prom-client';

// Create a Registry which registers the metrics
export const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({
  register,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection buckets
});

// Custom Application Metrics

// HTTP Request metrics
console.log('Initializing httpRequestDuration...');
try {
  console.log('Current metrics in global registry:', client.register.getMetricsAsJSON().map(m => m.name));
} catch (e) { }

export const httpRequestDuration = new client.Histogram({
  registers: [],
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestsTotal = new client.Counter({
  registers: [],
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Business KPIs exposed as first-class metrics for the control plane
export const businessUserSignupsTotal = new client.Counter({
  registers: [],
  name: 'business_user_signups_total',
  help: 'Total number of customer or workspace signups',
  labelNames: ['tenant', 'plan'],
});

export const businessApiCallsTotal = new client.Counter({
  registers: [],
  name: 'business_api_calls_total',
  help: 'API calls attributed to customer activity and billing',
  labelNames: ['service', 'route', 'status_code', 'tenant'],
});

export const businessRevenueTotal = new client.Counter({
  registers: [],
  name: 'business_revenue_total',
  help: "Recognized revenue amounts in the system's reporting currency",
  labelNames: ['tenant', 'currency'],
});

// GraphQL metrics
export const graphqlRequestDuration = new client.Histogram({
  registers: [],
  name: 'graphql_request_duration_seconds',
  help: 'Duration of GraphQL requests in seconds',
  labelNames: ['operation', 'operation_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const graphqlRequestsTotal = new client.Counter({
  registers: [],
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation', 'operation_type', 'status'],
});

export const graphqlErrors = new client.Counter({
  registers: [],
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation', 'error_type'],
});

// Tenant isolation violations
export const tenantScopeViolationsTotal = new client.Counter({
  registers: [],
  name: 'tenant_scope_violations_total',
  help: 'Total number of tenant scope violations',
});

// Database metrics
export const dbConnectionsActive = new client.Gauge({
  registers: [],
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
});

export const dbQueryDuration = new client.Histogram({
  registers: [],
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['database', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const dbQueriesTotal = new client.Counter({
  registers: [],
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['database', 'operation', 'status'],
});

export const vectorQueryDurationSeconds = new client.Histogram({
  registers: [],
  name: 'vector_query_duration_seconds',
  help: 'Latency of pgvector operations in seconds',
  labelNames: ['operation', 'tenant_id'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

export const vectorQueriesTotal = new client.Counter({
  registers: [],
  name: 'vector_queries_total',
  help: 'Total pgvector operations by outcome',
  labelNames: ['operation', 'tenant_id', 'status'],
});

// AI/ML Processing metrics
export const aiJobsQueued = new client.Gauge({
  registers: [],
  name: 'ai_jobs_queued',
  help: 'Number of AI/ML jobs in queue',
  labelNames: ['job_type'],
});

export const aiJobsProcessing = new client.Gauge({
  registers: [],
  name: 'ai_jobs_processing',
  help: 'Number of AI/ML jobs currently processing',
  labelNames: ['job_type'],
});

export const aiJobDuration = new client.Histogram({
  registers: [],
  name: 'ai_job_duration_seconds',
  help: 'Duration of AI/ML job processing in seconds',
  labelNames: ['job_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

export const aiJobsTotal = new client.Counter({
  registers: [],
  name: 'ai_jobs_total',
  help: 'Total number of AI/ML jobs processed',
  labelNames: ['job_type', 'status'],
});

// LLM Metrics
export const llmRequestDuration = new client.Histogram({
  registers: [],
  name: 'llm_request_duration_seconds',
  help: 'Duration of LLM requests in seconds',
  labelNames: ['provider', 'model', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 20, 60],
});

export const llmTokensTotal = new client.Counter({
  registers: [],
  name: 'llm_tokens_total',
  help: 'Total number of tokens processed',
  labelNames: ['provider', 'model', 'type'], // type: prompt, completion
});

export const llmRequestsTotal = new client.Counter({
  registers: [],
  name: 'llm_requests_total',
  help: 'Total number of LLM requests',
  labelNames: ['provider', 'model', 'status'],
});

// Graph operations metrics
export const graphNodesTotal = new client.Gauge({
  registers: [],
  name: 'graph_nodes_total',
  help: 'Total number of nodes in the graph',
  labelNames: ['investigation_id'],
});

export const graphEdgesTotal = new client.Gauge({
  registers: [],
  name: 'graph_edges_total',
  help: 'Total number of edges in the graph',
  labelNames: ['investigation_id'],
});

export const graphOperationDuration = new client.Histogram({
  registers: [],
  name: 'graph_operation_duration_seconds',
  help: 'Duration of graph operations in seconds',
  labelNames: ['operation', 'investigation_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// WebSocket metrics
export const websocketConnections = new client.Gauge({
  registers: [],
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
});

export const websocketMessages = new client.Counter({
  registers: [],
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'event_type'],
});

// Investigation metrics
export const investigationsActive = new client.Gauge({
  registers: [],
  name: 'investigations_active',
  help: 'Number of active investigations',
});

export const investigationOperations = new client.Counter({
  registers: [],
  name: 'investigation_operations_total',
  help: 'Total number of investigation operations',
  labelNames: ['operation', 'user_id'],
});

// Entity resolution merge outcomes
export const erMergeOutcomesTotal = new client.Counter({
  registers: [],
  name: 'er_merge_outcomes_total',
  help: 'Total number of ER merge outcomes recorded',
  labelNames: ['decision', 'entity_type', 'method'],
});

// Deployment rollbacks
export const deploymentRollbacksTotal = new client.Counter({
  registers: [],
  name: 'deployment_rollbacks_total',
  help: 'Total number of deployment rollbacks',
  labelNames: ['service', 'reason', 'success'],
});

// Human-in-the-loop approvals
const approvalsPending = new client.Gauge({
  registers: [],
  name: 'approvals_pending',
  help: 'Current pending approvals requiring human review',
});

const approvalsApprovedTotal = new client.Counter({
  registers: [],
  name: 'approvals_approved_total',
  help: 'Total approvals granted by human reviewers',
});

const approvalsRejectedTotal = new client.Counter({
  registers: [],
  name: 'approvals_rejected_total',
  help: 'Total approvals rejected by human reviewers',
});

// Error tracking
export const applicationErrors = new client.Counter({
  registers: [],
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['module', 'error_type', 'severity'],
});

// Memory usage for specific components
export const memoryUsage = new client.Gauge({
  registers: [],
  name: 'application_memory_usage_bytes',
  help: 'Memory usage by application component',
  labelNames: ['component'],
});

// Pipeline SLI metrics (labels: source, pipeline, env)
export const pipelineUptimeRatio = new client.Gauge({
  registers: [],
  name: 'pipeline_uptime_ratio',
  help: 'Pipeline availability ratio (0..1) over current window',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineFreshnessSeconds = new client.Gauge({
  registers: [],
  name: 'pipeline_freshness_seconds',
  help: 'Freshness (seconds) from source event to load completion',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineCompletenessRatio = new client.Gauge({
  registers: [],
  name: 'pipeline_completeness_ratio',
  help: 'Data completeness ratio (0..1) expected vs actual',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineCorrectnessRatio = new client.Gauge({
  registers: [],
  name: 'pipeline_correctness_ratio',
  help: 'Validation pass rate ratio (0..1)',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineLatencySeconds = new client.Histogram({
  registers: [],
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
register.registerMetric(vectorQueryDurationSeconds);
register.registerMetric(vectorQueriesTotal);
register.registerMetric(aiJobsQueued);
register.registerMetric(aiJobsProcessing);
register.registerMetric(aiJobDuration);
register.registerMetric(aiJobsTotal);
register.registerMetric(llmRequestDuration);
register.registerMetric(llmTokensTotal);
register.registerMetric(llmRequestsTotal);
register.registerMetric(graphNodesTotal);
register.registerMetric(graphEdgesTotal);
register.registerMetric(graphOperationDuration);
register.registerMetric(websocketConnections);
register.registerMetric(websocketMessages);
register.registerMetric(investigationsActive);
register.registerMetric(investigationOperations);
register.registerMetric(erMergeOutcomesTotal);
register.registerMetric(deploymentRollbacksTotal);
register.registerMetric(approvalsPending);
register.registerMetric(approvalsApprovedTotal);
register.registerMetric(approvalsRejectedTotal);
register.registerMetric(applicationErrors);
register.registerMetric(memoryUsage);
register.registerMetric(pipelineUptimeRatio);
register.registerMetric(pipelineFreshnessSeconds);
register.registerMetric(pipelineCompletenessRatio);
register.registerMetric(pipelineCorrectnessRatio);
register.registerMetric(pipelineLatencySeconds);

// GraphRAG metrics for schema validation and caching
export const graphragSchemaFailuresTotal = new client.Counter({
  registers: [],
  name: 'graphrag_schema_failures_total',
  help: 'Total number of GraphRAG schema validation failures',
});
export const graphragCacheHitRatio = new client.Gauge({
  registers: [],
  name: 'graphrag_cache_hit_ratio',
  help: 'Ratio of GraphRAG cache hits to total requests',
});
register.registerMetric(graphragSchemaFailuresTotal);
register.registerMetric(graphragCacheHitRatio);
export const pbacDecisionsTotal = new client.Counter({
  registers: [],
  name: 'pbac_decisions_total',
  help: 'Total PBAC access decisions',
  labelNames: ['decision'],
});
register.registerMetric(pbacDecisionsTotal);

export const admissionDecisionsTotal = new client.Counter({
  registers: [],
  name: 'admission_decisions_total',
  help: 'Total admission control decisions',
  labelNames: ['decision', 'policy'],
});
register.registerMetric(admissionDecisionsTotal);

// Docling service metrics
export const doclingInferenceDuration = new client.Histogram({
  registers: [],
  name: 'docling_inference_duration_seconds',
  help: 'Docling document inference duration in seconds',
  labelNames: ['model', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});
register.registerMetric(doclingInferenceDuration);

export const doclingInferenceTotal = new client.Counter({
  registers: [],
  name: 'docling_inference_total',
  help: 'Total Docling inference requests',
  labelNames: ['model', 'status'],
});
register.registerMetric(doclingInferenceTotal);

export const doclingCharactersProcessed = new client.Counter({
  registers: [],
  name: 'docling_characters_processed_total',
  help: 'Total characters processed by Docling',
  labelNames: ['model'],
});
register.registerMetric(doclingCharactersProcessed);

export const doclingCostUsd = new client.Counter({
  registers: [],
  name: 'docling_cost_usd_total',
  help: 'Total cost in USD for Docling processing',
  labelNames: ['model'],
});
register.registerMetric(doclingCostUsd);

// New domain metrics
export const graphExpandRequestsTotal = new client.Counter({
  registers: [],
  name: 'graph_expand_requests_total',
  help: 'Total expandNeighbors requests',
  labelNames: ['cached'],
});
export const aiRequestTotal = new client.Counter({
  registers: [],
  name: 'ai_request_total',
  help: 'AI request events',
  labelNames: ['status'],
});
export const resolverLatencyMs = new client.Histogram({
  registers: [],
  name: 'resolver_latency_ms',
  help: 'Resolver latency in ms',
  labelNames: ['operation'],
  buckets: [5, 10, 25, 50, 100, 200, 400, 800, 1600],
});

export const neighborhoodCacheHitRatio = new client.Gauge({
  registers: [],
  name: 'neighborhood_cache_hit_ratio',
  help: 'Neighborhood cache hit ratio',
});

export const neighborhoodCacheLatencyMs = new client.Histogram({
  registers: [],
  name: 'neighborhood_cache_latency_ms',
  help: 'Neighborhood cache lookup latency in ms',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

// Enhanced GraphQL resolver metrics
export const graphqlResolverDurationSeconds = new client.Histogram({
  registers: [],
  name: 'graphql_resolver_duration_seconds',
  help: 'Duration of GraphQL resolver execution in seconds',
  labelNames: ['resolver_name', 'field_name', 'type_name', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const graphqlResolverErrorsTotal = new client.Counter({
  registers: [],
  name: 'graphql_resolver_errors_total',
  help: 'Total number of GraphQL resolver errors',
  labelNames: ['resolver_name', 'field_name', 'type_name', 'error_type'],
});

export const graphqlResolverCallsTotal = new client.Counter({
  registers: [],
  name: 'graphql_resolver_calls_total',
  help: 'Total number of GraphQL resolver calls',
  labelNames: ['resolver_name', 'field_name', 'type_name'],
});
// Web Vitals metrics reported from clients
export const webVitalValue = new client.Gauge({
  registers: [],
  name: 'web_vital_value',
  help: 'Latest reported Web Vitals values',
  labelNames: ['metric', 'id'],
});

// Real-time updates metrics
export const realtimeConflictsTotal = new client.Counter({
  registers: [],
  name: 'realtime_conflicts_total',
  help: 'Total number of real-time update conflicts (LWW)',
});

export const idempotentHitsTotal = new client.Counter({
  registers: [],
  name: 'idempotent_hits_total',
  help: 'Total number of idempotent mutation hits',
});

// Auto-remediation execution tracking
export const serviceAutoRemediationsTotal = new client.Counter({
  registers: [],
  name: 'service_auto_remediations_total',
  help: 'Total number of automated remediation actions executed',
  labelNames: ['service', 'action', 'result'],
});

// Golden Path Metrics
export const goldenPathStepTotal = new client.Counter({
  registers: [],
  name: 'golden_path_step_total',
  help: 'Completion of steps in the Golden Path user journey',
  labelNames: ['step', 'status', 'tenant_id'],
});

// UI Error Boundary Metrics
export const uiErrorBoundaryCatchTotal = new client.Counter({
  registers: [],
  name: 'ui_error_boundary_catch_total',
  help: 'Total number of UI errors caught by the React Error Boundary',
  labelNames: ['component', 'tenant_id'],
});

export const breakerState = new client.Gauge({
  registers: [],
  name: 'circuit_breaker_state',
  help: 'State of the circuit breaker (0 = Closed, 1 = Open)',
  labelNames: ['service'],
});

export const intelgraphJobQueueDepth = new client.Gauge({
  registers: [],
  name: 'intelgraph_job_queue_depth',
  help: 'Current depth of the job queue',
  labelNames: ['queue'],
});

// DORA Metrics (Maestro)
export const maestroDeploymentsTotal = new client.Counter({
  registers: [],
  name: 'maestro_deployments_total',
  help: 'Total number of deployments',
  labelNames: ['environment', 'status'],
});

export const maestroPrLeadTimeHours = new client.Histogram({
  registers: [],
  name: 'maestro_pr_lead_time_hours',
  help: 'Lead time for changes in hours',
  buckets: [1, 4, 12, 24, 48, 168],
});

export const maestroChangeFailureRate = new client.Gauge({
  registers: [],
  name: 'maestro_change_failure_rate',
  help: 'Change failure rate percentage',
});

export const maestroMttrHours = new client.Histogram({
  registers: [],
  name: 'maestro_mttr_hours',
  help: 'Mean time to recovery in hours',
  buckets: [0.1, 0.5, 1, 4, 24],
});

// Maestro Orchestration Health Metrics
export const maestroDagExecutionDurationSeconds = new client.Histogram({
  registers: [],
  name: 'maestro_dag_execution_duration_seconds',
  help: 'Duration of Maestro DAG execution in seconds',
  labelNames: ['dag_id', 'status', 'tenant_id'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

export const maestroJobExecutionDurationSeconds = new client.Histogram({
  registers: [],
  name: 'maestro_job_execution_duration_seconds',
  help: 'Duration of Maestro Job execution in seconds',
  labelNames: ['job_type', 'status', 'tenant_id'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});

register.registerMetric(maestroDagExecutionDurationSeconds);
register.registerMetric(maestroJobExecutionDurationSeconds);

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
register.registerMetric(goldenPathStepTotal);
register.registerMetric(uiErrorBoundaryCatchTotal);
register.registerMetric(maestroDeploymentsTotal);
register.registerMetric(maestroPrLeadTimeHours);
register.registerMetric(maestroChangeFailureRate);
register.registerMetric(maestroMttrHours);
register.registerMetric(breakerState);
register.registerMetric(intelgraphJobQueueDepth);

export const metrics = {
  graphExpandRequestsTotal,
  aiRequestTotal,
  resolverLatencyMs,
  breakerState,
  intelgraphJobQueueDepth,
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
  neighborhoodCacheHitRatio,
  neighborhoodCacheLatencyMs,
  pbacDecisionsTotal,
  businessUserSignupsTotal,
  businessApiCallsTotal,
  businessRevenueTotal,
  serviceAutoRemediationsTotal,
  goldenPathStepTotal,
  uiErrorBoundaryCatchTotal,
  maestroDeploymentsTotal,
  maestroPrLeadTimeHours,
  maestroChangeFailureRate,
  maestroMttrHours,
  maestroDagExecutionDurationSeconds,
  maestroJobExecutionDurationSeconds,
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
  llmRequestDuration,
  llmTokensTotal,
  llmRequestsTotal,
  graphNodesTotal,
  graphEdgesTotal,
  graphOperationDuration,
  websocketConnections,
  websocketMessages,
  investigationsActive,
  investigationOperations,
  approvalsPending,
  approvalsApprovedTotal,
  approvalsRejectedTotal,
  applicationErrors,
  tenantScopeViolationsTotal,
  memoryUsage,
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
  realtimeConflictsTotal,
  idempotentHitsTotal,
};

// Update memory usage periodically
setInterval(() => {
  const usage = process.memoryUsage();
  memoryUsage.set({ component: 'heap_used' }, usage.heapUsed);
  memoryUsage.set({ component: 'heap_total' }, usage.heapTotal);
  memoryUsage.set({ component: 'external' }, usage.external);
  memoryUsage.set({ component: 'rss' }, usage.rss);
}, 30000); // Every 30 seconds

// Legacy IntelGraph metrics (merged from observability/metrics.ts)
export const intelgraphJobsProcessed = new client.Counter({
  name: 'intelgraph_jobs_processed_total',
  help: 'Total jobs processed by the system',
  labelNames: ['queue', 'status'],
});

export const intelgraphOutboxSyncLatency = new client.Histogram({
  name: 'intelgraph_outbox_sync_latency_seconds',
  help: 'Latency of outbox to Neo4j sync operations',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});

export const intelgraphActiveConnections = new client.Gauge({
  name: 'intelgraph_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['tenant'],
});

export const intelgraphDatabaseQueryDuration = new client.Histogram({
  name: 'intelgraph_database_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['database', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const intelgraphHttpRequestDuration = new client.Histogram({
  name: 'intelgraph_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// GraphRAG Query Preview metrics
export const intelgraphGraphragQueryTotal = new client.Counter({
  name: 'intelgraph_graphrag_query_total',
  help: 'Total GraphRAG queries executed',
  labelNames: ['status', 'hasPreview', 'redactionEnabled', 'provenanceEnabled'],
});

export const intelgraphGraphragQueryDurationMs = new client.Histogram({
  name: 'intelgraph_graphrag_query_duration_ms',
  help: 'GraphRAG query execution duration in milliseconds',
  labelNames: ['hasPreview'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000],
});

export const intelgraphQueryPreviewsTotal = new client.Counter({
  name: 'intelgraph_query_previews_total',
  help: 'Total query previews generated',
  labelNames: ['language', 'status'],
});

export const intelgraphQueryPreviewLatencyMs = new client.Histogram({
  name: 'intelgraph_query_preview_latency_ms',
  help: 'Query preview generation latency in milliseconds',
  labelNames: ['language'],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000],
});

export const intelgraphQueryPreviewErrorsTotal = new client.Counter({
  name: 'intelgraph_query_preview_errors_total',
  help: 'Total query preview errors',
  labelNames: ['language'],
});

export const intelgraphQueryPreviewExecutionsTotal = new client.Counter({
  name: 'intelgraph_query_preview_executions_total',
  help: 'Total query preview executions',
  labelNames: ['language', 'dryRun', 'status'],
});

export const intelgraphGlassBoxRunsTotal = new client.Counter({
  name: 'intelgraph_glass_box_runs_total',
  help: 'Total glass-box runs created',
  labelNames: ['type', 'status'],
});

export const intelgraphGlassBoxRunDurationMs = new client.Histogram({
  name: 'intelgraph_glass_box_run_duration_ms',
  help: 'Glass-box run duration in milliseconds',
  labelNames: ['type'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000, 60000],
});

export const intelgraphGlassBoxCacheHits = new client.Counter({
  name: 'intelgraph_glass_box_cache_hits_total',
  help: 'Total glass-box cache hits',
  labelNames: ['operation'],
});

export const intelgraphCacheHits = new client.Counter({
  name: 'intelgraph_cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['level'],
});

export const intelgraphCacheMisses = new client.Counter({
  name: 'intelgraph_cache_misses_total',
  help: 'Total cache misses',
});

// Copilot API metrics
export const copilotApiRequestTotal = new client.Counter({
  name: 'copilot_api_request_total',
  help: 'Total number of AI Copilot API requests',
  labelNames: ['endpoint', 'mode', 'status'],
});

export const copilotApiRequestDurationMs = new client.Histogram({
  name: 'copilot_api_request_duration_ms',
  help: 'AI Copilot API request duration in milliseconds',
  labelNames: ['endpoint', 'mode'],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000],
});

// LLM Cost metrics
export const llmCostTotal = new client.Counter({
  name: 'llm_cost_total_usd',
  help: 'Total estimated cost of LLM calls in USD',
  labelNames: ['provider', 'model'],
});

// Register metrics
register.registerMetric(llmCostTotal);
register.registerMetric(intelgraphJobsProcessed);
register.registerMetric(intelgraphOutboxSyncLatency);
register.registerMetric(intelgraphActiveConnections);
register.registerMetric(intelgraphDatabaseQueryDuration);
register.registerMetric(intelgraphHttpRequestDuration);
register.registerMetric(intelgraphGraphragQueryTotal);
register.registerMetric(intelgraphGraphragQueryDurationMs);
register.registerMetric(intelgraphQueryPreviewsTotal);
register.registerMetric(intelgraphQueryPreviewLatencyMs);
register.registerMetric(intelgraphQueryPreviewErrorsTotal);
register.registerMetric(intelgraphQueryPreviewExecutionsTotal);
register.registerMetric(intelgraphGlassBoxRunsTotal);
register.registerMetric(intelgraphGlassBoxRunDurationMs);
register.registerMetric(intelgraphGlassBoxCacheHits);
register.registerMetric(intelgraphCacheHits);
register.registerMetric(intelgraphCacheMisses);
register.registerMetric(copilotApiRequestTotal);
register.registerMetric(copilotApiRequestDurationMs);

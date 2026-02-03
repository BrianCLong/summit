/**
 * Prometheus metrics collection for IntelGraph Platform
 */
import * as promClient from 'prom-client';

const client: any = (promClient as any).default || promClient;

// Create a Registry which registers the metrics
export const register = new client.Registry();

// Store the default metrics collection handle for cleanup
let defaultMetricsInterval: any;

// Add default metrics (CPU, memory, event loop lag, etc.)
// Only collect in production/non-test environments to avoid open handles in tests
if (process.env.NODE_ENV !== 'test' && process.env.ZERO_FOOTPRINT !== 'true') {
  try {
    defaultMetricsInterval = client.collectDefaultMetrics({
      register,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection buckets
    });
  } catch (e) { }
}

// Cleanup function to stop metrics collection
export function stopMetricsCollection() {
  if (defaultMetricsInterval && typeof defaultMetricsInterval.clear === 'function') {
    defaultMetricsInterval.clear();
  }
  register.clear();
}

// Custom Application Metrics

function createHistogram(config: any) {
  try {
    return new client.Histogram(config);
  } catch (e) {
    return {
      observe: () => { },
      startTimer: () => () => { },
      inc: () => { },
      dec: () => { },
      set: () => { },
      labels: () => ({ observe: () => { }, inc: () => { }, dec: () => { }, set: () => { } })
    } as any;
  }
}

function createCounter(config: any) {
  try {
    return new client.Counter(config);
  } catch (e) {
    return {
      inc: () => { },
      labels: () => ({ inc: () => { } })
    } as any;
  }
}

function createGauge(config: any) {
  try {
    return new client.Gauge(config);
  } catch (e) {
    return {
      inc: () => { },
      dec: () => { },
      set: () => { },
      labels: () => ({ inc: () => { }, dec: () => { }, set: () => { } })
    } as any;
  }
}

// HTTP Request metrics
export const httpRequestDuration = createHistogram({
  registers: [],
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestsTotal = createCounter({
  registers: [],
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Business KPIs exposed as first-class metrics for the control plane
export const businessUserSignupsTotal = createCounter({
  registers: [],
  name: 'business_user_signups_total',
  help: 'Total number of customer or workspace signups',
  labelNames: ['tenant', 'plan'],
});

export const businessApiCallsTotal = createCounter({
  registers: [],
  name: 'business_api_calls_total',
  help: 'API calls attributed to customer activity and billing',
  labelNames: ['service', 'route', 'status_code', 'tenant'],
});

export const businessRevenueTotal = createCounter({
  registers: [],
  name: 'business_revenue_total',
  help: "Recognized revenue amounts in the system's reporting currency",
  labelNames: ['tenant', 'currency'],
});

// GraphQL metrics
export const graphqlRequestDuration = createHistogram({
  registers: [],
  name: 'graphql_request_duration_seconds',
  help: 'Duration of GraphQL requests in seconds',
  labelNames: ['operation', 'operation_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const graphqlRequestsTotal = createCounter({
  registers: [],
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation', 'operation_type', 'status'],
});

export const graphqlErrors = createCounter({
  registers: [],
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation', 'error_type'],
});

// Tenant isolation violations
export const tenantScopeViolationsTotal = createCounter({
  registers: [],
  name: 'tenant_scope_violations_total',
  help: 'Total number of tenant scope violations',
});

// Database metrics
export const dbConnectionsActive = createGauge({
  registers: [],
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
});

export const dbQueryDuration = createHistogram({
  registers: [],
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['database', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const dbQueriesTotal = createCounter({
  registers: [],
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['database', 'operation', 'status'],
});

export const vectorQueryDurationSeconds = createHistogram({
  registers: [],
  name: 'vector_query_duration_seconds',
  help: 'Latency of pgvector operations in seconds',
  labelNames: ['operation', 'tenant_id'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

export const vectorQueriesTotal = createCounter({
  registers: [],
  name: 'vector_queries_total',
  help: 'Total pgvector operations by outcome',
  labelNames: ['operation', 'tenant_id', 'status'],
});

// AI/ML Processing metrics
export const aiJobsQueued = createGauge({
  registers: [],
  name: 'ai_jobs_queued',
  help: 'Number of AI/ML jobs in queue',
  labelNames: ['job_type'],
});

export const aiJobsProcessing = createGauge({
  registers: [],
  name: 'ai_jobs_processing',
  help: 'Number of AI/ML jobs currently processing',
  labelNames: ['job_type'],
});

export const aiJobDuration = createHistogram({
  registers: [],
  name: 'ai_job_duration_seconds',
  help: 'Duration of AI/ML job processing in seconds',
  labelNames: ['job_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

export const aiJobsTotal = createCounter({
  registers: [],
  name: 'ai_jobs_total',
  help: 'Total number of AI/ML jobs processed',
  labelNames: ['job_type', 'status'],
});

// LLM Metrics
export const llmRequestDuration = createHistogram({
  registers: [],
  name: 'llm_request_duration_seconds',
  help: 'Duration of LLM requests in seconds',
  labelNames: ['provider', 'model', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 20, 60],
});

export const llmTokensTotal = createCounter({
  registers: [],
  name: 'llm_tokens_total',
  help: 'Total number of tokens processed',
  labelNames: ['provider', 'model', 'type'], // type: prompt, completion
});

export const llmRequestsTotal = createCounter({
  registers: [],
  name: 'llm_requests_total',
  help: 'Total number of LLM requests',
  labelNames: ['provider', 'model', 'status'],
});

// Graph operations metrics
export const graphNodesTotal = createGauge({
  registers: [],
  name: 'graph_nodes_total',
  help: 'Total number of nodes in the graph',
  labelNames: ['investigation_id'],
});

export const graphEdgesTotal = createGauge({
  registers: [],
  name: 'graph_edges_total',
  help: 'Total number of edges in the graph',
  labelNames: ['investigation_id'],
});

export const graphOperationDuration = createHistogram({
  registers: [],
  name: 'graph_operation_duration_seconds',
  help: 'Duration of graph operations in seconds',
  labelNames: ['operation', 'investigation_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// WebSocket metrics
export const websocketConnections = createGauge({
  registers: [],
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
});

export const websocketMessages = createCounter({
  registers: [],
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'event_type'],
});

// Investigation metrics
export const investigationsActive = createGauge({
  registers: [],
  name: 'investigations_active',
  help: 'Number of active investigations',
});

export const investigationOperations = createCounter({
  registers: [],
  name: 'investigation_operations_total',
  help: 'Total number of investigation operations',
  labelNames: ['operation', 'user_id'],
});

// Entity resolution merge outcomes
export const erMergeOutcomesTotal = createCounter({
  registers: [],
  name: 'er_merge_outcomes_total',
  help: 'Total number of ER merge outcomes recorded',
  labelNames: ['decision', 'entity_type', 'method'],
});

// Deployment rollbacks
export const deploymentRollbacksTotal = createCounter({
  registers: [],
  name: 'deployment_rollbacks_total',
  help: 'Total number of deployment rollbacks',
  labelNames: ['service', 'reason', 'success'],
});

// Human-in-the-loop approvals
const approvalsPending = createGauge({
  registers: [],
  name: 'approvals_pending',
  help: 'Current pending approvals requiring human review',
});

const approvalsApprovedTotal = createCounter({
  registers: [],
  name: 'approvals_approved_total',
  help: 'Total approvals granted by human reviewers',
  labelNames: ['reviewer_role'],
});

const approvalsRejectedTotal = createCounter({
  registers: [],
  name: 'approvals_rejected_total',
  help: 'Total approvals rejected by human reviewers',
  labelNames: ['reviewer_role'],
});

// Error tracking
export const applicationErrors = createCounter({
  registers: [],
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['module', 'error_type', 'severity'],
});

// Memory usage for specific components
export const memoryUsage = createGauge({
  registers: [],
  name: 'application_memory_usage_bytes',
  help: 'Memory usage by application component',
  labelNames: ['component'],
});

// Pipeline SLI metrics (labels: source, pipeline, env)
export const pipelineUptimeRatio = createGauge({
  registers: [],
  name: 'pipeline_uptime_ratio',
  help: 'Pipeline availability ratio (0..1) over current window',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineFreshnessSeconds = createGauge({
  registers: [],
  name: 'pipeline_freshness_seconds',
  help: 'Freshness (seconds) from source event to load completion',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineCompletenessRatio = createGauge({
  registers: [],
  name: 'pipeline_completeness_ratio',
  help: 'Data completeness ratio (0..1) expected vs actual',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineCorrectnessRatio = createGauge({
  registers: [],
  name: 'pipeline_correctness_ratio',
  help: 'Validation pass rate ratio (0..1)',
  labelNames: ['source', 'pipeline', 'env'],
});
export const pipelineLatencySeconds = createHistogram({
  registers: [],
  name: 'pipeline_latency_seconds',
  help: 'End-to-end processing latency seconds',
  labelNames: ['source', 'pipeline', 'env'],
  buckets: [5, 15, 30, 60, 120, 300, 600, 1200],
});

// Register all metrics
try {
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
} catch (e) { }

// GraphRAG metrics for schema validation and caching
export const graphragSchemaFailuresTotal = createCounter({
  registers: [],
  name: 'graphrag_schema_failures_total',
  help: 'Total number of GraphRAG schema validation failures',
});
export const graphragCacheHitRatio = createGauge({
  registers: [],
  name: 'graphrag_cache_hit_ratio',
  help: 'Ratio of GraphRAG cache hits to total requests',
});
try {
  register.registerMetric(graphragSchemaFailuresTotal);
  register.registerMetric(graphragCacheHitRatio);
} catch (e) { }
export const pbacDecisionsTotal = createCounter({
  registers: [],
  name: 'pbac_decisions_total',
  help: 'Total PBAC access decisions',
  labelNames: ['decision'],
});
try {
  register.registerMetric(pbacDecisionsTotal);
} catch (e) { }

export const admissionDecisionsTotal = createCounter({
  registers: [],
  name: 'admission_decisions_total',
  help: 'Total admission control decisions',
  labelNames: ['decision', 'policy'],
});
try {
  register.registerMetric(admissionDecisionsTotal);
} catch (e) { }

// Docling service metrics
export const doclingInferenceDuration = createHistogram({
  registers: [],
  name: 'docling_inference_duration_seconds',
  help: 'Docling document inference duration in seconds',
  labelNames: ['model', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});
try {
  register.registerMetric(doclingInferenceDuration);
} catch (e) { }

export const doclingInferenceTotal = createCounter({
  registers: [],
  name: 'docling_inference_total',
  help: 'Total Docling inference requests',
  labelNames: ['model', 'status'],
});
try {
  register.registerMetric(doclingInferenceTotal);
} catch (e) { }

export const doclingCharactersProcessed = createCounter({
  registers: [],
  name: 'docling_characters_processed_total',
  help: 'Total characters processed by Docling',
  labelNames: ['model'],
});
try {
  register.registerMetric(doclingCharactersProcessed);
} catch (e) { }

export const doclingCostUsd = createCounter({
  registers: [],
  name: 'docling_cost_usd_total',
  help: 'Total cost in USD for Docling processing',
  labelNames: ['model'],
});
try {
  register.registerMetric(doclingCostUsd);
} catch (e) { }

// New domain metrics
export const graphExpandRequestsTotal = createCounter({
  registers: [],
  name: 'graph_expand_requests_total',
  help: 'Total expandNeighbors requests',
  labelNames: ['cached'],
});
export const aiRequestTotal = createCounter({
  registers: [],
  name: 'ai_request_total',
  help: 'AI request events',
  labelNames: ['status'],
});
export const resolverLatencyMs = createHistogram({
  registers: [],
  name: 'resolver_latency_ms',
  help: 'Resolver latency in ms',
  labelNames: ['operation'],
  buckets: [5, 10, 25, 50, 100, 200, 400, 800, 1600],
});

export const neighborhoodCacheHitRatio = createGauge({
  registers: [],
  name: 'neighborhood_cache_hit_ratio',
  help: 'Neighborhood cache hit ratio',
});

export const neighborhoodCacheLatencyMs = createHistogram({
  registers: [],
  name: 'neighborhood_cache_latency_ms',
  help: 'Neighborhood cache lookup latency in ms',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

// Enhanced GraphQL resolver metrics
export const graphqlResolverDurationSeconds = createHistogram({
  registers: [],
  name: 'graphql_resolver_duration_seconds',
  help: 'Duration of GraphQL resolver execution in seconds',
  labelNames: ['resolver_name', 'field_name', 'type_name', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const graphqlResolverErrorsTotal = createCounter({
  registers: [],
  name: 'graphql_resolver_errors_total',
  help: 'Total number of GraphQL resolver errors',
  labelNames: ['resolver_name', 'field_name', 'type_name', 'error_type'],
});

export const graphqlResolverCallsTotal = createCounter({
  registers: [],
  name: 'graphql_resolver_calls_total',
  help: 'Total number of GraphQL resolver calls',
  labelNames: ['resolver_name', 'field_name', 'type_name'],
});
// Web Vitals metrics reported from clients
export const webVitalValue = createGauge({
  registers: [],
  name: 'web_vital_value',
  help: 'Latest reported Web Vitals values',
  labelNames: ['metric', 'id'],
});

// Real-time updates metrics
export const realtimeConflictsTotal = createCounter({
  registers: [],
  name: 'realtime_conflicts_total',
  help: 'Total number of real-time update conflicts (LWW)',
});

export const idempotentHitsTotal = createCounter({
  registers: [],
  name: 'idempotent_hits_total',
  help: 'Total number of idempotent mutation hits',
});

// Auto-remediation execution tracking
export const serviceAutoRemediationsTotal = createCounter({
  registers: [],
  name: 'service_auto_remediations_total',
  help: 'Total number of automated remediation actions executed',
  labelNames: ['service', 'action', 'result'],
});

// Golden Path Metrics
export const goldenPathStepTotal = createCounter({
  registers: [],
  name: 'golden_path_step_total',
  help: 'Completion of steps in the Golden Path user journey',
  labelNames: ['step', 'status', 'tenant_id'],
});

// UI Error Boundary Metrics
export const uiErrorBoundaryCatchTotal = createCounter({
  registers: [],
  name: 'ui_error_boundary_catch_total',
  help: 'Total number of UI errors caught by the React Error Boundary',
  labelNames: ['component', 'tenant_id'],
});

export const breakerState = createGauge({
  registers: [],
  name: 'circuit_breaker_state',
  help: 'State of the circuit breaker (0 = Closed, 1 = Open)',
  labelNames: ['service'],
});

export const intelgraphJobQueueDepth = createGauge({
  registers: [],
  name: 'intelgraph_job_queue_depth',
  help: 'Current depth of the job queue',
  labelNames: ['queue'],
});

// DORA Metrics (Maestro)
export const maestroDeploymentsTotal = createCounter({
  registers: [],
  name: 'maestro_deployments_total',
  help: 'Total number of deployments',
  labelNames: ['environment', 'status'],
});

export const maestroPrLeadTimeHours = createHistogram({
  registers: [],
  name: 'maestro_pr_lead_time_hours',
  help: 'Lead time for changes in hours',
  buckets: [1, 4, 12, 24, 48, 168],
});

export const maestroChangeFailureRate = createGauge({
  registers: [],
  name: 'maestro_change_failure_rate',
  help: 'Change failure rate percentage',
});

export const maestroMttrHours = createHistogram({
  registers: [],
  name: 'maestro_mttr_hours',
  help: 'Mean time to recovery in hours',
  buckets: [0.1, 0.5, 1, 4, 24],
});

// Maestro Orchestration Health Metrics
export const maestroDagExecutionDurationSeconds = createHistogram({
  registers: [],
  name: 'maestro_dag_execution_duration_seconds',
  help: 'Duration of Maestro DAG execution in seconds',
  labelNames: ['dag_id', 'status', 'tenant_id'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

export const maestroJobExecutionDurationSeconds = createHistogram({
  registers: [],
  name: 'maestro_job_execution_duration_seconds',
  help: 'Duration of Maestro Job execution in seconds',
  labelNames: ['job_type', 'status', 'tenant_id'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});

try {
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
} catch (e) { }

// Narrative Simulation Metrics
export const narrativeSimulationActiveSimulations = createGauge({
  name: 'narrative_simulation_active_total',
  help: 'Total number of active narrative simulations',
});

export const narrativeSimulationTicksTotal = createCounter({
  name: 'narrative_simulation_ticks_total',
  help: 'Total number of simulation ticks executed',
  labelNames: ['simulation_id'],
});

export const narrativeSimulationEventsTotal = createCounter({
  name: 'narrative_simulation_events_total',
  help: 'Total number of events processed in simulations',
  labelNames: ['simulation_id', 'event_type'],
});

export const narrativeSimulationDurationSeconds = createHistogram({
  name: 'narrative_simulation_tick_duration_seconds',
  help: 'Duration of a single simulation tick cycle',
  labelNames: ['simulation_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

try {
  register.registerMetric(narrativeSimulationActiveSimulations);
  register.registerMetric(narrativeSimulationTicksTotal);
  register.registerMetric(narrativeSimulationEventsTotal);
  register.registerMetric(narrativeSimulationDurationSeconds);
} catch (e) { }


// Update memory usage periodically (skip in test to avoid open handles)
const shouldCollectMemory =
  process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID;
if (shouldCollectMemory) {
  setInterval(() => {
    try {
      const usage = process.memoryUsage();
      memoryUsage.set({ component: 'heap_used' }, usage.heapUsed);
      memoryUsage.set({ component: 'heap_total' }, usage.heapTotal);
      memoryUsage.set({ component: 'external' }, usage.external);
      memoryUsage.set({ component: 'rss' }, usage.rss);
    } catch (e) { }
  }, 30000);
}

// Legacy IntelGraph metrics (merged from observability/metrics.ts)
export const intelgraphJobsProcessed = createCounter({
  name: 'intelgraph_jobs_processed_total',
  help: 'Total jobs processed by the system',
  labelNames: ['queue', 'status'],
});

export const intelgraphOutboxSyncLatency = createHistogram({
  name: 'intelgraph_outbox_sync_latency_seconds',
  help: 'Latency of outbox to Neo4j sync operations',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});

export const intelgraphActiveConnections = createGauge({
  name: 'intelgraph_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['tenant'],
});

export const intelgraphDatabaseQueryDuration = createHistogram({
  name: 'intelgraph_database_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['database', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const intelgraphHttpRequestDuration = createHistogram({
  name: 'intelgraph_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// GraphRAG Query Preview metrics
export const intelgraphGraphragQueryTotal = createCounter({
  name: 'intelgraph_graphrag_query_total',
  help: 'Total GraphRAG queries executed',
  labelNames: ['status', 'hasPreview', 'redactionEnabled', 'provenanceEnabled'],
});

export const intelgraphGraphragQueryDurationMs = createHistogram({
  name: 'intelgraph_graphrag_query_duration_ms',
  help: 'GraphRAG query execution duration in milliseconds',
  labelNames: ['hasPreview'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000],
});

export const intelgraphQueryPreviewsTotal = createCounter({
  name: 'intelgraph_query_previews_total',
  help: 'Total query previews generated',
  labelNames: ['language', 'status'],
});

export const intelgraphQueryPreviewLatencyMs = createHistogram({
  name: 'intelgraph_query_preview_latency_ms',
  help: 'Query preview generation latency in milliseconds',
  labelNames: ['language'],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000],
});

export const intelgraphQueryPreviewErrorsTotal = createCounter({
  name: 'intelgraph_query_preview_errors_total',
  help: 'Total query preview errors',
  labelNames: ['language'],
});

export const intelgraphQueryPreviewExecutionsTotal = createCounter({
  name: 'intelgraph_query_preview_executions_total',
  help: 'Total query preview executions',
  labelNames: ['language', 'dryRun', 'status'],
});

export const intelgraphGlassBoxRunsTotal = createCounter({
  name: 'intelgraph_glass_box_runs_total',
  help: 'Total glass-box runs created',
  labelNames: ['type', 'status'],
});

export const intelgraphGlassBoxRunDurationMs = createHistogram({
  name: 'intelgraph_glass_box_run_duration_ms',
  help: 'Glass-box run duration in milliseconds',
  labelNames: ['type'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000, 60000],
});

export const intelgraphGlassBoxCacheHits = createCounter({
  name: 'intelgraph_glass_box_cache_hits_total',
  help: 'Total glass-box cache hits',
  labelNames: ['operation'],
});

export const intelgraphCacheHits = createCounter({
  name: 'intelgraph_cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['level'],
});

export const intelgraphCacheMisses = createCounter({
  name: 'intelgraph_cache_misses_total',
  help: 'Total cache misses',
});

// Copilot API metrics
export const copilotApiRequestTotal = createCounter({
  name: 'copilot_api_request_total',
  help: 'Total number of AI Copilot API requests',
  labelNames: ['endpoint', 'mode', 'status'],
});

export const copilotApiRequestDurationMs = createHistogram({
  name: 'copilot_api_request_duration_ms',
  help: 'AI Copilot API request duration in milliseconds',
  labelNames: ['endpoint', 'mode'],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000],
});

// LLM Cost metrics
export const llmCostTotal = createCounter({
  name: 'llm_cost_total_usd',
  help: 'Total estimated cost of LLM calls in USD',
  labelNames: ['provider', 'model'],
});

// GraphQL Cost Analysis & Rate Limiting Metrics
export const graphqlQueryCostHistogram = createHistogram({
  registers: [],
  name: 'graphql_query_cost_total',
  help: 'Distribution of GraphQL query costs',
  labelNames: ['tenant_id', 'operation_name', 'operation_type'],
  buckets: [1, 10, 50, 100, 250, 500, 1000, 2000, 5000, 10000],
});

export const graphqlCostLimitExceededTotal = createCounter({
  registers: [],
  name: 'graphql_cost_limit_exceeded_total',
  help: 'Total number of queries rejected due to cost limits',
  labelNames: ['tenant_id', 'reason', 'tier'],
});

export const graphqlCostLimitRemaining = createGauge({
  registers: [],
  name: 'graphql_cost_limit_remaining',
  help: 'Remaining cost capacity for tenant (per minute)',
  labelNames: ['tenant_id', 'tier'],
});

export const graphqlTenantCostUsage = createCounter({
  registers: [],
  name: 'graphql_tenant_cost_usage_total',
  help: 'Total cost consumed by tenant',
  labelNames: ['tenant_id', 'tier', 'user_id'],
});

export const graphqlCostRateLimitHits = createCounter({
  registers: [],
  name: 'graphql_cost_rate_limit_hits_total',
  help: 'Number of times cost-based rate limit was hit',
  labelNames: ['tenant_id', 'limit_type', 'tier'],
});

export const graphqlPerTenantOverageCount = createCounter({
  registers: [],
  name: 'graphql_per_tenant_overage_count_total',
  help: 'Count of cost limit overages per tenant',
  labelNames: ['tenant_id', 'tier'],
});

// Register metrics
try {
  register.registerMetric(llmCostTotal);
  register.registerMetric(graphqlQueryCostHistogram);
  register.registerMetric(graphqlCostLimitExceededTotal);
  register.registerMetric(graphqlCostLimitRemaining);
  register.registerMetric(graphqlTenantCostUsage);
  register.registerMetric(graphqlCostRateLimitHits);
  register.registerMetric(graphqlPerTenantOverageCount);
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
} catch (e) { }
// Maestro Orchestration Metrics (migrated from telemetry/metrics.ts)
export const maestroOrchestrationRequests = createCounter({
  registers: [],
  name: 'maestro_orchestration_requests_total',
  help: 'Total number of orchestration requests',
  labelNames: ['method', 'endpoint', 'status'],
});

export const maestroOrchestrationDuration = createHistogram({
  registers: [],
  name: 'maestro_orchestration_duration_seconds',
  help: 'Duration of orchestration requests',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
});

export const maestroOrchestrationErrors = createCounter({
  registers: [],
  name: 'maestro_orchestration_errors_total',
  help: 'Total number of orchestration errors',
  labelNames: ['error_type', 'endpoint'],
});

export const maestroActiveConnections = createGauge({
  registers: [],
  name: 'maestro_active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
});

export const maestroActiveSessions = createGauge({
  registers: [],
  name: 'maestro_active_sessions_total',
  help: 'Number of active user sessions',
  labelNames: ['type'],
});

export const maestroAiModelRequests = createCounter({
  registers: [],
  name: 'maestro_ai_model_requests_total',
  help: 'Total AI model requests by model type',
  labelNames: ['model', 'operation', 'status'],
});

export const maestroAiModelDuration = createHistogram({
  registers: [],
  name: 'maestro_ai_model_response_time_seconds',
  help: 'AI model response time',
  labelNames: ['model', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30],
});

export const maestroAiModelErrors = createCounter({
  registers: [],
  name: 'maestro_ai_model_errors_total',
  help: 'Total AI model errors',
  labelNames: ['model'], // Simplified
});

export const maestroAiModelCosts = createHistogram({
  registers: [],
  name: 'maestro_ai_model_cost_usd',
  help: 'Cost per AI model request in USD',
  labelNames: ['model', 'operation'],
  buckets: [0.001, 0.01, 0.1, 1, 5, 10, 50],
});

export const maestroThompsonSamplingRewards = createGauge({
  registers: [],
  name: 'maestro_thompson_sampling_reward_rate',
  help: 'Thompson sampling reward rate by model',
  labelNames: ['model'],
});

export const maestroGraphOperations = createCounter({
  registers: [],
  name: 'maestro_graph_operations_total',
  help: 'Total graph database operations',
  labelNames: ['operation', 'status'],
});

export const maestroGraphQueryDuration = createHistogram({
  registers: [],
  name: 'maestro_graph_query_duration_seconds',
  help: 'Graph query execution time',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

export const maestroGraphConnections = createGauge({
  registers: [],
  name: 'maestro_graph_connections_active',
  help: 'Active Neo4j connections',
});

export const maestroGraphEntities = createGauge({
  registers: [],
  name: 'maestro_graph_entities_total',
  help: 'Total entities in graph database',
  labelNames: ['entity_type'],
});

export const maestroGraphRelations = createGauge({
  registers: [],
  name: 'maestro_graph_relations_total',
  help: 'Total relations in graph database',
});

export const maestroPremiumRoutingDecisions = createCounter({
  registers: [],
  name: 'maestro_premium_routing_decisions_total',
  help: 'Premium routing decisions',
  labelNames: ['decision', 'model_tier'],
});

export const maestroPremiumBudgetUtilization = createGauge({
  registers: [],
  name: 'maestro_premium_budget_utilization_percent',
  help: 'Premium model budget utilization percentage',
});

export const maestroPremiumCostSavings = createCounter({
  registers: [],
  name: 'maestro_premium_cost_savings_usd',
  help: 'Cost savings from premium routing',
  labelNames: ['model_tier'],
});

export const maestroSecurityEvents = createCounter({
  registers: [],
  name: 'maestro_security_events_total',
  help: 'Security events by type',
  labelNames: ['event_type', 'severity', 'user_id'],
});

export const maestroComplianceGateDecisions = createCounter({
  registers: [],
  name: 'maestro_compliance_gate_decisions_total',
  help: 'Compliance gate decisions',
  labelNames: ['decision', 'policy', 'reason'],
});

export const maestroAuthenticationAttempts = createCounter({
  registers: [],
  name: 'maestro_authentication_attempts_total',
  help: 'Authentication attempts',
  labelNames: ['auth_method', 'status', 'user_id'],
});

export const maestroAuthorizationDecisions = createCounter({
  registers: [],
  name: 'maestro_authorization_decisions_total',
  help: 'Authorization decisions',
});

export const maestroInvestigationsCreated = createCounter({
  registers: [],
  name: 'maestro_investigations_created_total',
  help: 'Total investigations created',
  labelNames: ['investigation_type', 'user_id'],
});

export const maestroDataSourcesActive = createGauge({
  registers: [],
  name: 'maestro_data_sources_active_total',
  help: 'Number of active data sources',
  labelNames: ['source_type'],
});

export const maestroWebScrapingRequests = createCounter({
  registers: [],
  name: 'maestro_web_scraping_requests_total',
  help: 'Web scraping requests',
  labelNames: ['status', 'domain'],
});

export const maestroSynthesisOperations = createCounter({
  registers: [],
  name: 'maestro_synthesis_operations_total',
  help: 'Data synthesis operations',
});

// Register new metrics
try {
  register.registerMetric(maestroOrchestrationRequests);
  register.registerMetric(maestroOrchestrationDuration);
  register.registerMetric(maestroOrchestrationErrors);
  register.registerMetric(maestroActiveConnections);
  register.registerMetric(maestroActiveSessions);
  register.registerMetric(maestroAiModelRequests);
  register.registerMetric(maestroAiModelDuration);
  register.registerMetric(maestroAiModelErrors);
  register.registerMetric(maestroAiModelCosts);
  register.registerMetric(maestroThompsonSamplingRewards);
  register.registerMetric(maestroGraphOperations);
  register.registerMetric(maestroGraphQueryDuration);
  register.registerMetric(maestroGraphConnections);
  register.registerMetric(maestroGraphEntities);
  register.registerMetric(maestroGraphRelations);
  register.registerMetric(maestroPremiumRoutingDecisions);
  register.registerMetric(maestroPremiumBudgetUtilization);
  register.registerMetric(maestroPremiumCostSavings);
  register.registerMetric(maestroSecurityEvents);
  register.registerMetric(maestroComplianceGateDecisions);
  register.registerMetric(maestroAuthenticationAttempts);
  register.registerMetric(maestroAuthorizationDecisions);
  register.registerMetric(maestroInvestigationsCreated);
  register.registerMetric(maestroDataSourcesActive);
  register.registerMetric(maestroWebScrapingRequests);
  register.registerMetric(maestroSynthesisOperations);
} catch (e) { }

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
  graphqlQueryCostHistogram,
  graphqlCostLimitExceededTotal,
  graphqlCostLimitRemaining,
  graphqlTenantCostUsage,
  graphqlCostRateLimitHits,
  graphqlPerTenantOverageCount,
  maestroAiModelRequests,
  maestroAiModelErrors,
  maestroOrchestrationDuration,
  maestroOrchestrationRequests,
  maestroActiveSessions,
  maestroOrchestrationErrors,
  narrativeSimulationActiveSimulations,
  narrativeSimulationTicksTotal,
  narrativeSimulationEventsTotal,
  narrativeSimulationDurationSeconds,
};

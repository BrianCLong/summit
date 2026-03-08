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
exports.graphExpandRequestsTotal = exports.doclingCostUsd = exports.doclingCharactersProcessed = exports.doclingInferenceTotal = exports.doclingInferenceDuration = exports.admissionDecisionsTotal = exports.pbacDecisionsTotal = exports.graphragCacheHitRatio = exports.graphragSchemaFailuresTotal = exports.pipelineLatencySeconds = exports.pipelineCorrectnessRatio = exports.pipelineCompletenessRatio = exports.pipelineFreshnessSeconds = exports.pipelineUptimeRatio = exports.memoryUsage = exports.applicationErrors = exports.approvalsRejectedTotal = exports.approvalsApprovedTotal = exports.approvalsPending = exports.deploymentRollbacksTotal = exports.erMergeOutcomesTotal = exports.investigationOperations = exports.investigationsActive = exports.websocketMessages = exports.websocketConnections = exports.graphOperationDuration = exports.graphEdgesTotal = exports.graphNodesTotal = exports.llmRequestsTotal = exports.llmTokensTotal = exports.llmRequestDuration = exports.aiJobsTotal = exports.aiJobDuration = exports.aiJobsProcessing = exports.aiJobsQueued = exports.vectorQueriesTotal = exports.vectorQueryDurationSeconds = exports.dbQueriesTotal = exports.dbQueryDuration = exports.dbConnectionsActive = exports.tenantScopeViolationsTotal = exports.graphqlErrors = exports.graphqlRequestsTotal = exports.graphqlRequestDuration = exports.businessRevenueTotal = exports.businessApiCallsTotal = exports.businessUserSignupsTotal = exports.httpRequestsTotal = exports.httpRequestDuration = exports.register = void 0;
exports.graphqlCostRateLimitHits = exports.graphqlTenantCostUsage = exports.graphqlCostLimitRemaining = exports.graphqlCostLimitExceededTotal = exports.graphqlQueryCostHistogram = exports.llmCostTotal = exports.copilotApiRequestDurationMs = exports.copilotApiRequestTotal = exports.intelgraphCacheMisses = exports.intelgraphCacheHits = exports.intelgraphGlassBoxCacheHits = exports.intelgraphGlassBoxRunDurationMs = exports.intelgraphGlassBoxRunsTotal = exports.intelgraphQueryPreviewExecutionsTotal = exports.intelgraphQueryPreviewErrorsTotal = exports.intelgraphQueryPreviewLatencyMs = exports.intelgraphQueryPreviewsTotal = exports.intelgraphGraphragQueryDurationMs = exports.intelgraphGraphragQueryTotal = exports.intelgraphHttpRequestDuration = exports.intelgraphDatabaseQueryDuration = exports.intelgraphActiveConnections = exports.intelgraphOutboxSyncLatency = exports.intelgraphJobsProcessed = exports.narrativeSimulationDurationSeconds = exports.narrativeSimulationEventsTotal = exports.narrativeSimulationTicksTotal = exports.narrativeSimulationActiveSimulations = exports.maestroJobExecutionDurationSeconds = exports.maestroDagExecutionDurationSeconds = exports.maestroMttrHours = exports.maestroChangeFailureRate = exports.maestroPrLeadTimeHours = exports.maestroDeploymentsTotal = exports.intelgraphJobQueueDepth = exports.breakerState = exports.uiErrorBoundaryCatchTotal = exports.goldenPathStepTotal = exports.serviceAutoRemediationsTotal = exports.idempotentHitsTotal = exports.realtimeConflictsTotal = exports.webVitalDurationSeconds = exports.webVitalValue = exports.graphqlResolverCallsTotal = exports.graphqlResolverErrorsTotal = exports.graphqlResolverDurationSeconds = exports.neighborhoodCacheLatencyMs = exports.neighborhoodCacheHitRatio = exports.resolverLatencyMs = exports.aiRequestTotal = void 0;
exports.metrics = exports.maestroSynthesisOperations = exports.maestroWebScrapingRequests = exports.maestroDataSourcesActive = exports.maestroInvestigationsCreated = exports.maestroAuthorizationDecisions = exports.maestroAuthenticationAttempts = exports.maestroComplianceGateDecisions = exports.maestroSecurityEvents = exports.maestroPremiumCostSavings = exports.maestroPremiumBudgetUtilization = exports.maestroPremiumRoutingDecisions = exports.maestroGraphRelations = exports.maestroGraphEntities = exports.maestroGraphConnections = exports.maestroGraphQueryDuration = exports.maestroGraphOperations = exports.maestroThompsonSamplingRewards = exports.maestroAiModelCosts = exports.maestroAiModelErrors = exports.maestroAiModelDuration = exports.maestroAiModelRequests = exports.maestroActiveSessions = exports.maestroActiveConnections = exports.maestroOrchestrationErrors = exports.maestroOrchestrationDuration = exports.maestroOrchestrationRequests = exports.graphqlPerTenantOverageCount = void 0;
exports.stopMetricsCollection = stopMetricsCollection;
/**
 * Prometheus metrics collection for IntelGraph Platform
 */
const promClient = __importStar(require("prom-client"));
const client = promClient.default || promClient;
// Create a Registry which registers the metrics
exports.register = new client.Registry();
// Store the default metrics collection handle for cleanup
let defaultMetricsInterval;
// Add default metrics (CPU, memory, event loop lag, etc.)
// Only collect in production/non-test environments to avoid open handles in tests
if (process.env.NODE_ENV !== 'test' && process.env.ZERO_FOOTPRINT !== 'true') {
    try {
        defaultMetricsInterval = client.collectDefaultMetrics({
            register: exports.register,
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection buckets
        });
    }
    catch (e) { }
}
// Cleanup function to stop metrics collection
function stopMetricsCollection() {
    if (defaultMetricsInterval && typeof defaultMetricsInterval.clear === 'function') {
        defaultMetricsInterval.clear();
    }
    exports.register.clear();
}
// Custom Application Metrics
function createHistogram(config) {
    try {
        return new client.Histogram(config);
    }
    catch (e) {
        return {
            observe: () => { },
            startTimer: () => () => { },
            inc: () => { },
            dec: () => { },
            set: () => { },
            labels: () => ({ observe: () => { }, inc: () => { }, dec: () => { }, set: () => { } })
        };
    }
}
function createCounter(config) {
    try {
        return new client.Counter(config);
    }
    catch (e) {
        return {
            inc: () => { },
            labels: () => ({ inc: () => { } })
        };
    }
}
function createGauge(config) {
    try {
        return new client.Gauge(config);
    }
    catch (e) {
        return {
            inc: () => { },
            dec: () => { },
            set: () => { },
            labels: () => ({ inc: () => { }, dec: () => { }, set: () => { } })
        };
    }
}
// HTTP Request metrics
exports.httpRequestDuration = createHistogram({
    registers: [],
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});
exports.httpRequestsTotal = createCounter({
    registers: [],
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});
// Business KPIs exposed as first-class metrics for the control plane
exports.businessUserSignupsTotal = createCounter({
    registers: [],
    name: 'business_user_signups_total',
    help: 'Total number of customer or workspace signups',
    labelNames: ['tenant', 'plan'],
});
exports.businessApiCallsTotal = createCounter({
    registers: [],
    name: 'business_api_calls_total',
    help: 'API calls attributed to customer activity and billing',
    labelNames: ['service', 'route', 'status_code', 'tenant'],
});
exports.businessRevenueTotal = createCounter({
    registers: [],
    name: 'business_revenue_total',
    help: "Recognized revenue amounts in the system's reporting currency",
    labelNames: ['tenant', 'currency'],
});
// GraphQL metrics
exports.graphqlRequestDuration = createHistogram({
    registers: [],
    name: 'graphql_request_duration_seconds',
    help: 'Duration of GraphQL requests in seconds',
    labelNames: ['operation', 'operation_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});
exports.graphqlRequestsTotal = createCounter({
    registers: [],
    name: 'graphql_requests_total',
    help: 'Total number of GraphQL requests',
    labelNames: ['operation', 'operation_type', 'status'],
});
exports.graphqlErrors = createCounter({
    registers: [],
    name: 'graphql_errors_total',
    help: 'Total number of GraphQL errors',
    labelNames: ['operation', 'error_type'],
});
// Tenant isolation violations
exports.tenantScopeViolationsTotal = createCounter({
    registers: [],
    name: 'tenant_scope_violations_total',
    help: 'Total number of tenant scope violations',
});
// Database metrics
exports.dbConnectionsActive = createGauge({
    registers: [],
    name: 'db_connections_active',
    help: 'Number of active database connections',
    labelNames: ['database'],
});
exports.dbQueryDuration = createHistogram({
    registers: [],
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['database', 'operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
exports.dbQueriesTotal = createCounter({
    registers: [],
    name: 'db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['database', 'operation', 'status'],
});
exports.vectorQueryDurationSeconds = createHistogram({
    registers: [],
    name: 'vector_query_duration_seconds',
    help: 'Latency of pgvector operations in seconds',
    labelNames: ['operation', 'tenant_id'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
exports.vectorQueriesTotal = createCounter({
    registers: [],
    name: 'vector_queries_total',
    help: 'Total pgvector operations by outcome',
    labelNames: ['operation', 'tenant_id', 'status'],
});
// AI/ML Processing metrics
exports.aiJobsQueued = createGauge({
    registers: [],
    name: 'ai_jobs_queued',
    help: 'Number of AI/ML jobs in queue',
    labelNames: ['job_type'],
});
exports.aiJobsProcessing = createGauge({
    registers: [],
    name: 'ai_jobs_processing',
    help: 'Number of AI/ML jobs currently processing',
    labelNames: ['job_type'],
});
exports.aiJobDuration = createHistogram({
    registers: [],
    name: 'ai_job_duration_seconds',
    help: 'Duration of AI/ML job processing in seconds',
    labelNames: ['job_type', 'status'],
    buckets: [1, 5, 10, 30, 60, 300, 600],
});
exports.aiJobsTotal = createCounter({
    registers: [],
    name: 'ai_jobs_total',
    help: 'Total number of AI/ML jobs processed',
    labelNames: ['job_type', 'status'],
});
// LLM Metrics
exports.llmRequestDuration = createHistogram({
    registers: [],
    name: 'llm_request_duration_seconds',
    help: 'Duration of LLM requests in seconds',
    labelNames: ['provider', 'model', 'status'],
    buckets: [0.5, 1, 2, 5, 10, 20, 60],
});
exports.llmTokensTotal = createCounter({
    registers: [],
    name: 'llm_tokens_total',
    help: 'Total number of tokens processed',
    labelNames: ['provider', 'model', 'type'], // type: prompt, completion
});
exports.llmRequestsTotal = createCounter({
    registers: [],
    name: 'llm_requests_total',
    help: 'Total number of LLM requests',
    labelNames: ['provider', 'model', 'status'],
});
// Graph operations metrics
exports.graphNodesTotal = createGauge({
    registers: [],
    name: 'graph_nodes_total',
    help: 'Total number of nodes in the graph',
    labelNames: ['investigation_id'],
});
exports.graphEdgesTotal = createGauge({
    registers: [],
    name: 'graph_edges_total',
    help: 'Total number of edges in the graph',
    labelNames: ['investigation_id'],
});
exports.graphOperationDuration = createHistogram({
    registers: [],
    name: 'graph_operation_duration_seconds',
    help: 'Duration of graph operations in seconds',
    labelNames: ['operation', 'investigation_id'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});
// WebSocket metrics
exports.websocketConnections = createGauge({
    registers: [],
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
});
exports.websocketMessages = createCounter({
    registers: [],
    name: 'websocket_messages_total',
    help: 'Total number of WebSocket messages',
    labelNames: ['direction', 'event_type'],
});
// Investigation metrics
exports.investigationsActive = createGauge({
    registers: [],
    name: 'investigations_active',
    help: 'Number of active investigations',
});
exports.investigationOperations = createCounter({
    registers: [],
    name: 'investigation_operations_total',
    help: 'Total number of investigation operations',
    labelNames: ['operation', 'user_id'],
});
// Entity resolution merge outcomes
exports.erMergeOutcomesTotal = createCounter({
    registers: [],
    name: 'er_merge_outcomes_total',
    help: 'Total number of ER merge outcomes recorded',
    labelNames: ['decision', 'entity_type', 'method'],
});
// Deployment rollbacks
exports.deploymentRollbacksTotal = createCounter({
    registers: [],
    name: 'deployment_rollbacks_total',
    help: 'Total number of deployment rollbacks',
    labelNames: ['service', 'reason', 'success'],
});
// Human-in-the-loop approvals
exports.approvalsPending = createGauge({
    registers: [],
    name: 'approvals_pending',
    help: 'Current pending approvals requiring human review',
});
exports.approvalsApprovedTotal = createCounter({
    registers: [],
    name: 'approvals_approved_total',
    help: 'Total approvals granted by human reviewers',
    labelNames: ['reviewer_role'],
});
exports.approvalsRejectedTotal = createCounter({
    registers: [],
    name: 'approvals_rejected_total',
    help: 'Total approvals rejected by human reviewers',
    labelNames: ['reviewer_role'],
});
// Error tracking
exports.applicationErrors = createCounter({
    registers: [],
    name: 'application_errors_total',
    help: 'Total number of application errors',
    labelNames: ['module', 'error_type', 'severity'],
});
// Memory usage for specific components
exports.memoryUsage = createGauge({
    registers: [],
    name: 'application_memory_usage_bytes',
    help: 'Memory usage by application component',
    labelNames: ['component'],
});
// Pipeline SLI metrics (labels: source, pipeline, env)
exports.pipelineUptimeRatio = createGauge({
    registers: [],
    name: 'pipeline_uptime_ratio',
    help: 'Pipeline availability ratio (0..1) over current window',
    labelNames: ['source', 'pipeline', 'env'],
});
exports.pipelineFreshnessSeconds = createGauge({
    registers: [],
    name: 'pipeline_freshness_seconds',
    help: 'Freshness (seconds) from source event to load completion',
    labelNames: ['source', 'pipeline', 'env'],
});
exports.pipelineCompletenessRatio = createGauge({
    registers: [],
    name: 'pipeline_completeness_ratio',
    help: 'Data completeness ratio (0..1) expected vs actual',
    labelNames: ['source', 'pipeline', 'env'],
});
exports.pipelineCorrectnessRatio = createGauge({
    registers: [],
    name: 'pipeline_correctness_ratio',
    help: 'Validation pass rate ratio (0..1)',
    labelNames: ['source', 'pipeline', 'env'],
});
exports.pipelineLatencySeconds = createHistogram({
    registers: [],
    name: 'pipeline_latency_seconds',
    help: 'End-to-end processing latency seconds',
    labelNames: ['source', 'pipeline', 'env'],
    buckets: [5, 15, 30, 60, 120, 300, 600, 1200],
});
// Register all metrics
try {
    exports.register.registerMetric(exports.httpRequestDuration);
    exports.register.registerMetric(exports.httpRequestsTotal);
    exports.register.registerMetric(exports.graphqlRequestDuration);
    exports.register.registerMetric(exports.graphqlRequestsTotal);
    exports.register.registerMetric(exports.graphqlErrors);
    exports.register.registerMetric(exports.tenantScopeViolationsTotal);
    exports.register.registerMetric(exports.dbConnectionsActive);
    exports.register.registerMetric(exports.dbQueryDuration);
    exports.register.registerMetric(exports.dbQueriesTotal);
    exports.register.registerMetric(exports.vectorQueryDurationSeconds);
    exports.register.registerMetric(exports.vectorQueriesTotal);
    exports.register.registerMetric(exports.aiJobsQueued);
    exports.register.registerMetric(exports.aiJobsProcessing);
    exports.register.registerMetric(exports.aiJobDuration);
    exports.register.registerMetric(exports.aiJobsTotal);
    exports.register.registerMetric(exports.llmRequestDuration);
    exports.register.registerMetric(exports.llmTokensTotal);
    exports.register.registerMetric(exports.llmRequestsTotal);
    exports.register.registerMetric(exports.graphNodesTotal);
    exports.register.registerMetric(exports.graphEdgesTotal);
    exports.register.registerMetric(exports.graphOperationDuration);
    exports.register.registerMetric(exports.websocketConnections);
    exports.register.registerMetric(exports.websocketMessages);
    exports.register.registerMetric(exports.investigationsActive);
    exports.register.registerMetric(exports.investigationOperations);
    exports.register.registerMetric(exports.erMergeOutcomesTotal);
    exports.register.registerMetric(exports.deploymentRollbacksTotal);
    exports.register.registerMetric(exports.approvalsPending);
    exports.register.registerMetric(exports.approvalsApprovedTotal);
    exports.register.registerMetric(exports.approvalsRejectedTotal);
    exports.register.registerMetric(exports.applicationErrors);
    exports.register.registerMetric(exports.memoryUsage);
    exports.register.registerMetric(exports.pipelineUptimeRatio);
    exports.register.registerMetric(exports.pipelineFreshnessSeconds);
    exports.register.registerMetric(exports.pipelineCompletenessRatio);
    exports.register.registerMetric(exports.pipelineCorrectnessRatio);
    exports.register.registerMetric(exports.pipelineLatencySeconds);
}
catch (e) { }
// GraphRAG metrics for schema validation and caching
exports.graphragSchemaFailuresTotal = createCounter({
    registers: [],
    name: 'graphrag_schema_failures_total',
    help: 'Total number of GraphRAG schema validation failures',
});
exports.graphragCacheHitRatio = createGauge({
    registers: [],
    name: 'graphrag_cache_hit_ratio',
    help: 'Ratio of GraphRAG cache hits to total requests',
});
try {
    exports.register.registerMetric(exports.graphragSchemaFailuresTotal);
    exports.register.registerMetric(exports.graphragCacheHitRatio);
}
catch (e) { }
exports.pbacDecisionsTotal = createCounter({
    registers: [],
    name: 'pbac_decisions_total',
    help: 'Total PBAC access decisions',
    labelNames: ['decision'],
});
try {
    exports.register.registerMetric(exports.pbacDecisionsTotal);
}
catch (e) { }
exports.admissionDecisionsTotal = createCounter({
    registers: [],
    name: 'admission_decisions_total',
    help: 'Total admission control decisions',
    labelNames: ['decision', 'policy'],
});
try {
    exports.register.registerMetric(exports.admissionDecisionsTotal);
}
catch (e) { }
// Docling service metrics
exports.doclingInferenceDuration = createHistogram({
    registers: [],
    name: 'docling_inference_duration_seconds',
    help: 'Docling document inference duration in seconds',
    labelNames: ['model', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});
try {
    exports.register.registerMetric(exports.doclingInferenceDuration);
}
catch (e) { }
exports.doclingInferenceTotal = createCounter({
    registers: [],
    name: 'docling_inference_total',
    help: 'Total Docling inference requests',
    labelNames: ['model', 'status'],
});
try {
    exports.register.registerMetric(exports.doclingInferenceTotal);
}
catch (e) { }
exports.doclingCharactersProcessed = createCounter({
    registers: [],
    name: 'docling_characters_processed_total',
    help: 'Total characters processed by Docling',
    labelNames: ['model'],
});
try {
    exports.register.registerMetric(exports.doclingCharactersProcessed);
}
catch (e) { }
exports.doclingCostUsd = createCounter({
    registers: [],
    name: 'docling_cost_usd_total',
    help: 'Total cost in USD for Docling processing',
    labelNames: ['model'],
});
try {
    exports.register.registerMetric(exports.doclingCostUsd);
}
catch (e) { }
// New domain metrics
exports.graphExpandRequestsTotal = createCounter({
    registers: [],
    name: 'graph_expand_requests_total',
    help: 'Total expandNeighbors requests',
    labelNames: ['cached'],
});
exports.aiRequestTotal = createCounter({
    registers: [],
    name: 'ai_request_total',
    help: 'AI request events',
    labelNames: ['status'],
});
exports.resolverLatencyMs = createHistogram({
    registers: [],
    name: 'resolver_latency_ms',
    help: 'Resolver latency in ms',
    labelNames: ['operation'],
    buckets: [5, 10, 25, 50, 100, 200, 400, 800, 1600],
});
exports.neighborhoodCacheHitRatio = createGauge({
    registers: [],
    name: 'neighborhood_cache_hit_ratio',
    help: 'Neighborhood cache hit ratio',
});
exports.neighborhoodCacheLatencyMs = createHistogram({
    registers: [],
    name: 'neighborhood_cache_latency_ms',
    help: 'Neighborhood cache lookup latency in ms',
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});
// Enhanced GraphQL resolver metrics
exports.graphqlResolverDurationSeconds = createHistogram({
    registers: [],
    name: 'graphql_resolver_duration_seconds',
    help: 'Duration of GraphQL resolver execution in seconds',
    labelNames: ['resolver_name', 'field_name', 'type_name', 'status'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
exports.graphqlResolverErrorsTotal = createCounter({
    registers: [],
    name: 'graphql_resolver_errors_total',
    help: 'Total number of GraphQL resolver errors',
    labelNames: ['resolver_name', 'field_name', 'type_name', 'error_type'],
});
exports.graphqlResolverCallsTotal = createCounter({
    registers: [],
    name: 'graphql_resolver_calls_total',
    help: 'Total number of GraphQL resolver calls',
    labelNames: ['resolver_name', 'field_name', 'type_name'],
});
// Web Vitals metrics reported from clients
exports.webVitalValue = createGauge({
    registers: [],
    name: 'web_vital_value',
    help: 'Latest reported Web Vitals values',
    labelNames: ['metric', 'id'],
});
exports.webVitalDurationSeconds = createHistogram({
    registers: [],
    name: 'web_vital_duration_seconds',
    help: 'Distribution of Web Vitals values in seconds',
    labelNames: ['metric'],
    buckets: [0.1, 0.5, 1, 2.5, 4, 10],
});
// Real-time updates metrics
exports.realtimeConflictsTotal = createCounter({
    registers: [],
    name: 'realtime_conflicts_total',
    help: 'Total number of real-time update conflicts (LWW)',
});
exports.idempotentHitsTotal = createCounter({
    registers: [],
    name: 'idempotent_hits_total',
    help: 'Total number of idempotent mutation hits',
});
// Auto-remediation execution tracking
exports.serviceAutoRemediationsTotal = createCounter({
    registers: [],
    name: 'service_auto_remediations_total',
    help: 'Total number of automated remediation actions executed',
    labelNames: ['service', 'action', 'result'],
});
// Golden Path Metrics
exports.goldenPathStepTotal = createCounter({
    registers: [],
    name: 'golden_path_step_total',
    help: 'Completion of steps in the Golden Path user journey',
    labelNames: ['step', 'status', 'tenant_id'],
});
// UI Error Boundary Metrics
exports.uiErrorBoundaryCatchTotal = createCounter({
    registers: [],
    name: 'ui_error_boundary_catch_total',
    help: 'Total number of UI errors caught by the React Error Boundary',
    labelNames: ['component', 'tenant_id'],
});
exports.breakerState = createGauge({
    registers: [],
    name: 'circuit_breaker_state',
    help: 'State of the circuit breaker (0 = Closed, 1 = Open)',
    labelNames: ['service'],
});
exports.intelgraphJobQueueDepth = createGauge({
    registers: [],
    name: 'intelgraph_job_queue_depth',
    help: 'Current depth of the job queue',
    labelNames: ['queue'],
});
// DORA Metrics (Maestro)
exports.maestroDeploymentsTotal = createCounter({
    registers: [],
    name: 'maestro_deployments_total',
    help: 'Total number of deployments',
    labelNames: ['environment', 'status'],
});
exports.maestroPrLeadTimeHours = createHistogram({
    registers: [],
    name: 'maestro_pr_lead_time_hours',
    help: 'Lead time for changes in hours',
    buckets: [1, 4, 12, 24, 48, 168],
});
exports.maestroChangeFailureRate = createGauge({
    registers: [],
    name: 'maestro_change_failure_rate',
    help: 'Change failure rate percentage',
});
exports.maestroMttrHours = createHistogram({
    registers: [],
    name: 'maestro_mttr_hours',
    help: 'Mean time to recovery in hours',
    buckets: [0.1, 0.5, 1, 4, 24],
});
// Maestro Orchestration Health Metrics
exports.maestroDagExecutionDurationSeconds = createHistogram({
    registers: [],
    name: 'maestro_dag_execution_duration_seconds',
    help: 'Duration of Maestro DAG execution in seconds',
    labelNames: ['dag_id', 'status', 'tenant_id'],
    buckets: [1, 5, 10, 30, 60, 300, 600],
});
exports.maestroJobExecutionDurationSeconds = createHistogram({
    registers: [],
    name: 'maestro_job_execution_duration_seconds',
    help: 'Duration of Maestro Job execution in seconds',
    labelNames: ['job_type', 'status', 'tenant_id'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});
try {
    exports.register.registerMetric(exports.maestroDagExecutionDurationSeconds);
    exports.register.registerMetric(exports.maestroJobExecutionDurationSeconds);
    exports.register.registerMetric(exports.graphExpandRequestsTotal);
    exports.register.registerMetric(exports.aiRequestTotal);
    exports.register.registerMetric(exports.resolverLatencyMs);
    exports.register.registerMetric(exports.neighborhoodCacheHitRatio);
    exports.register.registerMetric(exports.neighborhoodCacheLatencyMs);
    exports.register.registerMetric(exports.graphqlResolverDurationSeconds);
    exports.register.registerMetric(exports.graphqlResolverErrorsTotal);
    exports.register.registerMetric(exports.graphqlResolverCallsTotal);
    exports.register.registerMetric(exports.webVitalValue);
    exports.register.registerMetric(exports.webVitalDurationSeconds);
    exports.register.registerMetric(exports.realtimeConflictsTotal);
    exports.register.registerMetric(exports.idempotentHitsTotal);
    exports.register.registerMetric(exports.businessUserSignupsTotal);
    exports.register.registerMetric(exports.businessApiCallsTotal);
    exports.register.registerMetric(exports.businessRevenueTotal);
    exports.register.registerMetric(exports.serviceAutoRemediationsTotal);
    exports.register.registerMetric(exports.goldenPathStepTotal);
    exports.register.registerMetric(exports.uiErrorBoundaryCatchTotal);
    exports.register.registerMetric(exports.maestroDeploymentsTotal);
    exports.register.registerMetric(exports.maestroPrLeadTimeHours);
    exports.register.registerMetric(exports.maestroChangeFailureRate);
    exports.register.registerMetric(exports.maestroMttrHours);
    exports.register.registerMetric(exports.breakerState);
    exports.register.registerMetric(exports.intelgraphJobQueueDepth);
}
catch (e) { }
// Narrative Simulation Metrics
exports.narrativeSimulationActiveSimulations = createGauge({
    name: 'narrative_simulation_active_total',
    help: 'Total number of active narrative simulations',
});
exports.narrativeSimulationTicksTotal = createCounter({
    name: 'narrative_simulation_ticks_total',
    help: 'Total number of simulation ticks executed',
    labelNames: ['simulation_id'],
});
exports.narrativeSimulationEventsTotal = createCounter({
    name: 'narrative_simulation_events_total',
    help: 'Total number of events processed in simulations',
    labelNames: ['simulation_id', 'event_type'],
});
exports.narrativeSimulationDurationSeconds = createHistogram({
    name: 'narrative_simulation_tick_duration_seconds',
    help: 'Duration of a single simulation tick cycle',
    labelNames: ['simulation_id'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
});
try {
    exports.register.registerMetric(exports.narrativeSimulationActiveSimulations);
    exports.register.registerMetric(exports.narrativeSimulationTicksTotal);
    exports.register.registerMetric(exports.narrativeSimulationEventsTotal);
    exports.register.registerMetric(exports.narrativeSimulationDurationSeconds);
}
catch (e) { }
// Update memory usage periodically (skip in test to avoid open handles)
const shouldCollectMemory = process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID;
if (shouldCollectMemory) {
    setInterval(() => {
        try {
            const usage = process.memoryUsage();
            exports.memoryUsage.set({ component: 'heap_used' }, usage.heapUsed);
            exports.memoryUsage.set({ component: 'heap_total' }, usage.heapTotal);
            exports.memoryUsage.set({ component: 'external' }, usage.external);
            exports.memoryUsage.set({ component: 'rss' }, usage.rss);
        }
        catch (e) { }
    }, 30000);
}
// Legacy IntelGraph metrics (merged from observability/metrics.ts)
exports.intelgraphJobsProcessed = createCounter({
    name: 'intelgraph_jobs_processed_total',
    help: 'Total jobs processed by the system',
    labelNames: ['queue', 'status'],
});
exports.intelgraphOutboxSyncLatency = createHistogram({
    name: 'intelgraph_outbox_sync_latency_seconds',
    help: 'Latency of outbox to Neo4j sync operations',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});
exports.intelgraphActiveConnections = createGauge({
    name: 'intelgraph_active_connections',
    help: 'Number of active WebSocket connections',
    labelNames: ['tenant'],
});
exports.intelgraphDatabaseQueryDuration = createHistogram({
    name: 'intelgraph_database_query_duration_seconds',
    help: 'Database query execution time',
    labelNames: ['database', 'operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});
exports.intelgraphHttpRequestDuration = createHistogram({
    name: 'intelgraph_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
// GraphRAG Query Preview metrics
exports.intelgraphGraphragQueryTotal = createCounter({
    name: 'intelgraph_graphrag_query_total',
    help: 'Total GraphRAG queries executed',
    labelNames: ['status', 'hasPreview', 'redactionEnabled', 'provenanceEnabled'],
});
exports.intelgraphGraphragQueryDurationMs = createHistogram({
    name: 'intelgraph_graphrag_query_duration_ms',
    help: 'GraphRAG query execution duration in milliseconds',
    labelNames: ['hasPreview'],
    buckets: [100, 500, 1000, 2000, 5000, 10000, 30000],
});
exports.intelgraphQueryPreviewsTotal = createCounter({
    name: 'intelgraph_query_previews_total',
    help: 'Total query previews generated',
    labelNames: ['language', 'status'],
});
exports.intelgraphQueryPreviewLatencyMs = createHistogram({
    name: 'intelgraph_query_preview_latency_ms',
    help: 'Query preview generation latency in milliseconds',
    labelNames: ['language'],
    buckets: [50, 100, 250, 500, 1000, 2000, 5000],
});
exports.intelgraphQueryPreviewErrorsTotal = createCounter({
    name: 'intelgraph_query_preview_errors_total',
    help: 'Total query preview errors',
    labelNames: ['language'],
});
exports.intelgraphQueryPreviewExecutionsTotal = createCounter({
    name: 'intelgraph_query_preview_executions_total',
    help: 'Total query preview executions',
    labelNames: ['language', 'dryRun', 'status'],
});
exports.intelgraphGlassBoxRunsTotal = createCounter({
    name: 'intelgraph_glass_box_runs_total',
    help: 'Total glass-box runs created',
    labelNames: ['type', 'status'],
});
exports.intelgraphGlassBoxRunDurationMs = createHistogram({
    name: 'intelgraph_glass_box_run_duration_ms',
    help: 'Glass-box run duration in milliseconds',
    labelNames: ['type'],
    buckets: [100, 500, 1000, 2000, 5000, 10000, 30000, 60000],
});
exports.intelgraphGlassBoxCacheHits = createCounter({
    name: 'intelgraph_glass_box_cache_hits_total',
    help: 'Total glass-box cache hits',
    labelNames: ['operation'],
});
exports.intelgraphCacheHits = createCounter({
    name: 'intelgraph_cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['level'],
});
exports.intelgraphCacheMisses = createCounter({
    name: 'intelgraph_cache_misses_total',
    help: 'Total cache misses',
});
// Copilot API metrics
exports.copilotApiRequestTotal = createCounter({
    name: 'copilot_api_request_total',
    help: 'Total number of AI Copilot API requests',
    labelNames: ['endpoint', 'mode', 'status'],
});
exports.copilotApiRequestDurationMs = createHistogram({
    name: 'copilot_api_request_duration_ms',
    help: 'AI Copilot API request duration in milliseconds',
    labelNames: ['endpoint', 'mode'],
    buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000],
});
// LLM Cost metrics
exports.llmCostTotal = createCounter({
    name: 'llm_cost_total_usd',
    help: 'Total estimated cost of LLM calls in USD',
    labelNames: ['provider', 'model'],
});
// GraphQL Cost Analysis & Rate Limiting Metrics
exports.graphqlQueryCostHistogram = createHistogram({
    registers: [],
    name: 'graphql_query_cost_total',
    help: 'Distribution of GraphQL query costs',
    labelNames: ['tenant_id', 'operation_name', 'operation_type'],
    buckets: [1, 10, 50, 100, 250, 500, 1000, 2000, 5000, 10000],
});
exports.graphqlCostLimitExceededTotal = createCounter({
    registers: [],
    name: 'graphql_cost_limit_exceeded_total',
    help: 'Total number of queries rejected due to cost limits',
    labelNames: ['tenant_id', 'reason', 'tier'],
});
exports.graphqlCostLimitRemaining = createGauge({
    registers: [],
    name: 'graphql_cost_limit_remaining',
    help: 'Remaining cost capacity for tenant (per minute)',
    labelNames: ['tenant_id', 'tier'],
});
exports.graphqlTenantCostUsage = createCounter({
    registers: [],
    name: 'graphql_tenant_cost_usage_total',
    help: 'Total cost consumed by tenant',
    labelNames: ['tenant_id', 'tier', 'user_id'],
});
exports.graphqlCostRateLimitHits = createCounter({
    registers: [],
    name: 'graphql_cost_rate_limit_hits_total',
    help: 'Number of times cost-based rate limit was hit',
    labelNames: ['tenant_id', 'limit_type', 'tier'],
});
exports.graphqlPerTenantOverageCount = createCounter({
    registers: [],
    name: 'graphql_per_tenant_overage_count_total',
    help: 'Count of cost limit overages per tenant',
    labelNames: ['tenant_id', 'tier'],
});
// Register metrics
try {
    exports.register.registerMetric(exports.llmCostTotal);
    exports.register.registerMetric(exports.graphqlQueryCostHistogram);
    exports.register.registerMetric(exports.graphqlCostLimitExceededTotal);
    exports.register.registerMetric(exports.graphqlCostLimitRemaining);
    exports.register.registerMetric(exports.graphqlTenantCostUsage);
    exports.register.registerMetric(exports.graphqlCostRateLimitHits);
    exports.register.registerMetric(exports.graphqlPerTenantOverageCount);
    exports.register.registerMetric(exports.intelgraphJobsProcessed);
    exports.register.registerMetric(exports.intelgraphOutboxSyncLatency);
    exports.register.registerMetric(exports.intelgraphActiveConnections);
    exports.register.registerMetric(exports.intelgraphDatabaseQueryDuration);
    exports.register.registerMetric(exports.intelgraphHttpRequestDuration);
    exports.register.registerMetric(exports.intelgraphGraphragQueryTotal);
    exports.register.registerMetric(exports.intelgraphGraphragQueryDurationMs);
    exports.register.registerMetric(exports.intelgraphQueryPreviewsTotal);
    exports.register.registerMetric(exports.intelgraphQueryPreviewLatencyMs);
    exports.register.registerMetric(exports.intelgraphQueryPreviewErrorsTotal);
    exports.register.registerMetric(exports.intelgraphQueryPreviewExecutionsTotal);
    exports.register.registerMetric(exports.intelgraphGlassBoxRunsTotal);
    exports.register.registerMetric(exports.intelgraphGlassBoxRunDurationMs);
    exports.register.registerMetric(exports.intelgraphGlassBoxCacheHits);
    exports.register.registerMetric(exports.intelgraphCacheHits);
    exports.register.registerMetric(exports.intelgraphCacheMisses);
    exports.register.registerMetric(exports.copilotApiRequestTotal);
    exports.register.registerMetric(exports.copilotApiRequestDurationMs);
}
catch (e) { }
// Maestro Orchestration Metrics (migrated from telemetry/metrics.ts)
exports.maestroOrchestrationRequests = createCounter({
    registers: [],
    name: 'maestro_orchestration_requests_total',
    help: 'Total number of orchestration requests',
    labelNames: ['method', 'endpoint', 'status'],
});
exports.maestroOrchestrationDuration = createHistogram({
    registers: [],
    name: 'maestro_orchestration_duration_seconds',
    help: 'Duration of orchestration requests',
    labelNames: ['endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
});
exports.maestroOrchestrationErrors = createCounter({
    registers: [],
    name: 'maestro_orchestration_errors_total',
    help: 'Total number of orchestration errors',
    labelNames: ['error_type', 'endpoint'],
});
exports.maestroActiveConnections = createGauge({
    registers: [],
    name: 'maestro_active_connections',
    help: 'Number of active connections',
    labelNames: ['type'],
});
exports.maestroActiveSessions = createGauge({
    registers: [],
    name: 'maestro_active_sessions_total',
    help: 'Number of active user sessions',
    labelNames: ['type'],
});
exports.maestroAiModelRequests = createCounter({
    registers: [],
    name: 'maestro_ai_model_requests_total',
    help: 'Total AI model requests by model type',
    labelNames: ['model', 'operation', 'status'],
});
exports.maestroAiModelDuration = createHistogram({
    registers: [],
    name: 'maestro_ai_model_response_time_seconds',
    help: 'AI model response time',
    labelNames: ['model', 'operation'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30],
});
exports.maestroAiModelErrors = createCounter({
    registers: [],
    name: 'maestro_ai_model_errors_total',
    help: 'Total AI model errors',
    labelNames: ['model'], // Simplified
});
exports.maestroAiModelCosts = createHistogram({
    registers: [],
    name: 'maestro_ai_model_cost_usd',
    help: 'Cost per AI model request in USD',
    labelNames: ['model', 'operation'],
    buckets: [0.001, 0.01, 0.1, 1, 5, 10, 50],
});
exports.maestroThompsonSamplingRewards = createGauge({
    registers: [],
    name: 'maestro_thompson_sampling_reward_rate',
    help: 'Thompson sampling reward rate by model',
    labelNames: ['model'],
});
exports.maestroGraphOperations = createCounter({
    registers: [],
    name: 'maestro_graph_operations_total',
    help: 'Total graph database operations',
    labelNames: ['operation', 'status'],
});
exports.maestroGraphQueryDuration = createHistogram({
    registers: [],
    name: 'maestro_graph_query_duration_seconds',
    help: 'Graph query execution time',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});
exports.maestroGraphConnections = createGauge({
    registers: [],
    name: 'maestro_graph_connections_active',
    help: 'Active Neo4j connections',
});
exports.maestroGraphEntities = createGauge({
    registers: [],
    name: 'maestro_graph_entities_total',
    help: 'Total entities in graph database',
    labelNames: ['entity_type'],
});
exports.maestroGraphRelations = createGauge({
    registers: [],
    name: 'maestro_graph_relations_total',
    help: 'Total relations in graph database',
});
exports.maestroPremiumRoutingDecisions = createCounter({
    registers: [],
    name: 'maestro_premium_routing_decisions_total',
    help: 'Premium routing decisions',
    labelNames: ['decision', 'model_tier'],
});
exports.maestroPremiumBudgetUtilization = createGauge({
    registers: [],
    name: 'maestro_premium_budget_utilization_percent',
    help: 'Premium model budget utilization percentage',
});
exports.maestroPremiumCostSavings = createCounter({
    registers: [],
    name: 'maestro_premium_cost_savings_usd',
    help: 'Cost savings from premium routing',
    labelNames: ['model_tier'],
});
exports.maestroSecurityEvents = createCounter({
    registers: [],
    name: 'maestro_security_events_total',
    help: 'Security events by type',
    labelNames: ['event_type', 'severity', 'user_id'],
});
exports.maestroComplianceGateDecisions = createCounter({
    registers: [],
    name: 'maestro_compliance_gate_decisions_total',
    help: 'Compliance gate decisions',
    labelNames: ['decision', 'policy', 'reason'],
});
exports.maestroAuthenticationAttempts = createCounter({
    registers: [],
    name: 'maestro_authentication_attempts_total',
    help: 'Authentication attempts',
    labelNames: ['auth_method', 'status', 'user_id'],
});
exports.maestroAuthorizationDecisions = createCounter({
    registers: [],
    name: 'maestro_authorization_decisions_total',
    help: 'Authorization decisions',
});
exports.maestroInvestigationsCreated = createCounter({
    registers: [],
    name: 'maestro_investigations_created_total',
    help: 'Total investigations created',
    labelNames: ['investigation_type', 'user_id'],
});
exports.maestroDataSourcesActive = createGauge({
    registers: [],
    name: 'maestro_data_sources_active_total',
    help: 'Number of active data sources',
    labelNames: ['source_type'],
});
exports.maestroWebScrapingRequests = createCounter({
    registers: [],
    name: 'maestro_web_scraping_requests_total',
    help: 'Web scraping requests',
    labelNames: ['status', 'domain'],
});
exports.maestroSynthesisOperations = createCounter({
    registers: [],
    name: 'maestro_synthesis_operations_total',
    help: 'Data synthesis operations',
});
// Register new metrics
try {
    exports.register.registerMetric(exports.maestroOrchestrationRequests);
    exports.register.registerMetric(exports.maestroOrchestrationDuration);
    exports.register.registerMetric(exports.maestroOrchestrationErrors);
    exports.register.registerMetric(exports.maestroActiveConnections);
    exports.register.registerMetric(exports.maestroActiveSessions);
    exports.register.registerMetric(exports.maestroAiModelRequests);
    exports.register.registerMetric(exports.maestroAiModelDuration);
    exports.register.registerMetric(exports.maestroAiModelErrors);
    exports.register.registerMetric(exports.maestroAiModelCosts);
    exports.register.registerMetric(exports.maestroThompsonSamplingRewards);
    exports.register.registerMetric(exports.maestroGraphOperations);
    exports.register.registerMetric(exports.maestroGraphQueryDuration);
    exports.register.registerMetric(exports.maestroGraphConnections);
    exports.register.registerMetric(exports.maestroGraphEntities);
    exports.register.registerMetric(exports.maestroGraphRelations);
    exports.register.registerMetric(exports.maestroPremiumRoutingDecisions);
    exports.register.registerMetric(exports.maestroPremiumBudgetUtilization);
    exports.register.registerMetric(exports.maestroPremiumCostSavings);
    exports.register.registerMetric(exports.maestroSecurityEvents);
    exports.register.registerMetric(exports.maestroComplianceGateDecisions);
    exports.register.registerMetric(exports.maestroAuthenticationAttempts);
    exports.register.registerMetric(exports.maestroAuthorizationDecisions);
    exports.register.registerMetric(exports.maestroInvestigationsCreated);
    exports.register.registerMetric(exports.maestroDataSourcesActive);
    exports.register.registerMetric(exports.maestroWebScrapingRequests);
    exports.register.registerMetric(exports.maestroSynthesisOperations);
}
catch (e) { }
// Debug log to verify metrics loading
if (process.env.NODE_ENV === 'test') {
    // console.log('DEBUG: metrics.ts loaded in test environment');
}
exports.metrics = {
    graphExpandRequestsTotal: exports.graphExpandRequestsTotal,
    aiRequestTotal: exports.aiRequestTotal,
    resolverLatencyMs: exports.resolverLatencyMs,
    breakerState: exports.breakerState,
    intelgraphJobQueueDepth: exports.intelgraphJobQueueDepth,
    graphragSchemaFailuresTotal: exports.graphragSchemaFailuresTotal,
    graphragCacheHitRatio: exports.graphragCacheHitRatio,
    neighborhoodCacheHitRatio: exports.neighborhoodCacheHitRatio,
    neighborhoodCacheLatencyMs: exports.neighborhoodCacheLatencyMs,
    pbacDecisionsTotal: exports.pbacDecisionsTotal,
    businessUserSignupsTotal: exports.businessUserSignupsTotal,
    businessApiCallsTotal: exports.businessApiCallsTotal,
    businessRevenueTotal: exports.businessRevenueTotal,
    serviceAutoRemediationsTotal: exports.serviceAutoRemediationsTotal,
    goldenPathStepTotal: exports.goldenPathStepTotal,
    uiErrorBoundaryCatchTotal: exports.uiErrorBoundaryCatchTotal,
    maestroDeploymentsTotal: exports.maestroDeploymentsTotal,
    maestroPrLeadTimeHours: exports.maestroPrLeadTimeHours,
    maestroChangeFailureRate: exports.maestroChangeFailureRate,
    maestroMttrHours: exports.maestroMttrHours,
    maestroDagExecutionDurationSeconds: exports.maestroDagExecutionDurationSeconds,
    maestroJobExecutionDurationSeconds: exports.maestroJobExecutionDurationSeconds,
    httpRequestDuration: exports.httpRequestDuration,
    httpRequestsTotal: exports.httpRequestsTotal,
    graphqlRequestDuration: exports.graphqlRequestDuration,
    graphqlRequestsTotal: exports.graphqlRequestsTotal,
    graphqlErrors: exports.graphqlErrors,
    dbConnectionsActive: exports.dbConnectionsActive,
    dbQueryDuration: exports.dbQueryDuration,
    dbQueriesTotal: exports.dbQueriesTotal,
    aiJobsQueued: exports.aiJobsQueued,
    aiJobsProcessing: exports.aiJobsProcessing,
    aiJobDuration: exports.aiJobDuration,
    aiJobsTotal: exports.aiJobsTotal,
    llmRequestDuration: exports.llmRequestDuration,
    llmTokensTotal: exports.llmTokensTotal,
    llmRequestsTotal: exports.llmRequestsTotal,
    graphNodesTotal: exports.graphNodesTotal,
    graphEdgesTotal: exports.graphEdgesTotal,
    graphOperationDuration: exports.graphOperationDuration,
    websocketConnections: exports.websocketConnections,
    websocketMessages: exports.websocketMessages,
    investigationsActive: exports.investigationsActive,
    investigationOperations: exports.investigationOperations,
    approvalsPending: exports.approvalsPending,
    approvalsApprovedTotal: exports.approvalsApprovedTotal,
    approvalsRejectedTotal: exports.approvalsRejectedTotal,
    applicationErrors: exports.applicationErrors,
    tenantScopeViolationsTotal: exports.tenantScopeViolationsTotal,
    memoryUsage: exports.memoryUsage,
    admissionDecisionsTotal: exports.admissionDecisionsTotal,
    doclingInferenceDuration: exports.doclingInferenceDuration,
    doclingInferenceTotal: exports.doclingInferenceTotal,
    doclingCharactersProcessed: exports.doclingCharactersProcessed,
    doclingCostUsd: exports.doclingCostUsd,
    pipelineUptimeRatio: exports.pipelineUptimeRatio,
    pipelineFreshnessSeconds: exports.pipelineFreshnessSeconds,
    pipelineCompletenessRatio: exports.pipelineCompletenessRatio,
    pipelineCorrectnessRatio: exports.pipelineCorrectnessRatio,
    pipelineLatencySeconds: exports.pipelineLatencySeconds,
    graphqlResolverDurationSeconds: exports.graphqlResolverDurationSeconds,
    graphqlResolverErrorsTotal: exports.graphqlResolverErrorsTotal,
    graphqlResolverCallsTotal: exports.graphqlResolverCallsTotal,
    webVitalValue: exports.webVitalValue,
    webVitalDurationSeconds: exports.webVitalDurationSeconds,
    realtimeConflictsTotal: exports.realtimeConflictsTotal,
    idempotentHitsTotal: exports.idempotentHitsTotal,
    graphqlQueryCostHistogram: exports.graphqlQueryCostHistogram,
    graphqlCostLimitExceededTotal: exports.graphqlCostLimitExceededTotal,
    graphqlCostLimitRemaining: exports.graphqlCostLimitRemaining,
    graphqlTenantCostUsage: exports.graphqlTenantCostUsage,
    graphqlCostRateLimitHits: exports.graphqlCostRateLimitHits,
    graphqlPerTenantOverageCount: exports.graphqlPerTenantOverageCount,
    maestroAiModelRequests: exports.maestroAiModelRequests,
    maestroAiModelErrors: exports.maestroAiModelErrors,
    maestroOrchestrationDuration: exports.maestroOrchestrationDuration,
    maestroOrchestrationRequests: exports.maestroOrchestrationRequests,
    maestroActiveSessions: exports.maestroActiveSessions,
    maestroOrchestrationErrors: exports.maestroOrchestrationErrors,
    narrativeSimulationActiveSimulations: exports.narrativeSimulationActiveSimulations,
    narrativeSimulationTicksTotal: exports.narrativeSimulationTicksTotal,
    narrativeSimulationEventsTotal: exports.narrativeSimulationEventsTotal,
    narrativeSimulationDurationSeconds: exports.narrativeSimulationDurationSeconds,
};
exports.default = exports.metrics;

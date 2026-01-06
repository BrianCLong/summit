
/**
 * Prometheus metrics collection for Summit Platform
 * Ported from monitoring/metrics.js to TypeScript
 */
import * as client from 'prom-client';

// Clear the default registry to avoid duplicate metric errors
client.register.clear();

// Create a Registry which registers the metrics
export const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({
  register,
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// --- HTTP Metrics ---
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

// --- Business KPIs ---
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

// --- GraphQL Metrics ---
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

// --- Database Metrics ---
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

// --- AI/ML Metrics ---
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

export const aiRequestTotal = new client.Counter({
  name: 'ai_request_total',
  help: 'AI request events',
  labelNames: ['status'],
});

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

// --- Graph/Neo4j Metrics ---
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

export const graphExpandRequestsTotal = new client.Counter({
  name: 'graph_expand_requests_total',
  help: 'Total expandNeighbors requests',
  labelNames: ['cached'],
});

// --- Pipeline/DORA Metrics ---
export const pipelineUptimeRatio = new client.Gauge({
  name: 'pipeline_uptime_ratio',
  help: 'Pipeline availability ratio (0..1) over current window',
  labelNames: ['source', 'pipeline', 'env'],
});

export const pipelineLatencySeconds = new client.Histogram({
  name: 'pipeline_latency_seconds',
  help: 'End-to-end processing latency seconds',
  labelNames: ['source', 'pipeline', 'env'],
  buckets: [5, 15, 30, 60, 120, 300, 600, 1200],
});

export const maestroDeploymentsTotal = new client.Counter({
  name: 'maestro_deployments_total',
  help: 'Total number of deployments',
  labelNames: ['environment', 'status'],
});

export const maestroChangeFailureRate = new client.Gauge({
  name: 'maestro_change_failure_rate',
  help: 'Change failure rate percentage',
});

// --- Agent Metrics ---
export const agentExecutionsTotal = new client.Counter({
  name: 'agent_executions_total',
  help: 'Total number of agent executions',
  labelNames: ['tenant', 'status'],
});

export const agentExecutionDuration = new client.Histogram({
  name: 'agent_execution_duration_seconds',
  help: 'Duration of agent execution in seconds',
  labelNames: ['tenant', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

export const policyDecisionsTotal = new client.Counter({
  name: 'policy_decisions_total',
  help: 'Total number of policy decisions',
  labelNames: ['policy', 'decision', 'signal_type'],
});

// --- System/Error Metrics ---
export const applicationErrors = new client.Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['module', 'error_type', 'severity', 'signal_type'],
});

export const memoryUsage = new client.Gauge({
  name: 'application_memory_usage_bytes',
  help: 'Memory usage by application component',
  labelNames: ['component'],
});

export const tenantScopeViolationsTotal = new client.Counter({
  name: 'tenant_scope_violations_total',
  help: 'Total number of tenant scope violations',
});

// Register all metrics
const metricsToRegister = [
  httpRequestDuration, httpRequestsTotal,
  graphqlRequestDuration, graphqlRequestsTotal, graphqlErrors,
  graphqlResolverDurationSeconds, graphqlResolverErrorsTotal, graphqlResolverCallsTotal,
  dbConnectionsActive, dbQueryDuration, dbQueriesTotal,
  aiJobsQueued, aiJobsProcessing, aiJobDuration, aiJobsTotal, aiRequestTotal,
  copilotApiRequestTotal, copilotApiRequestDurationMs,
  graphNodesTotal, graphEdgesTotal, graphOperationDuration, graphExpandRequestsTotal,
  pipelineUptimeRatio, pipelineLatencySeconds,
  maestroDeploymentsTotal, maestroChangeFailureRate,
  agentExecutionsTotal, agentExecutionDuration, policyDecisionsTotal,
  applicationErrors, memoryUsage, tenantScopeViolationsTotal,
  businessUserSignupsTotal, businessApiCallsTotal, businessRevenueTotal,
];

metricsToRegister.forEach(m => register.registerMetric(m as any));

// Update memory usage periodically
setInterval(() => {
  const usage = process.memoryUsage();
  memoryUsage.set({ component: 'heap_used' }, usage.heapUsed);
  memoryUsage.set({ component: 'heap_total' }, usage.heapTotal);
  memoryUsage.set({ component: 'external' }, usage.external);
  memoryUsage.set({ component: 'rss' }, usage.rss);
}, 30000);

export const metrics = {
  httpRequestsTotal,
  httpRequestDuration,
  graphqlRequestsTotal,
  graphqlRequestDuration,
  graphqlErrors,
  dbQueriesTotal,
  dbQueryDuration,
  aiJobsTotal,
  aiJobDuration,
  applicationErrors,
  businessApiCallsTotal,
  agentExecutionsTotal,
  agentExecutionDuration,
  policyDecisionsTotal,
};

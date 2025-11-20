/**
 * AI Copilot Metrics and Monitoring
 *
 * Prometheus-compatible metrics for observability and cost tracking.
 */

import { Counter, Histogram, Gauge, Summary, Registry } from 'prom-client';
import pino from 'pino';

const logger = pino({ name: 'CopilotMetrics' });

// Create a custom registry for copilot metrics
export const copilotRegistry = new Registry();

// ============================================================================
// Query Metrics
// ============================================================================

/**
 * Total number of NL queries submitted
 */
export const nlQueriesTotal = new Counter({
  name: 'copilot_nl_queries_total',
  help: 'Total number of natural language queries submitted',
  labelNames: ['investigation_id', 'user_id', 'status'],
  registers: [copilotRegistry],
});

/**
 * NL query preview generation latency
 */
export const nlQueryPreviewDuration = new Histogram({
  name: 'copilot_nl_query_preview_duration_seconds',
  help: 'Time to generate query preview in seconds',
  labelNames: ['complexity', 'allowed'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [copilotRegistry],
});

/**
 * Cypher query execution latency
 */
export const cypherExecutionDuration = new Histogram({
  name: 'copilot_cypher_execution_duration_seconds',
  help: 'Time to execute Cypher query in seconds',
  labelNames: ['complexity', 'success'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [copilotRegistry],
});

/**
 * Query result size distribution
 */
export const queryResultSize = new Histogram({
  name: 'copilot_query_result_size',
  help: 'Number of records returned by queries',
  labelNames: ['complexity'],
  buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000],
  registers: [copilotRegistry],
});

/**
 * Estimated vs actual row count accuracy
 */
export const estimationAccuracy = new Summary({
  name: 'copilot_estimation_accuracy_ratio',
  help: 'Ratio of estimated to actual rows (1.0 = perfect estimate)',
  labelNames: ['complexity'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [copilotRegistry],
});

// ============================================================================
// Safety & Guardrails Metrics
// ============================================================================

/**
 * Queries blocked by guardrails
 */
export const queriesBlocked = new Counter({
  name: 'copilot_queries_blocked_total',
  help: 'Total number of queries blocked by safety checks',
  labelNames: ['block_reason', 'investigation_id'],
  registers: [copilotRegistry],
});

/**
 * Prompt injection attempts detected
 */
export const promptInjectionsDetected = new Counter({
  name: 'copilot_prompt_injections_detected_total',
  help: 'Total number of prompt injection attempts detected',
  labelNames: ['pattern', 'user_id'],
  registers: [copilotRegistry],
});

/**
 * Dangerous query patterns detected
 */
export const dangerousQueriesDetected = new Counter({
  name: 'copilot_dangerous_queries_detected_total',
  help: 'Total number of dangerous query patterns detected',
  labelNames: ['pattern', 'investigation_id'],
  registers: [copilotRegistry],
});

/**
 * PII redactions in query results
 */
export const piiRedactions = new Counter({
  name: 'copilot_pii_redactions_total',
  help: 'Total number of PII redactions in query results',
  labelNames: ['pii_type', 'investigation_id'],
  registers: [copilotRegistry],
});

// ============================================================================
// Cost Metrics
// ============================================================================

/**
 * LLM API costs
 */
export const llmApiCost = new Counter({
  name: 'copilot_llm_api_cost_usd',
  help: 'Total LLM API costs in USD',
  labelNames: ['model', 'operation'],
  registers: [copilotRegistry],
});

/**
 * Query cost distribution
 */
export const queryCostDistribution = new Histogram({
  name: 'copilot_query_cost_units',
  help: 'Distribution of query costs in arbitrary units',
  labelNames: ['complexity'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 50],
  registers: [copilotRegistry],
});

/**
 * Daily cost budget tracking
 */
export const dailyCostBudget = new Gauge({
  name: 'copilot_daily_cost_budget_usd',
  help: 'Remaining daily cost budget in USD',
  registers: [copilotRegistry],
});

// ============================================================================
// Feature Usage Metrics
// ============================================================================

/**
 * Hypothesis generation requests
 */
export const hypothesesGenerated = new Counter({
  name: 'copilot_hypotheses_generated_total',
  help: 'Total number of hypothesis generation requests',
  labelNames: ['investigation_id', 'success'],
  registers: [copilotRegistry],
});

/**
 * Narrative generation requests
 */
export const narrativesGenerated = new Counter({
  name: 'copilot_narratives_generated_total',
  help: 'Total number of narrative generation requests',
  labelNames: ['investigation_id', 'style', 'success'],
  registers: [copilotRegistry],
});

/**
 * Query template usage
 */
export const templateUsage = new Counter({
  name: 'copilot_template_usage_total',
  help: 'Total number of times templates are used',
  labelNames: ['template_id', 'category'],
  registers: [copilotRegistry],
});

/**
 * Entity citation clicks
 */
export const citationClicks = new Counter({
  name: 'copilot_citation_clicks_total',
  help: 'Total number of entity citation clicks',
  labelNames: ['investigation_id'],
  registers: [copilotRegistry],
});

// ============================================================================
// Quality Metrics
// ============================================================================

/**
 * Query success rate
 */
export const querySuccessRate = new Gauge({
  name: 'copilot_query_success_rate',
  help: 'Percentage of successful queries (0-1)',
  labelNames: ['time_window'],
  registers: [copilotRegistry],
});

/**
 * User satisfaction (if collected)
 */
export const userSatisfaction = new Summary({
  name: 'copilot_user_satisfaction_score',
  help: 'User satisfaction scores (1-5)',
  labelNames: ['investigation_id'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [copilotRegistry],
});

/**
 * Schema validation failures
 */
export const schemaValidationFailures = new Counter({
  name: 'copilot_schema_validation_failures_total',
  help: 'Total number of LLM output schema validation failures',
  labelNames: ['operation'],
  registers: [copilotRegistry],
});

// ============================================================================
// Audit Metrics
// ============================================================================

/**
 * Audit trail entries created
 */
export const auditEntriesCreated = new Counter({
  name: 'copilot_audit_entries_created_total',
  help: 'Total number of audit trail entries created',
  labelNames: ['operation', 'privacy_level'],
  registers: [copilotRegistry],
});

/**
 * GDPR data erasure requests
 */
export const gdprErasureRequests = new Counter({
  name: 'copilot_gdpr_erasure_requests_total',
  help: 'Total number of GDPR data erasure requests',
  labelNames: ['user_id'],
  registers: [copilotRegistry],
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Track a natural language query
 */
export function trackNLQuery(
  investigationId: string,
  userId: string,
  status: 'success' | 'blocked' | 'error'
) {
  nlQueriesTotal.inc({ investigation_id: investigationId, user_id: userId, status });
}

/**
 * Track query preview generation
 */
export function trackQueryPreview(
  complexity: string,
  allowed: boolean,
  durationSeconds: number
) {
  nlQueryPreviewDuration.observe(
    { complexity, allowed: String(allowed) },
    durationSeconds
  );
}

/**
 * Track query execution
 */
export function trackQueryExecution(
  complexity: string,
  success: boolean,
  durationSeconds: number,
  recordCount: number
) {
  cypherExecutionDuration.observe(
    { complexity, success: String(success) },
    durationSeconds
  );
  queryResultSize.observe({ complexity }, recordCount);
}

/**
 * Track estimation accuracy
 */
export function trackEstimationAccuracy(
  complexity: string,
  estimatedRows: number,
  actualRows: number
) {
  if (estimatedRows > 0 && actualRows > 0) {
    const ratio = actualRows / estimatedRows;
    estimationAccuracy.observe({ complexity }, ratio);
  }
}

/**
 * Track blocked query
 */
export function trackBlockedQuery(blockReason: string, investigationId: string) {
  queriesBlocked.inc({ block_reason: blockReason, investigation_id: investigationId });
}

/**
 * Track LLM API cost
 */
export function trackLLMCost(model: string, operation: string, costUSD: number) {
  llmApiCost.inc({ model, operation }, costUSD);
}

/**
 * Track query cost
 */
export function trackQueryCost(complexity: string, costUnits: number) {
  queryCostDistribution.observe({ complexity }, costUnits);
}

/**
 * Track hypothesis generation
 */
export function trackHypothesisGeneration(investigationId: string, success: boolean) {
  hypothesesGenerated.inc({ investigation_id: investigationId, success: String(success) });
}

/**
 * Track narrative generation
 */
export function trackNarrativeGeneration(
  investigationId: string,
  style: string,
  success: boolean
) {
  narrativesGenerated.inc({
    investigation_id: investigationId,
    style,
    success: String(success),
  });
}

/**
 * Update daily cost budget
 */
export function updateDailyCostBudget(remainingUSD: number) {
  dailyCostBudget.set(remainingUSD);
}

/**
 * Calculate and update query success rate
 */
export function updateQuerySuccessRate(
  timeWindow: string,
  successCount: number,
  totalCount: number
) {
  const rate = totalCount > 0 ? successCount / totalCount : 0;
  querySuccessRate.set({ time_window: timeWindow }, rate);
}

/**
 * Track audit entry creation
 */
export function trackAuditEntry(operation: string, privacyLevel: string) {
  auditEntriesCreated.inc({ operation, privacy_level: privacyLevel });
}

// ============================================================================
// Metrics Aggregation
// ============================================================================

interface CopilotMetricsSummary {
  totalQueries: number;
  successfulQueries: number;
  blockedQueries: number;
  totalCost: number;
  avgExecutionTime: number;
  queriesByComplexity: {
    low: number;
    medium: number;
    high: number;
  };
}

/**
 * Get aggregated metrics summary
 */
export async function getMetricsSummary(): Promise<CopilotMetricsSummary> {
  const metrics = await copilotRegistry.metrics();

  // Parse Prometheus format to extract values
  // This is a simplified version - in production, use Prometheus queries

  return {
    totalQueries: 0, // TODO: Parse from metrics
    successfulQueries: 0,
    blockedQueries: 0,
    totalCost: 0,
    avgExecutionTime: 0,
    queriesByComplexity: {
      low: 0,
      medium: 0,
      high: 0,
    },
  };
}

/**
 * Export metrics in Prometheus format
 */
export async function exportMetrics(): Promise<string> {
  return copilotRegistry.metrics();
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics(): void {
  copilotRegistry.clear();
  logger.info('Copilot metrics cleared');
}

// ============================================================================
// Health Check
// ============================================================================

export interface CopilotHealthStatus {
  healthy: boolean;
  metricsEnabled: boolean;
  lastUpdate: string;
  queryRate: number;
  errorRate: number;
}

/**
 * Get health status with key metrics
 */
export function getHealthStatus(): CopilotHealthStatus {
  return {
    healthy: true,
    metricsEnabled: true,
    lastUpdate: new Date().toISOString(),
    queryRate: 0, // Queries per minute
    errorRate: 0, // Error percentage
  };
}

logger.info('Copilot metrics initialized');

/**
 * Summit v4.0.0 Rollout Metrics
 *
 * Prometheus metrics for tracking v4 rollout progress, adoption,
 * performance, and stability.
 */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';

// Create a dedicated registry for v4 rollout metrics
export const v4MetricsRegistry = new Registry();

// ===========================================
// Adoption Metrics
// ===========================================

/**
 * Total v4 API calls by endpoint, method, status, and tenant
 */
export const v4ApiCalls = new Counter({
  name: 'summit_v4_api_calls_total',
  help: 'Total v4 API calls',
  labelNames: ['endpoint', 'method', 'status_code', 'tenant_id'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Feature enablement status per tenant
 * Values: 0 = disabled, 1 = enabled
 */
export const v4FeatureEnabled = new Gauge({
  name: 'summit_v4_feature_enabled',
  help: 'v4 feature enabled per tenant (0=disabled, 1=enabled)',
  labelNames: ['feature', 'tenant_id'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Migration status per tenant
 * Values: 0 = not started, 1 = in progress, 2 = completed
 */
export const v4MigrationStatus = new Gauge({
  name: 'summit_v4_migration_status',
  help: 'Migration status per tenant (0=not started, 1=in progress, 2=completed)',
  labelNames: ['tenant_id'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Total unique tenants using v4
 */
export const v4ActiveTenants = new Gauge({
  name: 'summit_v4_active_tenants',
  help: 'Number of tenants actively using v4',
  registers: [v4MetricsRegistry],
});

// ===========================================
// AI Governance Metrics
// ===========================================

/**
 * AI policy suggestions generated
 */
export const aiSuggestionsGenerated = new Counter({
  name: 'summit_ai_suggestions_generated_total',
  help: 'Total AI policy suggestions generated',
  labelNames: ['tenant_id', 'suggestion_type', 'status'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * AI suggestions implemented (accepted by user)
 */
export const aiSuggestionsImplemented = new Counter({
  name: 'summit_ai_suggestions_implemented_total',
  help: 'Total AI policy suggestions implemented',
  labelNames: ['tenant_id', 'suggestion_type'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Current count of suggestions generated today
 */
export const aiSuggestionsGeneratedToday = new Gauge({
  name: 'summit_ai_suggestions_generated_today',
  help: 'AI suggestions generated today (resets daily)',
  labelNames: ['tenant_id'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Daily suggestion limit per tenant
 */
export const aiSuggestionsDailyLimit = new Gauge({
  name: 'summit_ai_suggestions_daily_limit',
  help: 'Daily AI suggestion limit per tenant',
  labelNames: ['tenant_id'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Verdict explanations generated
 */
export const aiExplanationsGenerated = new Counter({
  name: 'summit_ai_explanations_generated_total',
  help: 'Total verdict explanations generated',
  labelNames: ['tenant_id', 'audience', 'cache_hit'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Explanation cache hit ratio
 */
export const aiExplanationsCacheHitRatio = new Gauge({
  name: 'summit_ai_explanations_cache_hit_ratio',
  help: 'Verdict explanation cache hit ratio',
  registers: [v4MetricsRegistry],
});

/**
 * Behavioral anomalies detected
 */
export const aiAnomaliesDetected = new Counter({
  name: 'summit_ai_anomalies_detected_total',
  help: 'Total behavioral anomalies detected',
  labelNames: ['tenant_id', 'severity', 'anomaly_type'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Anomalies resolved
 */
export const aiAnomaliesResolved = new Counter({
  name: 'summit_ai_anomalies_resolved_total',
  help: 'Total anomalies resolved',
  labelNames: ['tenant_id', 'resolution_type'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Total AI service requests
 */
export const aiRequestsTotal = new Counter({
  name: 'summit_ai_requests_total',
  help: 'Total AI service requests',
  labelNames: ['service', 'operation'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * AI service errors
 */
export const aiErrorsTotal = new Counter({
  name: 'summit_ai_errors_total',
  help: 'Total AI service errors',
  labelNames: ['service', 'error_type'] as const,
  registers: [v4MetricsRegistry],
});

// ===========================================
// Compliance Metrics
// ===========================================

/**
 * Compliance assessments run
 */
export const complianceAssessmentsTotal = new Counter({
  name: 'summit_compliance_assessments_total',
  help: 'Total compliance assessments run',
  labelNames: ['tenant_id', 'framework', 'status'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Compliance assessment failures
 */
export const complianceAssessmentFailures = new Counter({
  name: 'summit_compliance_assessment_failures_total',
  help: 'Total compliance assessment failures',
  labelNames: ['tenant_id', 'framework', 'failure_reason'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Compliance controls by status
 */
export const complianceControlsStatus = new Gauge({
  name: 'summit_compliance_controls_status',
  help: 'Compliance control status counts',
  labelNames: ['tenant_id', 'framework', 'status'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Evidence items collected
 */
export const complianceEvidenceCollected = new Counter({
  name: 'summit_compliance_evidence_collected_total',
  help: 'Total evidence items collected',
  labelNames: ['tenant_id', 'framework', 'control_id'] as const,
  registers: [v4MetricsRegistry],
});

// ===========================================
// Zero-Trust / HSM Metrics
// ===========================================

/**
 * HSM service availability
 */
export const hsmServiceUp = new Gauge({
  name: 'summit_hsm_service_up',
  help: 'HSM service availability (1=up, 0=down)',
  labelNames: ['provider'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * HSM operations
 */
export const hsmOperationsTotal = new Counter({
  name: 'summit_hsm_operations_total',
  help: 'Total HSM operations',
  labelNames: ['operation', 'provider', 'status'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * HSM operation latency
 */
export const hsmOperationLatency = new Histogram({
  name: 'summit_hsm_operation_latency_seconds',
  help: 'HSM operation latency in seconds',
  labelNames: ['operation', 'provider'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1],
  registers: [v4MetricsRegistry],
});

/**
 * HSM keys created
 */
export const hsmKeysCreated = new Counter({
  name: 'summit_hsm_keys_created_total',
  help: 'Total HSM keys created',
  labelNames: ['tenant_id', 'algorithm', 'purpose'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Audit events logged
 */
export const auditEventsTotal = new Counter({
  name: 'summit_audit_events_total',
  help: 'Total audit events logged',
  labelNames: ['tenant_id', 'event_type'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Audit chain verification results
 */
export const auditChainVerifications = new Counter({
  name: 'summit_audit_chain_verifications_total',
  help: 'Total audit chain verifications',
  labelNames: ['result'] as const,
  registers: [v4MetricsRegistry],
});

/**
 * Audit chain verification failures (for alerting)
 */
export const auditChainVerificationFailures = new Counter({
  name: 'summit_audit_chain_verification_failures_total',
  help: 'Total audit chain verification failures',
  registers: [v4MetricsRegistry],
});

// ===========================================
// Performance Metrics
// ===========================================

/**
 * v4 API request latency
 */
export const v4ApiLatency = new Histogram({
  name: 'summit_v4_api_latency_seconds',
  help: 'v4 API request latency in seconds',
  labelNames: ['endpoint', 'method'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [v4MetricsRegistry],
});

/**
 * AI service operation latency
 */
export const aiOperationLatency = new Histogram({
  name: 'summit_ai_operation_latency_seconds',
  help: 'AI service operation latency in seconds',
  labelNames: ['operation'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [v4MetricsRegistry],
});

/**
 * Compliance assessment latency
 */
export const complianceAssessmentLatency = new Histogram({
  name: 'summit_compliance_assessment_latency_seconds',
  help: 'Compliance assessment latency in seconds',
  labelNames: ['framework'] as const,
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [v4MetricsRegistry],
});

/**
 * LLM provider request latency
 */
export const llmRequestLatency = new Histogram({
  name: 'summit_llm_request_latency_seconds',
  help: 'LLM provider request latency in seconds',
  labelNames: ['provider', 'operation'] as const,
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [v4MetricsRegistry],
});

/**
 * LLM token usage
 */
export const llmTokenUsage = new Counter({
  name: 'summit_llm_token_usage_total',
  help: 'Total LLM tokens used',
  labelNames: ['provider', 'token_type'] as const,
  registers: [v4MetricsRegistry],
});

// ===========================================
// Error Metrics
// ===========================================

/**
 * v4 API errors by type
 */
export const v4ErrorsTotal = new Counter({
  name: 'summit_v4_errors_total',
  help: 'Total v4 API errors',
  labelNames: ['endpoint', 'error_type', 'status_code'] as const,
  registers: [v4MetricsRegistry],
});

// ===========================================
// Resource Metrics
// ===========================================

/**
 * Database connection pool stats
 */
export const dbConnectionsActive = new Gauge({
  name: 'summit_db_connections_active',
  help: 'Active database connections',
  registers: [v4MetricsRegistry],
});

export const dbConnectionsMax = new Gauge({
  name: 'summit_db_connections_max',
  help: 'Maximum database connections',
  registers: [v4MetricsRegistry],
});

/**
 * HSM connection pool stats
 */
export const hsmConnectionsActive = new Gauge({
  name: 'summit_hsm_connections_active',
  help: 'Active HSM connections',
  registers: [v4MetricsRegistry],
});

// ===========================================
// Helper Functions
// ===========================================

/**
 * Record a v4 API call
 */
export function recordApiCall(
  endpoint: string,
  method: string,
  statusCode: number,
  tenantId: string,
  latencySeconds: number
): void {
  v4ApiCalls.inc({
    endpoint,
    method,
    status_code: statusCode.toString(),
    tenant_id: tenantId,
  });

  v4ApiLatency.observe({ endpoint, method }, latencySeconds);

  if (statusCode >= 500) {
    v4ErrorsTotal.inc({
      endpoint,
      error_type: 'server_error',
      status_code: statusCode.toString(),
    });
  } else if (statusCode >= 400) {
    v4ErrorsTotal.inc({
      endpoint,
      error_type: 'client_error',
      status_code: statusCode.toString(),
    });
  }
}

/**
 * Record feature enablement
 */
export function recordFeatureEnabled(
  feature: string,
  tenantId: string,
  enabled: boolean
): void {
  v4FeatureEnabled.set({ feature, tenant_id: tenantId }, enabled ? 1 : 0);
}

/**
 * Record AI suggestion generation
 */
export function recordAISuggestion(
  tenantId: string,
  suggestionType: string,
  status: 'generated' | 'implemented' | 'rejected',
  latencySeconds?: number
): void {
  aiSuggestionsGenerated.inc({
    tenant_id: tenantId,
    suggestion_type: suggestionType,
    status,
  });

  if (status === 'implemented') {
    aiSuggestionsImplemented.inc({
      tenant_id: tenantId,
      suggestion_type: suggestionType,
    });
  }

  if (latencySeconds !== undefined) {
    aiOperationLatency.observe({ operation: 'suggestion' }, latencySeconds);
  }
}

/**
 * Record HSM operation
 */
export function recordHSMOperation(
  operation: string,
  provider: string,
  success: boolean,
  latencySeconds: number
): void {
  hsmOperationsTotal.inc({
    operation,
    provider,
    status: success ? 'success' : 'failure',
  });

  hsmOperationLatency.observe({ operation, provider }, latencySeconds);
}

/**
 * Record compliance assessment
 */
export function recordComplianceAssessment(
  tenantId: string,
  framework: string,
  status: 'started' | 'completed' | 'failed',
  latencySeconds?: number
): void {
  complianceAssessmentsTotal.inc({
    tenant_id: tenantId,
    framework,
    status,
  });

  if (status === 'failed') {
    complianceAssessmentFailures.inc({
      tenant_id: tenantId,
      framework,
      failure_reason: 'assessment_error',
    });
  }

  if (latencySeconds !== undefined && status === 'completed') {
    complianceAssessmentLatency.observe({ framework }, latencySeconds);
  }
}

/**
 * Get all v4 rollout metrics
 */
export async function getV4Metrics(): Promise<string> {
  return v4MetricsRegistry.metrics();
}

/**
 * Initialize default metric values
 */
export function initializeMetrics(): void {
  // Initialize HSM service as up
  hsmServiceUp.set({ provider: 'software' }, 1);

  // Initialize database pool metrics
  dbConnectionsMax.set(10);
  dbConnectionsActive.set(0);

  // Initialize explanation cache hit ratio
  aiExplanationsCacheHitRatio.set(0);

  console.log('[Metrics] v4 rollout metrics initialized');
}

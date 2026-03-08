"use strict";
/**
 * Summit v4.0.0 Rollout Metrics
 *
 * Prometheus metrics for tracking v4 rollout progress, adoption,
 * performance, and stability.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hsmConnectionsActive = exports.dbConnectionsMax = exports.dbConnectionsActive = exports.v4ErrorsTotal = exports.llmTokenUsage = exports.llmRequestLatency = exports.complianceAssessmentLatency = exports.aiOperationLatency = exports.v4ApiLatency = exports.auditChainVerificationFailures = exports.auditChainVerifications = exports.auditEventsTotal = exports.hsmKeysCreated = exports.hsmOperationLatency = exports.hsmOperationsTotal = exports.hsmServiceUp = exports.complianceEvidenceCollected = exports.complianceControlsStatus = exports.complianceAssessmentFailures = exports.complianceAssessmentsTotal = exports.aiErrorsTotal = exports.aiRequestsTotal = exports.aiAnomaliesResolved = exports.aiAnomaliesDetected = exports.aiExplanationsCacheHitRatio = exports.aiExplanationsGenerated = exports.aiSuggestionsDailyLimit = exports.aiSuggestionsGeneratedToday = exports.aiSuggestionsImplemented = exports.aiSuggestionsGenerated = exports.v4ActiveTenants = exports.v4MigrationStatus = exports.v4FeatureEnabled = exports.v4ApiCalls = exports.v4MetricsRegistry = void 0;
exports.recordApiCall = recordApiCall;
exports.recordFeatureEnabled = recordFeatureEnabled;
exports.recordAISuggestion = recordAISuggestion;
exports.recordHSMOperation = recordHSMOperation;
exports.recordComplianceAssessment = recordComplianceAssessment;
exports.getV4Metrics = getV4Metrics;
exports.initializeMetrics = initializeMetrics;
const prom_client_1 = require("prom-client");
// Create a dedicated registry for v4 rollout metrics
exports.v4MetricsRegistry = new prom_client_1.Registry();
// ===========================================
// Adoption Metrics
// ===========================================
/**
 * Total v4 API calls by endpoint, method, status, and tenant
 */
exports.v4ApiCalls = new prom_client_1.Counter({
    name: 'summit_v4_api_calls_total',
    help: 'Total v4 API calls',
    labelNames: ['endpoint', 'method', 'status_code', 'tenant_id'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Feature enablement status per tenant
 * Values: 0 = disabled, 1 = enabled
 */
exports.v4FeatureEnabled = new prom_client_1.Gauge({
    name: 'summit_v4_feature_enabled',
    help: 'v4 feature enabled per tenant (0=disabled, 1=enabled)',
    labelNames: ['feature', 'tenant_id'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Migration status per tenant
 * Values: 0 = not started, 1 = in progress, 2 = completed
 */
exports.v4MigrationStatus = new prom_client_1.Gauge({
    name: 'summit_v4_migration_status',
    help: 'Migration status per tenant (0=not started, 1=in progress, 2=completed)',
    labelNames: ['tenant_id'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Total unique tenants using v4
 */
exports.v4ActiveTenants = new prom_client_1.Gauge({
    name: 'summit_v4_active_tenants',
    help: 'Number of tenants actively using v4',
    registers: [exports.v4MetricsRegistry],
});
// ===========================================
// AI Governance Metrics
// ===========================================
/**
 * AI policy suggestions generated
 */
exports.aiSuggestionsGenerated = new prom_client_1.Counter({
    name: 'summit_ai_suggestions_generated_total',
    help: 'Total AI policy suggestions generated',
    labelNames: ['tenant_id', 'suggestion_type', 'status'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * AI suggestions implemented (accepted by user)
 */
exports.aiSuggestionsImplemented = new prom_client_1.Counter({
    name: 'summit_ai_suggestions_implemented_total',
    help: 'Total AI policy suggestions implemented',
    labelNames: ['tenant_id', 'suggestion_type'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Current count of suggestions generated today
 */
exports.aiSuggestionsGeneratedToday = new prom_client_1.Gauge({
    name: 'summit_ai_suggestions_generated_today',
    help: 'AI suggestions generated today (resets daily)',
    labelNames: ['tenant_id'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Daily suggestion limit per tenant
 */
exports.aiSuggestionsDailyLimit = new prom_client_1.Gauge({
    name: 'summit_ai_suggestions_daily_limit',
    help: 'Daily AI suggestion limit per tenant',
    labelNames: ['tenant_id'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Verdict explanations generated
 */
exports.aiExplanationsGenerated = new prom_client_1.Counter({
    name: 'summit_ai_explanations_generated_total',
    help: 'Total verdict explanations generated',
    labelNames: ['tenant_id', 'audience', 'cache_hit'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Explanation cache hit ratio
 */
exports.aiExplanationsCacheHitRatio = new prom_client_1.Gauge({
    name: 'summit_ai_explanations_cache_hit_ratio',
    help: 'Verdict explanation cache hit ratio',
    registers: [exports.v4MetricsRegistry],
});
/**
 * Behavioral anomalies detected
 */
exports.aiAnomaliesDetected = new prom_client_1.Counter({
    name: 'summit_ai_anomalies_detected_total',
    help: 'Total behavioral anomalies detected',
    labelNames: ['tenant_id', 'severity', 'anomaly_type'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Anomalies resolved
 */
exports.aiAnomaliesResolved = new prom_client_1.Counter({
    name: 'summit_ai_anomalies_resolved_total',
    help: 'Total anomalies resolved',
    labelNames: ['tenant_id', 'resolution_type'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Total AI service requests
 */
exports.aiRequestsTotal = new prom_client_1.Counter({
    name: 'summit_ai_requests_total',
    help: 'Total AI service requests',
    labelNames: ['service', 'operation'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * AI service errors
 */
exports.aiErrorsTotal = new prom_client_1.Counter({
    name: 'summit_ai_errors_total',
    help: 'Total AI service errors',
    labelNames: ['service', 'error_type'],
    registers: [exports.v4MetricsRegistry],
});
// ===========================================
// Compliance Metrics
// ===========================================
/**
 * Compliance assessments run
 */
exports.complianceAssessmentsTotal = new prom_client_1.Counter({
    name: 'summit_compliance_assessments_total',
    help: 'Total compliance assessments run',
    labelNames: ['tenant_id', 'framework', 'status'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Compliance assessment failures
 */
exports.complianceAssessmentFailures = new prom_client_1.Counter({
    name: 'summit_compliance_assessment_failures_total',
    help: 'Total compliance assessment failures',
    labelNames: ['tenant_id', 'framework', 'failure_reason'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Compliance controls by status
 */
exports.complianceControlsStatus = new prom_client_1.Gauge({
    name: 'summit_compliance_controls_status',
    help: 'Compliance control status counts',
    labelNames: ['tenant_id', 'framework', 'status'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Evidence items collected
 */
exports.complianceEvidenceCollected = new prom_client_1.Counter({
    name: 'summit_compliance_evidence_collected_total',
    help: 'Total evidence items collected',
    labelNames: ['tenant_id', 'framework', 'control_id'],
    registers: [exports.v4MetricsRegistry],
});
// ===========================================
// Zero-Trust / HSM Metrics
// ===========================================
/**
 * HSM service availability
 */
exports.hsmServiceUp = new prom_client_1.Gauge({
    name: 'summit_hsm_service_up',
    help: 'HSM service availability (1=up, 0=down)',
    labelNames: ['provider'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * HSM operations
 */
exports.hsmOperationsTotal = new prom_client_1.Counter({
    name: 'summit_hsm_operations_total',
    help: 'Total HSM operations',
    labelNames: ['operation', 'provider', 'status'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * HSM operation latency
 */
exports.hsmOperationLatency = new prom_client_1.Histogram({
    name: 'summit_hsm_operation_latency_seconds',
    help: 'HSM operation latency in seconds',
    labelNames: ['operation', 'provider'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1],
    registers: [exports.v4MetricsRegistry],
});
/**
 * HSM keys created
 */
exports.hsmKeysCreated = new prom_client_1.Counter({
    name: 'summit_hsm_keys_created_total',
    help: 'Total HSM keys created',
    labelNames: ['tenant_id', 'algorithm', 'purpose'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Audit events logged
 */
exports.auditEventsTotal = new prom_client_1.Counter({
    name: 'summit_audit_events_total',
    help: 'Total audit events logged',
    labelNames: ['tenant_id', 'event_type'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Audit chain verification results
 */
exports.auditChainVerifications = new prom_client_1.Counter({
    name: 'summit_audit_chain_verifications_total',
    help: 'Total audit chain verifications',
    labelNames: ['result'],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Audit chain verification failures (for alerting)
 */
exports.auditChainVerificationFailures = new prom_client_1.Counter({
    name: 'summit_audit_chain_verification_failures_total',
    help: 'Total audit chain verification failures',
    registers: [exports.v4MetricsRegistry],
});
// ===========================================
// Performance Metrics
// ===========================================
/**
 * v4 API request latency
 */
exports.v4ApiLatency = new prom_client_1.Histogram({
    name: 'summit_v4_api_latency_seconds',
    help: 'v4 API request latency in seconds',
    labelNames: ['endpoint', 'method'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [exports.v4MetricsRegistry],
});
/**
 * AI service operation latency
 */
exports.aiOperationLatency = new prom_client_1.Histogram({
    name: 'summit_ai_operation_latency_seconds',
    help: 'AI service operation latency in seconds',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [exports.v4MetricsRegistry],
});
/**
 * Compliance assessment latency
 */
exports.complianceAssessmentLatency = new prom_client_1.Histogram({
    name: 'summit_compliance_assessment_latency_seconds',
    help: 'Compliance assessment latency in seconds',
    labelNames: ['framework'],
    buckets: [1, 5, 10, 30, 60, 120, 300],
    registers: [exports.v4MetricsRegistry],
});
/**
 * LLM provider request latency
 */
exports.llmRequestLatency = new prom_client_1.Histogram({
    name: 'summit_llm_request_latency_seconds',
    help: 'LLM provider request latency in seconds',
    labelNames: ['provider', 'operation'],
    buckets: [0.5, 1, 2, 5, 10, 30],
    registers: [exports.v4MetricsRegistry],
});
/**
 * LLM token usage
 */
exports.llmTokenUsage = new prom_client_1.Counter({
    name: 'summit_llm_token_usage_total',
    help: 'Total LLM tokens used',
    labelNames: ['provider', 'token_type'],
    registers: [exports.v4MetricsRegistry],
});
// ===========================================
// Error Metrics
// ===========================================
/**
 * v4 API errors by type
 */
exports.v4ErrorsTotal = new prom_client_1.Counter({
    name: 'summit_v4_errors_total',
    help: 'Total v4 API errors',
    labelNames: ['endpoint', 'error_type', 'status_code'],
    registers: [exports.v4MetricsRegistry],
});
// ===========================================
// Resource Metrics
// ===========================================
/**
 * Database connection pool stats
 */
exports.dbConnectionsActive = new prom_client_1.Gauge({
    name: 'summit_db_connections_active',
    help: 'Active database connections',
    registers: [exports.v4MetricsRegistry],
});
exports.dbConnectionsMax = new prom_client_1.Gauge({
    name: 'summit_db_connections_max',
    help: 'Maximum database connections',
    registers: [exports.v4MetricsRegistry],
});
/**
 * HSM connection pool stats
 */
exports.hsmConnectionsActive = new prom_client_1.Gauge({
    name: 'summit_hsm_connections_active',
    help: 'Active HSM connections',
    registers: [exports.v4MetricsRegistry],
});
// ===========================================
// Helper Functions
// ===========================================
/**
 * Record a v4 API call
 */
function recordApiCall(endpoint, method, statusCode, tenantId, latencySeconds) {
    exports.v4ApiCalls.inc({
        endpoint,
        method,
        status_code: statusCode.toString(),
        tenant_id: tenantId,
    });
    exports.v4ApiLatency.observe({ endpoint, method }, latencySeconds);
    if (statusCode >= 500) {
        exports.v4ErrorsTotal.inc({
            endpoint,
            error_type: 'server_error',
            status_code: statusCode.toString(),
        });
    }
    else if (statusCode >= 400) {
        exports.v4ErrorsTotal.inc({
            endpoint,
            error_type: 'client_error',
            status_code: statusCode.toString(),
        });
    }
}
/**
 * Record feature enablement
 */
function recordFeatureEnabled(feature, tenantId, enabled) {
    exports.v4FeatureEnabled.set({ feature, tenant_id: tenantId }, enabled ? 1 : 0);
}
/**
 * Record AI suggestion generation
 */
function recordAISuggestion(tenantId, suggestionType, status, latencySeconds) {
    exports.aiSuggestionsGenerated.inc({
        tenant_id: tenantId,
        suggestion_type: suggestionType,
        status,
    });
    if (status === 'implemented') {
        exports.aiSuggestionsImplemented.inc({
            tenant_id: tenantId,
            suggestion_type: suggestionType,
        });
    }
    if (latencySeconds !== undefined) {
        exports.aiOperationLatency.observe({ operation: 'suggestion' }, latencySeconds);
    }
}
/**
 * Record HSM operation
 */
function recordHSMOperation(operation, provider, success, latencySeconds) {
    exports.hsmOperationsTotal.inc({
        operation,
        provider,
        status: success ? 'success' : 'failure',
    });
    exports.hsmOperationLatency.observe({ operation, provider }, latencySeconds);
}
/**
 * Record compliance assessment
 */
function recordComplianceAssessment(tenantId, framework, status, latencySeconds) {
    exports.complianceAssessmentsTotal.inc({
        tenant_id: tenantId,
        framework,
        status,
    });
    if (status === 'failed') {
        exports.complianceAssessmentFailures.inc({
            tenant_id: tenantId,
            framework,
            failure_reason: 'assessment_error',
        });
    }
    if (latencySeconds !== undefined && status === 'completed') {
        exports.complianceAssessmentLatency.observe({ framework }, latencySeconds);
    }
}
/**
 * Get all v4 rollout metrics
 */
async function getV4Metrics() {
    return exports.v4MetricsRegistry.metrics();
}
/**
 * Initialize default metric values
 */
function initializeMetrics() {
    // Initialize HSM service as up
    exports.hsmServiceUp.set({ provider: 'software' }, 1);
    // Initialize database pool metrics
    exports.dbConnectionsMax.set(10);
    exports.dbConnectionsActive.set(0);
    // Initialize explanation cache hit ratio
    exports.aiExplanationsCacheHitRatio.set(0);
    console.log('[Metrics] v4 rollout metrics initialized');
}

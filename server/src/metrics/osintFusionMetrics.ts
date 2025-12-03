/**
 * OSINT Fusion Prometheus Metrics
 *
 * Provides observability for multi-source intelligence fusion operations.
 */

import { Counter, Histogram, Gauge, Registry } from 'prom-client';

// Use default registry or create new one
const registry = new Registry();

// ============================================================================
// Counters
// ============================================================================

/**
 * Total fusion requests
 */
export const osintFusionRequestsTotal = new Counter({
  name: 'osint_fusion_requests_total',
  help: 'Total number of OSINT fusion requests',
  labelNames: ['status', 'source_count'],
  registers: [registry],
});

/**
 * Total entities extracted
 */
export const osintEntitiesExtractedTotal = new Counter({
  name: 'osint_entities_extracted_total',
  help: 'Total number of entities extracted from OSINT sources',
  labelNames: ['entity_type', 'source_type'],
  registers: [registry],
});

/**
 * Total entities validated
 */
export const osintEntitiesValidatedTotal = new Counter({
  name: 'osint_entities_validated_total',
  help: 'Total number of entities validated',
  labelNames: ['result', 'risk_level'],
  registers: [registry],
});

/**
 * Hallucination detections
 */
export const osintHallucinationDetectionsTotal = new Counter({
  name: 'osint_hallucination_detections_total',
  help: 'Total number of hallucinated entities detected and rejected',
  labelNames: ['check_type'],
  registers: [registry],
});

/**
 * Source connector requests
 */
export const osintSourceRequestsTotal = new Counter({
  name: 'osint_source_requests_total',
  help: 'Total number of requests to OSINT source connectors',
  labelNames: ['source_type', 'status'],
  registers: [registry],
});

/**
 * Graph traversal operations
 */
export const osintGraphTraversalsTotal = new Counter({
  name: 'osint_graph_traversals_total',
  help: 'Total number of graph traversal operations',
  labelNames: ['operation', 'status'],
  registers: [registry],
});

/**
 * Relationships inferred
 */
export const osintRelationshipsInferredTotal = new Counter({
  name: 'osint_relationships_inferred_total',
  help: 'Total number of relationships inferred',
  labelNames: ['relationship_type'],
  registers: [registry],
});

// ============================================================================
// Histograms
// ============================================================================

/**
 * Fusion request latency
 */
export const osintFusionLatencyMs = new Histogram({
  name: 'osint_fusion_latency_ms',
  help: 'Latency of OSINT fusion requests in milliseconds',
  labelNames: ['source_count'],
  buckets: [100, 250, 500, 1000, 1500, 2000, 3000, 5000, 10000],
  registers: [registry],
});

/**
 * Source connector latency
 */
export const osintSourceLatencyMs = new Histogram({
  name: 'osint_source_latency_ms',
  help: 'Latency of OSINT source connector requests in milliseconds',
  labelNames: ['source_type'],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000],
  registers: [registry],
});

/**
 * Graph traversal latency
 */
export const osintGraphTraversalLatencyMs = new Histogram({
  name: 'osint_graph_traversal_latency_ms',
  help: 'Latency of graph traversal operations in milliseconds',
  labelNames: ['operation', 'depth'],
  buckets: [10, 50, 100, 250, 500, 1000, 2000],
  registers: [registry],
});

/**
 * Validation latency
 */
export const osintValidationLatencyMs = new Histogram({
  name: 'osint_validation_latency_ms',
  help: 'Latency of entity validation in milliseconds',
  labelNames: ['validator'],
  buckets: [5, 10, 25, 50, 100, 250, 500],
  registers: [registry],
});

/**
 * Entity confidence distribution
 */
export const osintEntityConfidence = new Histogram({
  name: 'osint_entity_confidence',
  help: 'Distribution of entity confidence scores',
  labelNames: ['entity_type'],
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  registers: [registry],
});

// ============================================================================
// Gauges
// ============================================================================

/**
 * Current validation rate
 */
export const osintValidationRate = new Gauge({
  name: 'osint_validation_rate',
  help: 'Current validation rate (passed / total)',
  registers: [registry],
});

/**
 * Cache hit rate
 */
export const osintCacheHitRate = new Gauge({
  name: 'osint_cache_hit_rate',
  help: 'Current cache hit rate for graph traversals',
  registers: [registry],
});

/**
 * Active fusion requests
 */
export const osintActiveFusionRequests = new Gauge({
  name: 'osint_active_fusion_requests',
  help: 'Number of currently active fusion requests',
  registers: [registry],
});

/**
 * Source connector health
 */
export const osintSourceConnectorHealth = new Gauge({
  name: 'osint_source_connector_health',
  help: 'Health status of OSINT source connectors (1=healthy, 0=unhealthy)',
  labelNames: ['source_type'],
  registers: [registry],
});

/**
 * Rate limit remaining
 */
export const osintSourceRateLimitRemaining = new Gauge({
  name: 'osint_source_rate_limit_remaining',
  help: 'Remaining rate limit for source connectors',
  labelNames: ['source_type'],
  registers: [registry],
});

/**
 * Graph node count
 */
export const osintGraphNodeCount = new Gauge({
  name: 'osint_graph_node_count',
  help: 'Total number of OSINT entities in the graph',
  labelNames: ['entity_type'],
  registers: [registry],
});

/**
 * Graph edge count
 */
export const osintGraphEdgeCount = new Gauge({
  name: 'osint_graph_edge_count',
  help: 'Total number of OSINT relationships in the graph',
  labelNames: ['relationship_type'],
  registers: [registry],
});

/**
 * P95 latency gauge
 */
export const osintP95LatencyMs = new Gauge({
  name: 'osint_p95_latency_ms',
  help: 'P95 latency for fusion requests in milliseconds',
  registers: [registry],
});

/**
 * P99 latency gauge
 */
export const osintP99LatencyMs = new Gauge({
  name: 'osint_p99_latency_ms',
  help: 'P99 latency for fusion requests in milliseconds',
  registers: [registry],
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Record a fusion request
 */
export function recordFusionRequest(
  status: 'success' | 'failure',
  sourceCount: number,
  latencyMs: number,
): void {
  osintFusionRequestsTotal.inc({ status, source_count: String(sourceCount) });
  osintFusionLatencyMs.observe({ source_count: String(sourceCount) }, latencyMs);
}

/**
 * Record entity extraction
 */
export function recordEntityExtraction(
  entityType: string,
  sourceType: string,
  count: number = 1,
): void {
  osintEntitiesExtractedTotal.inc(
    { entity_type: entityType, source_type: sourceType },
    count,
  );
}

/**
 * Record entity validation
 */
export function recordEntityValidation(
  passed: boolean,
  riskLevel: 'low' | 'medium' | 'high',
  latencyMs: number,
): void {
  osintEntitiesValidatedTotal.inc({
    result: passed ? 'passed' : 'failed',
    risk_level: riskLevel,
  });
  osintValidationLatencyMs.observe({ validator: 'hallucination_guard' }, latencyMs);
}

/**
 * Record hallucination detection
 */
export function recordHallucinationDetection(checkType: string): void {
  osintHallucinationDetectionsTotal.inc({ check_type: checkType });
}

/**
 * Record source connector request
 */
export function recordSourceRequest(
  sourceType: string,
  status: 'success' | 'failure',
  latencyMs: number,
): void {
  osintSourceRequestsTotal.inc({ source_type: sourceType, status });
  osintSourceLatencyMs.observe({ source_type: sourceType }, latencyMs);
}

/**
 * Record graph traversal
 */
export function recordGraphTraversal(
  operation: string,
  depth: number,
  status: 'success' | 'failure',
  latencyMs: number,
): void {
  osintGraphTraversalsTotal.inc({ operation, status });
  osintGraphTraversalLatencyMs.observe(
    { operation, depth: String(depth) },
    latencyMs,
  );
}

/**
 * Update validation rate gauge
 */
export function updateValidationRate(rate: number): void {
  osintValidationRate.set(rate);
}

/**
 * Update cache hit rate gauge
 */
export function updateCacheHitRate(rate: number): void {
  osintCacheHitRate.set(rate);
}

/**
 * Update source connector health
 */
export function updateSourceHealth(
  sourceType: string,
  healthy: boolean,
): void {
  osintSourceConnectorHealth.set({ source_type: sourceType }, healthy ? 1 : 0);
}

/**
 * Update rate limit remaining
 */
export function updateRateLimitRemaining(
  sourceType: string,
  remaining: number,
): void {
  osintSourceRateLimitRemaining.set({ source_type: sourceType }, remaining);
}

/**
 * Update P95/P99 latency
 */
export function updateLatencyPercentiles(p95: number, p99: number): void {
  osintP95LatencyMs.set(p95);
  osintP99LatencyMs.set(p99);
}

/**
 * Record entity confidence
 */
export function recordEntityConfidence(
  entityType: string,
  confidence: number,
): void {
  osintEntityConfidence.observe({ entity_type: entityType }, confidence);
}

/**
 * Record relationship inference
 */
export function recordRelationshipInference(
  relationshipType: string,
  count: number = 1,
): void {
  osintRelationshipsInferredTotal.inc({ relationship_type: relationshipType }, count);
}

/**
 * Get all metrics
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

/**
 * Get metrics registry
 */
export function getRegistry(): Registry {
  return registry;
}

export default {
  // Counters
  osintFusionRequestsTotal,
  osintEntitiesExtractedTotal,
  osintEntitiesValidatedTotal,
  osintHallucinationDetectionsTotal,
  osintSourceRequestsTotal,
  osintGraphTraversalsTotal,
  osintRelationshipsInferredTotal,

  // Histograms
  osintFusionLatencyMs,
  osintSourceLatencyMs,
  osintGraphTraversalLatencyMs,
  osintValidationLatencyMs,
  osintEntityConfidence,

  // Gauges
  osintValidationRate,
  osintCacheHitRate,
  osintActiveFusionRequests,
  osintSourceConnectorHealth,
  osintSourceRateLimitRemaining,
  osintGraphNodeCount,
  osintGraphEdgeCount,
  osintP95LatencyMs,
  osintP99LatencyMs,

  // Helper functions
  recordFusionRequest,
  recordEntityExtraction,
  recordEntityValidation,
  recordHallucinationDetection,
  recordSourceRequest,
  recordGraphTraversal,
  updateValidationRate,
  updateCacheHitRate,
  updateSourceHealth,
  updateRateLimitRemaining,
  updateLatencyPercentiles,
  recordEntityConfidence,
  recordRelationshipInference,
  getMetrics,
  getRegistry,
};

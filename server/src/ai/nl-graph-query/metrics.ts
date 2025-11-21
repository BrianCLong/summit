/**
 * NL Graph Query Copilot - Metrics
 * Prometheus metrics for monitoring query compilation performance
 */

import client from 'prom-client';

// Query compilation metrics
export const nlQueryCompilationsTotal = new client.Counter({
  name: 'nl_graph_query_compilations_total',
  help: 'Total number of NL to Cypher query compilations',
  labelNames: ['status', 'pattern', 'cost_class'],
});

export const nlQueryCompilationLatencySeconds = new client.Histogram({
  name: 'nl_graph_query_compilation_latency_seconds',
  help: 'Time taken to compile NL queries to Cypher',
  labelNames: ['pattern', 'cached'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

export const nlQueryCostEstimateNodes = new client.Histogram({
  name: 'nl_graph_query_cost_estimate_nodes',
  help: 'Estimated number of nodes to be scanned by compiled queries',
  labelNames: ['cost_class'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000],
});

export const nlQueryCostEstimateEdges = new client.Histogram({
  name: 'nl_graph_query_cost_estimate_edges',
  help: 'Estimated number of edges to be scanned by compiled queries',
  labelNames: ['cost_class'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000],
});

export const nlQueryCacheSize = new client.Gauge({
  name: 'nl_graph_query_cache_size',
  help: 'Current number of cached query compilations',
});

export const nlQueryCacheHits = new client.Counter({
  name: 'nl_graph_query_cache_hits_total',
  help: 'Total number of cache hits for query compilations',
});

export const nlQueryCacheMisses = new client.Counter({
  name: 'nl_graph_query_cache_misses_total',
  help: 'Total number of cache misses for query compilations',
});

export const nlQueryPatternMatches = new client.Counter({
  name: 'nl_graph_query_pattern_matches_total',
  help: 'Number of times each query pattern was matched',
  labelNames: ['pattern'],
});

export const nlQueryValidationErrors = new client.Counter({
  name: 'nl_graph_query_validation_errors_total',
  help: 'Total number of validation errors by type',
  labelNames: ['error_type'],
});

export const nlQuerySafetyBlocks = new client.Counter({
  name: 'nl_graph_query_safety_blocks_total',
  help: 'Total number of queries blocked for safety reasons',
  labelNames: ['reason'],
});

export const nlQueryWarnings = new client.Counter({
  name: 'nl_graph_query_warnings_total',
  help: 'Total number of warnings generated during compilation',
  labelNames: ['warning_type'],
});

/**
 * Record a successful compilation with metrics
 */
export function recordCompilationSuccess(
  pattern: string,
  costClass: string,
  latencyMs: number,
  cached: boolean,
  nodesScanned: number,
  edgesScanned: number,
): void {
  nlQueryCompilationsTotal.inc({ status: 'success', pattern, cost_class: costClass });
  nlQueryCompilationLatencySeconds.observe(
    { pattern, cached: cached ? 'true' : 'false' },
    latencyMs / 1000,
  );
  nlQueryCostEstimateNodes.observe({ cost_class: costClass }, nodesScanned);
  nlQueryCostEstimateEdges.observe({ cost_class: costClass }, edgesScanned);
  nlQueryPatternMatches.inc({ pattern });
}

/**
 * Record a compilation failure with metrics
 */
export function recordCompilationError(errorCode: string, latencyMs: number): void {
  nlQueryCompilationsTotal.inc({
    status: 'error',
    pattern: 'none',
    cost_class: 'none',
  });
  nlQueryCompilationLatencySeconds.observe(
    { pattern: 'error', cached: 'false' },
    latencyMs / 1000,
  );
  nlQueryValidationErrors.inc({ error_type: errorCode });
}

/**
 * Record cache hit
 */
export function recordCacheHit(): void {
  nlQueryCacheHits.inc();
}

/**
 * Record cache miss
 */
export function recordCacheMiss(): void {
  nlQueryCacheMisses.inc();
}

/**
 * Update cache size gauge
 */
export function updateCacheSize(size: number): void {
  nlQueryCacheSize.set(size);
}

/**
 * Record safety block
 */
export function recordSafetyBlock(reason: string): void {
  nlQuerySafetyBlocks.inc({ reason });
}

/**
 * Record warning
 */
export function recordWarning(warningType: string): void {
  nlQueryWarnings.inc({ warning_type: warningType });
}

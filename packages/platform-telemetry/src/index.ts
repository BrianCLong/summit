/**
 * @summit/platform-telemetry
 *
 * Unified telemetry SDK for Summit platform.
 * Implements Prompts 31-32: Metrics Taxonomy and Distributed Tracing
 *
 * Features:
 * - Standardized metrics taxonomy with Prometheus export
 * - OpenTelemetry-based distributed tracing
 * - Pre-configured instrumentations for common libraries
 * - Summit-specific span attributes and conventions
 */

// Metrics exports
export * from './metrics/taxonomy.js';
export * from './metrics/registry.js';

// Tracing exports
export * from './tracing/tracer.js';

// Re-export commonly used types
export {
  MetricsTaxonomy,
  StandardLabels,
  HTTPMetrics,
  DatabaseMetrics,
  GraphMetrics,
  CacheMetrics,
  BusinessMetrics,
  RuntimeMetrics,
  getAllMetrics,
  getMetricByName,
} from './metrics/taxonomy.js';

export {
  MetricsRegistry,
  getMetricsRegistry,
  httpMetrics,
  dbMetrics,
  cacheMetrics,
} from './metrics/registry.js';

export {
  initializeTracing,
  shutdownTracing,
  getTracer,
  createSpan,
  withSpan,
  setSpanAttributes,
  recordSpanError,
  getTraceContext,
  extractTraceContext,
  traced,
  Trace,
  spans,
  SummitAttributes,
} from './tracing/tracer.js';

// Convenience initialization
import type { TracingConfig } from './tracing/tracer.js';
import type { MetricsConfig } from './metrics/registry.js';
import { initializeTracing } from './tracing/tracer.js';
import { getMetricsRegistry } from './metrics/registry.js';

export interface TelemetryConfig {
  tracing: Partial<TracingConfig>;
  metrics: Partial<MetricsConfig>;
}

/**
 * Initialize all telemetry systems
 */
export function initializeTelemetry(config: Partial<TelemetryConfig> = {}): {
  tracer: ReturnType<typeof initializeTracing>;
  metrics: ReturnType<typeof getMetricsRegistry>;
} {
  const tracer = config.tracing ? initializeTracing(config.tracing) : null;
  const metrics = getMetricsRegistry(config.metrics);

  return {
    tracer: tracer as ReturnType<typeof initializeTracing>,
    metrics,
  };
}

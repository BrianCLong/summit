/**
 * Observability Module
 *
 * Provides OpenTelemetry tracing and Prometheus metrics infrastructure
 * that can be dropped into any service for comprehensive monitoring.
 *
 * Features:
 * - OpenTelemetry distributed tracing
 * - RED metrics (Rate, Errors, Duration)
 * - USE metrics (Utilization, Saturation, Errors)
 * - Standardized helpers for common operations
 * - Automatic instrumentation
 *
 * @module observability
 */

// Tracing exports
export {
  tracer,
  TracingService,
} from './tracing';

export type {
  TracingConfig,
  SpanOptions,
} from './tracing';

// Metrics exports
export {
  createStandardMetrics,
  REDMetrics,
  USEMetrics,
} from './standard-metrics';

export type {
  MetricsConfig,
} from './standard-metrics';

// Legacy exports (for backwards compatibility)
export * from './telemetry';
export * from './metrics';
export * from './http-metrics-middleware';
export * from './request-context';

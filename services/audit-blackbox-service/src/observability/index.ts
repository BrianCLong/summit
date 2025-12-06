/**
 * Observability Module
 *
 * Exports telemetry, health checks, and monitoring components.
 */

// Telemetry
export {
  TelemetryManager,
  TelemetryConfig,
  AuditSpanAttributes,
  initializeTelemetry,
  getTelemetry,
  shutdownTelemetry,
} from './telemetry.js';

// Health checks
export {
  HealthChecker,
  HealthCheckerConfig,
  HealthStatus,
  ComponentHealth,
  SystemHealth,
  HealthCheckFn,
  createStandardHealthChecks,
  createHealthHandlers,
} from './health.js';

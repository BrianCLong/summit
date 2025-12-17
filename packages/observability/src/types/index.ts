/**
 * CompanyOS Observability SDK - Core Types
 *
 * These types define the observability contract that all services must follow.
 */

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

export interface ServiceConfig {
  /** Unique service name (e.g., 'api-gateway', 'user-service') */
  name: string;
  /** Service version (semver) */
  version: string;
  /** Deployment environment */
  environment: 'development' | 'staging' | 'production';
  /** Kubernetes namespace (if applicable) */
  namespace?: string;
  /** Team owning the service */
  team?: string;
  /** Service tier for prioritization */
  tier?: 'critical' | 'standard' | 'background';
}

// =============================================================================
// METRIC TYPES
// =============================================================================

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricDefinition {
  name: string;
  help: string;
  type: MetricType;
  labels?: string[];
  buckets?: number[];
}

/** Standard label set for all metrics */
export interface StandardLabels {
  service: string;
  environment: string;
  version: string;
  instance?: string;
}

/** HTTP request labels */
export interface HttpLabels extends StandardLabels {
  method: string;
  route: string;
  status_code: string;
}

/** Database operation labels */
export interface DatabaseLabels extends StandardLabels {
  db_system: 'postgresql' | 'neo4j' | 'redis' | 'mongodb';
  operation: string;
  status: 'success' | 'error';
}

/** Queue/Worker labels */
export interface QueueLabels extends StandardLabels {
  queue: string;
  job_type: string;
  status: 'completed' | 'failed' | 'retried';
}

/** Cache labels */
export interface CacheLabels extends StandardLabels {
  cache_name: string;
  result: 'hit' | 'miss';
}

// =============================================================================
// LOGGING TYPES
// =============================================================================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  /** Trace ID for distributed tracing correlation */
  traceId?: string;
  /** Span ID for distributed tracing correlation */
  spanId?: string;
  /** Request ID for request tracking */
  requestId?: string;
  /** User ID (if authenticated) */
  userId?: string;
  /** Tenant ID (for multi-tenant systems) */
  tenantId?: string;
  /** Additional context */
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  version: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration_ms?: number;
  [key: string]: unknown;
}

/** Fields that must be redacted from logs */
export const REDACTED_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'sessionId',
  'session_id',
  'creditCard',
  'credit_card',
  'ssn',
  'privateKey',
  'private_key',
] as const;

// =============================================================================
// TRACING TYPES
// =============================================================================

export type SpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
}

export interface SpanAttributes {
  [key: string]: string | number | boolean | string[] | number[] | boolean[];
}

export interface TracingConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  /** OTLP endpoint for trace export */
  otlpEndpoint?: string;
  /** Jaeger endpoint (legacy) */
  jaegerEndpoint?: string;
  /** Sample rate 0.0 - 1.0 */
  sampleRate: number;
  /** Propagation formats */
  propagators: ('w3c' | 'b3' | 'jaeger')[];
}

// =============================================================================
// SLO TYPES
// =============================================================================

export type SloType = 'availability' | 'latency' | 'throughput' | 'correctness';

export interface SloDefinition {
  /** SLO name */
  name: string;
  /** SLO type */
  type: SloType;
  /** Target percentage (e.g., 99.9) */
  target: number;
  /** Window in days */
  window: number;
  /** Description */
  description: string;
  /** Service Level Indicator (PromQL) */
  sli: {
    /** Good events metric/query */
    good: string;
    /** Total events metric/query */
    total: string;
  };
  /** Alert configuration */
  alerts?: {
    burnRate: number;
    severity: 'critical' | 'warning' | 'info';
    window: string;
  }[];
}

export interface ErrorBudget {
  /** Total budget percentage */
  total: number;
  /** Remaining budget percentage */
  remaining: number;
  /** Consumed budget percentage */
  consumed: number;
  /** Time remaining in window (seconds) */
  windowRemaining: number;
  /** Current burn rate (multiples of allowed rate) */
  burnRate: number;
  /** Status based on burn rate */
  status: 'healthy' | 'warning' | 'critical' | 'exhausted';
}

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  latency_ms?: number;
  message?: string;
  lastCheck?: string;
}

export interface HealthReport {
  status: HealthStatus;
  service: string;
  version: string;
  uptime_seconds: number;
  checks: HealthCheck[];
  timestamp: string;
}

// =============================================================================
// SERVICE ARCHETYPES
// =============================================================================

/**
 * Service archetypes define standard observability patterns for common service types.
 * Each archetype has pre-defined metrics, SLOs, and dashboard panels.
 */
export type ServiceArchetype =
  | 'api-service'      // REST/GraphQL APIs
  | 'worker-service'   // Background job processors
  | 'gateway-service'  // API gateways, load balancers
  | 'data-pipeline'    // ETL, streaming processors
  | 'storage-service'  // Database proxies, caches
  | 'ml-service';      // ML inference services

export interface ArchetypeConfig {
  archetype: ServiceArchetype;
  /** SLO targets for this archetype */
  sloTargets: {
    availability: number;
    latency_p99_ms: number;
    latency_p95_ms?: number;
  };
  /** Required metrics for this archetype */
  requiredMetrics: string[];
  /** Required health checks */
  requiredHealthChecks: string[];
}

// =============================================================================
// AUDIT & SECURITY TYPES
// =============================================================================

export interface AuditEvent {
  /** Event type */
  type: 'auth' | 'access' | 'mutation' | 'admin' | 'security';
  /** Action performed */
  action: string;
  /** Actor (user/service) */
  actor: {
    type: 'user' | 'service' | 'system';
    id: string;
    ip?: string;
  };
  /** Target resource */
  resource: {
    type: string;
    id: string;
  };
  /** Outcome */
  outcome: 'success' | 'failure' | 'denied';
  /** Timestamp */
  timestamp: string;
  /** Request context */
  context: {
    traceId?: string;
    requestId?: string;
    tenantId?: string;
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// OBSERVABILITY CONTRACT
// =============================================================================

/**
 * The ObservabilityContract defines everything a compliant service must implement.
 * Use this as a checklist when onboarding new services.
 */
export interface ObservabilityContract {
  /** Service configuration */
  service: ServiceConfig;
  /** Service archetype */
  archetype: ServiceArchetype;
  /** Metrics configuration */
  metrics: {
    enabled: boolean;
    endpoint: string;
    interval_ms: number;
  };
  /** Logging configuration */
  logging: {
    level: LogLevel;
    structured: boolean;
    traceCorrelation: boolean;
  };
  /** Tracing configuration */
  tracing: TracingConfig;
  /** Health check configuration */
  health: {
    endpoint: string;
    checks: string[];
  };
  /** SLO definitions */
  slos: SloDefinition[];
}

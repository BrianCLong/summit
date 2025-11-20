/**
 * Standardized Prometheus Metrics Helpers
 *
 * Implements RED (Rate, Errors, Duration) and USE (Utilization, Saturation, Errors) methodologies
 * for comprehensive observability.
 *
 * RED Method (for request-driven services):
 *   - Rate: Requests per second
 *   - Errors: Failed requests per second
 *   - Duration: Latency distribution
 *
 * USE Method (for resource monitoring):
 *   - Utilization: % time resource is busy
 *   - Saturation: Queue depth or work pending
 *   - Errors: Error count
 *
 * Usage:
 *   import { redMetrics, useMetrics } from '@/observability/standard-metrics';
 *
 *   // RED metrics for HTTP requests
 *   const stopTimer = redMetrics.http.startTimer({ method: 'GET', route: '/api/users' });
 *   try {
 *     const result = await fetchUsers();
 *     redMetrics.http.recordSuccess({ method: 'GET', route: '/api/users' });
 *     return result;
 *   } catch (error) {
 *     redMetrics.http.recordError({ method: 'GET', route: '/api/users', error: error.name });
 *     throw error;
 *   } finally {
 *     stopTimer({ status: 'success' });
 *   }
 */

import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';
import pino from 'pino';

const logger = pino({ name: 'observability:metrics' });

export interface MetricsConfig {
  enabled: boolean;
  prefix: string;
  defaultLabels: Record<string, string>;
}

/**
 * RED Metrics for Request-Driven Services
 */
export class REDMetrics {
  private registry: Registry;
  private config: MetricsConfig;

  // HTTP metrics
  public httpRequestRate: Counter;
  public httpErrorRate: Counter;
  public httpRequestDuration: Histogram;

  // GraphQL metrics
  public graphqlRequestRate: Counter;
  public graphqlErrorRate: Counter;
  public graphqlRequestDuration: Histogram;
  public graphqlResolverDuration: Histogram;

  // Database metrics
  public dbQueryRate: Counter;
  public dbQueryErrorRate: Counter;
  public dbQueryDuration: Histogram;

  constructor(registry: Registry, config: Partial<MetricsConfig> = {}) {
    this.registry = registry;
    this.config = {
      enabled: config.enabled ?? true,
      prefix: config.prefix || 'intelgraph',
      defaultLabels: config.defaultLabels || {},
    };

    // HTTP RED metrics
    this.httpRequestRate = new Counter({
      name: `${this.config.prefix}_http_requests_total`,
      help: 'Total number of HTTP requests (Rate)',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpErrorRate = new Counter({
      name: `${this.config.prefix}_http_errors_total`,
      help: 'Total number of HTTP errors (Errors)',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: `${this.config.prefix}_http_request_duration_seconds`,
      help: 'HTTP request duration in seconds (Duration)',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 1.5, 2, 5, 10],
      registers: [this.registry],
    });

    // GraphQL RED metrics
    this.graphqlRequestRate = new Counter({
      name: `${this.config.prefix}_graphql_requests_total`,
      help: 'Total number of GraphQL requests (Rate)',
      labelNames: ['operation_name', 'operation_type'],
      registers: [this.registry],
    });

    this.graphqlErrorRate = new Counter({
      name: `${this.config.prefix}_graphql_errors_total`,
      help: 'Total number of GraphQL errors (Errors)',
      labelNames: ['operation_name', 'error_type'],
      registers: [this.registry],
    });

    this.graphqlRequestDuration = new Histogram({
      name: `${this.config.prefix}_graphql_request_duration_seconds`,
      help: 'GraphQL request duration in seconds (Duration)',
      labelNames: ['operation_name', 'operation_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 1.5, 2, 5, 10],
      registers: [this.registry],
    });

    this.graphqlResolverDuration = new Histogram({
      name: `${this.config.prefix}_graphql_resolver_duration_seconds`,
      help: 'GraphQL resolver duration in seconds',
      labelNames: ['type_name', 'field_name'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    // Database RED metrics
    this.dbQueryRate = new Counter({
      name: `${this.config.prefix}_db_queries_total`,
      help: 'Total number of database queries (Rate)',
      labelNames: ['db_type', 'operation'],
      registers: [this.registry],
    });

    this.dbQueryErrorRate = new Counter({
      name: `${this.config.prefix}_db_query_errors_total`,
      help: 'Total number of database query errors (Errors)',
      labelNames: ['db_type', 'operation', 'error_type'],
      registers: [this.registry],
    });

    this.dbQueryDuration = new Histogram({
      name: `${this.config.prefix}_db_query_duration_seconds`,
      help: 'Database query duration in seconds (Duration)',
      labelNames: ['db_type', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.registry],
    });
  }

  /**
   * HTTP request helpers
   */
  http = {
    startTimer: (labels: { method: string; route: string }) => {
      return this.httpRequestDuration.startTimer(labels);
    },

    recordSuccess: (labels: { method: string; route: string; status_code?: number }) => {
      this.httpRequestRate.inc({
        method: labels.method,
        route: labels.route,
        status_code: String(labels.status_code || 200),
      });
    },

    recordError: (labels: { method: string; route: string; error_type: string }) => {
      this.httpErrorRate.inc(labels);
      this.httpRequestRate.inc({
        method: labels.method,
        route: labels.route,
        status_code: '500',
      });
    },
  };

  /**
   * GraphQL request helpers
   */
  graphql = {
    startTimer: (labels: { operation_name: string; operation_type: string }) => {
      return this.graphqlRequestDuration.startTimer(labels);
    },

    startResolverTimer: (labels: { type_name: string; field_name: string }) => {
      return this.graphqlResolverDuration.startTimer(labels);
    },

    recordSuccess: (labels: { operation_name: string; operation_type: string }) => {
      this.graphqlRequestRate.inc(labels);
    },

    recordError: (labels: { operation_name: string; error_type: string }) => {
      this.graphqlErrorRate.inc(labels);
    },
  };

  /**
   * Database query helpers
   */
  database = {
    startTimer: (labels: { db_type: string; operation: string }) => {
      return this.dbQueryDuration.startTimer(labels);
    },

    recordSuccess: (labels: { db_type: string; operation: string }) => {
      this.dbQueryRate.inc(labels);
    },

    recordError: (labels: { db_type: string; operation: string; error_type: string }) => {
      this.dbQueryErrorRate.inc(labels);
      this.dbQueryRate.inc({
        db_type: labels.db_type,
        operation: labels.operation,
      });
    },
  };
}

/**
 * USE Metrics for Resource Monitoring
 */
export class USEMetrics {
  private registry: Registry;
  private config: MetricsConfig;

  // Utilization metrics
  public cpuUtilization: Gauge;
  public memoryUtilization: Gauge;
  public dbConnectionUtilization: Gauge;
  public threadPoolUtilization: Gauge;

  // Saturation metrics
  public requestQueueDepth: Gauge;
  public dbConnectionQueueDepth: Gauge;
  public jobQueueDepth: Gauge;
  public backpressureEvents: Counter;

  // Error metrics
  public systemErrors: Counter;
  public resourceErrors: Counter;

  // Latency percentiles
  public latencyP50: Summary;
  public latencyP95: Summary;
  public latencyP99: Summary;

  constructor(registry: Registry, config: Partial<MetricsConfig> = {}) {
    this.registry = registry;
    this.config = {
      enabled: config.enabled ?? true,
      prefix: config.prefix || 'intelgraph',
      defaultLabels: config.defaultLabels || {},
    };

    // Utilization metrics (% busy)
    this.cpuUtilization = new Gauge({
      name: `${this.config.prefix}_cpu_utilization_percent`,
      help: 'CPU utilization percentage (Utilization)',
      registers: [this.registry],
    });

    this.memoryUtilization = new Gauge({
      name: `${this.config.prefix}_memory_utilization_percent`,
      help: 'Memory utilization percentage (Utilization)',
      registers: [this.registry],
    });

    this.dbConnectionUtilization = new Gauge({
      name: `${this.config.prefix}_db_connection_utilization_percent`,
      help: 'Database connection pool utilization (Utilization)',
      labelNames: ['db_type', 'pool_name'],
      registers: [this.registry],
    });

    this.threadPoolUtilization = new Gauge({
      name: `${this.config.prefix}_thread_pool_utilization_percent`,
      help: 'Thread pool utilization percentage (Utilization)',
      labelNames: ['pool_name'],
      registers: [this.registry],
    });

    // Saturation metrics (queue depth)
    this.requestQueueDepth = new Gauge({
      name: `${this.config.prefix}_request_queue_depth`,
      help: 'Number of requests waiting to be processed (Saturation)',
      labelNames: ['queue_type'],
      registers: [this.registry],
    });

    this.dbConnectionQueueDepth = new Gauge({
      name: `${this.config.prefix}_db_connection_queue_depth`,
      help: 'Number of requests waiting for DB connection (Saturation)',
      labelNames: ['db_type'],
      registers: [this.registry],
    });

    this.jobQueueDepth = new Gauge({
      name: `${this.config.prefix}_job_queue_depth`,
      help: 'Number of jobs waiting in queue (Saturation)',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });

    this.backpressureEvents = new Counter({
      name: `${this.config.prefix}_backpressure_events_total`,
      help: 'Total backpressure events (Saturation)',
      labelNames: ['resource_type'],
      registers: [this.registry],
    });

    // Error metrics
    this.systemErrors = new Counter({
      name: `${this.config.prefix}_system_errors_total`,
      help: 'Total system errors (Errors)',
      labelNames: ['error_type', 'subsystem'],
      registers: [this.registry],
    });

    this.resourceErrors = new Counter({
      name: `${this.config.prefix}_resource_errors_total`,
      help: 'Total resource errors (Errors)',
      labelNames: ['resource_type', 'error_type'],
      registers: [this.registry],
    });

    // Latency percentiles (SLI metrics)
    this.latencyP50 = new Summary({
      name: `${this.config.prefix}_latency_p50_seconds`,
      help: 'P50 latency in seconds',
      labelNames: ['operation_type'],
      percentiles: [0.5],
      registers: [this.registry],
    });

    this.latencyP95 = new Summary({
      name: `${this.config.prefix}_latency_p95_seconds`,
      help: 'P95 latency in seconds (SLO target)',
      labelNames: ['operation_type'],
      percentiles: [0.95],
      registers: [this.registry],
    });

    this.latencyP99 = new Summary({
      name: `${this.config.prefix}_latency_p99_seconds`,
      help: 'P99 latency in seconds',
      labelNames: ['operation_type'],
      percentiles: [0.99],
      registers: [this.registry],
    });
  }

  /**
   * Record utilization percentage
   */
  recordUtilization(
    metric: 'cpu' | 'memory' | 'db_connection' | 'thread_pool',
    value: number,
    labels?: Record<string, string>,
  ): void {
    switch (metric) {
      case 'cpu':
        this.cpuUtilization.set(value);
        break;
      case 'memory':
        this.memoryUtilization.set(value);
        break;
      case 'db_connection':
        this.dbConnectionUtilization.set(labels || {}, value);
        break;
      case 'thread_pool':
        this.threadPoolUtilization.set(labels || {}, value);
        break;
    }
  }

  /**
   * Record saturation (queue depth)
   */
  recordSaturation(
    metric: 'request' | 'db_connection' | 'job',
    value: number,
    labels?: Record<string, string>,
  ): void {
    switch (metric) {
      case 'request':
        this.requestQueueDepth.set(labels || {}, value);
        break;
      case 'db_connection':
        this.dbConnectionQueueDepth.set(labels || {}, value);
        break;
      case 'job':
        this.jobQueueDepth.set(labels || {}, value);
        break;
    }
  }

  /**
   * Record latency for percentile tracking
   */
  recordLatency(operationType: string, durationSeconds: number): void {
    this.latencyP50.observe({ operation_type: operationType }, durationSeconds);
    this.latencyP95.observe({ operation_type: operationType }, durationSeconds);
    this.latencyP99.observe({ operation_type: operationType }, durationSeconds);
  }

  /**
   * Record backpressure event
   */
  recordBackpressure(resourceType: string): void {
    this.backpressureEvents.inc({ resource_type: resourceType });
  }

  /**
   * Record system error
   */
  recordSystemError(errorType: string, subsystem: string): void {
    this.systemErrors.inc({ error_type: errorType, subsystem });
  }

  /**
   * Record resource error
   */
  recordResourceError(resourceType: string, errorType: string): void {
    this.resourceErrors.inc({ resource_type: resourceType, error_type: errorType });
  }
}

/**
 * Create standardized metrics instances
 */
export function createStandardMetrics(
  registry: Registry,
  config?: Partial<MetricsConfig>,
): { red: REDMetrics; use: USEMetrics } {
  const red = new REDMetrics(registry, config);
  const use = new USEMetrics(registry, config);

  logger.info({ prefix: config?.prefix || 'intelgraph' }, 'Standard metrics initialized');

  return { red, use };
}

// Export types
export type { MetricsConfig };

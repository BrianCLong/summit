/**
 * @fileoverview Enhanced Observability Configuration
 *
 * Production-grade observability setup with:
 * - Structured logging with correlation IDs
 * - Custom metrics collection
 * - Health check endpoints
 * - SLO/SLI tracking
 * - Alert threshold configuration
 *
 * @module monitoring/EnhancedObservability
 */

import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Observability configuration interface
 */
export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  metrics: {
    enabled: boolean;
    prefix: string;
    defaultLabels: Record<string, string>;
    collectDefaultMetrics: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    correlationIdHeader: string;
  };
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
  };
  slo: {
    availability: number;
    latencyP99: number;
    errorRate: number;
  };
}

/**
 * Default observability configuration
 */
const defaultConfig: ObservabilityConfig = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  metrics: {
    enabled: true,
    prefix: 'intelgraph_',
    defaultLabels: {},
    collectDefaultMetrics: true,
  },
  logging: {
    level: (process.env.LOG_LEVEL as ObservabilityConfig['logging']['level']) || 'info',
    format: 'json',
    correlationIdHeader: 'x-correlation-id',
  },
  healthCheck: {
    path: '/health',
    interval: 30000,
    timeout: 5000,
  },
  slo: {
    availability: 99.9,
    latencyP99: 500,
    errorRate: 0.1,
  },
};

/**
 * Structured Logger class
 */
export class StructuredLogger {
  private serviceName: string;
  private environment: string;
  private level: string;

  constructor(config: ObservabilityConfig) {
    this.serviceName = config.serviceName;
    this.environment = config.environment;
    this.level = config.logging.level;
  }

  private formatMessage(
    level: string,
    message: string,
    context?: Record<string, unknown>
  ): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.serviceName,
      environment: this.environment,
      message,
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (['debug'].includes(this.level)) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (['debug', 'info'].includes(this.level)) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (['debug', 'info', 'warn'].includes(this.level)) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(this.formatMessage('error', message, context));
  }

  child(defaultContext: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

/**
 * Child Logger with default context
 */
class ChildLogger {
  constructor(
    private parent: StructuredLogger,
    private defaultContext: Record<string, unknown>
  ) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.parent.debug(message, { ...this.defaultContext, ...context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.parent.info(message, { ...this.defaultContext, ...context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.parent.warn(message, { ...this.defaultContext, ...context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.parent.error(message, { ...this.defaultContext, ...context });
  }
}

/**
 * Enhanced Metrics Collector
 */
export class MetricsCollector {
  private registry: Registry;
  private config: ObservabilityConfig;

  // HTTP Metrics
  public httpRequestsTotal: Counter;
  public httpRequestDuration: Histogram;
  public httpRequestSize: Histogram;
  public httpResponseSize: Histogram;
  public activeConnections: Gauge;

  // GraphQL Metrics
  public graphqlOperationsTotal: Counter;
  public graphqlOperationDuration: Histogram;
  public graphqlErrors: Counter;
  public graphqlDepth: Histogram;

  // Database Metrics
  public dbConnectionsActive: Gauge;
  public dbConnectionsIdle: Gauge;
  public dbQueryDuration: Histogram;
  public dbQueryErrors: Counter;

  // Cache Metrics
  public cacheHits: Counter;
  public cacheMisses: Counter;
  public cacheSize: Gauge;

  // Business Metrics
  public entitiesCreated: Counter;
  public relationshipsCreated: Counter;
  public investigationsActive: Gauge;
  public aiRequestsTotal: Counter;
  public aiRequestDuration: Histogram;

  // SLO Metrics
  public sloAvailability: Gauge;
  public sloLatencyBudget: Gauge;
  public sloErrorBudget: Gauge;

  constructor(config: ObservabilityConfig = defaultConfig) {
    this.config = config;
    this.registry = new Registry();

    if (config.metrics.defaultLabels) {
      this.registry.setDefaultLabels(config.metrics.defaultLabels);
    }

    if (config.metrics.collectDefaultMetrics) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: config.metrics.prefix,
      });
    }

    // Initialize all metrics
    this.httpRequestsTotal = new Counter({
      name: `${config.metrics.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status', 'tenant'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: `${config.metrics.prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestSize = new Histogram({
      name: `${config.metrics.prefix}http_request_size_bytes`,
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'path'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    this.httpResponseSize = new Histogram({
      name: `${config.metrics.prefix}http_response_size_bytes`,
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'path', 'status'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: `${config.metrics.prefix}http_active_connections`,
      help: 'Number of active HTTP connections',
      registers: [this.registry],
    });

    // GraphQL Metrics
    this.graphqlOperationsTotal = new Counter({
      name: `${config.metrics.prefix}graphql_operations_total`,
      help: 'Total GraphQL operations',
      labelNames: ['operation', 'type', 'status'],
      registers: [this.registry],
    });

    this.graphqlOperationDuration = new Histogram({
      name: `${config.metrics.prefix}graphql_operation_duration_seconds`,
      help: 'GraphQL operation duration in seconds',
      labelNames: ['operation', 'type'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.graphqlErrors = new Counter({
      name: `${config.metrics.prefix}graphql_errors_total`,
      help: 'Total GraphQL errors',
      labelNames: ['operation', 'error_type'],
      registers: [this.registry],
    });

    this.graphqlDepth = new Histogram({
      name: `${config.metrics.prefix}graphql_query_depth`,
      help: 'GraphQL query depth',
      labelNames: ['operation'],
      buckets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      registers: [this.registry],
    });

    // Database Metrics
    this.dbConnectionsActive = new Gauge({
      name: `${config.metrics.prefix}db_connections_active`,
      help: 'Active database connections',
      labelNames: ['database'],
      registers: [this.registry],
    });

    this.dbConnectionsIdle = new Gauge({
      name: `${config.metrics.prefix}db_connections_idle`,
      help: 'Idle database connections',
      labelNames: ['database'],
      registers: [this.registry],
    });

    this.dbQueryDuration = new Histogram({
      name: `${config.metrics.prefix}db_query_duration_seconds`,
      help: 'Database query duration in seconds',
      labelNames: ['database', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });

    this.dbQueryErrors = new Counter({
      name: `${config.metrics.prefix}db_query_errors_total`,
      help: 'Total database query errors',
      labelNames: ['database', 'operation', 'error_type'],
      registers: [this.registry],
    });

    // Cache Metrics
    this.cacheHits = new Counter({
      name: `${config.metrics.prefix}cache_hits_total`,
      help: 'Total cache hits',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: `${config.metrics.prefix}cache_misses_total`,
      help: 'Total cache misses',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry],
    });

    this.cacheSize = new Gauge({
      name: `${config.metrics.prefix}cache_size_bytes`,
      help: 'Current cache size in bytes',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    // Business Metrics
    this.entitiesCreated = new Counter({
      name: `${config.metrics.prefix}entities_created_total`,
      help: 'Total entities created',
      labelNames: ['type', 'tenant'],
      registers: [this.registry],
    });

    this.relationshipsCreated = new Counter({
      name: `${config.metrics.prefix}relationships_created_total`,
      help: 'Total relationships created',
      labelNames: ['type', 'tenant'],
      registers: [this.registry],
    });

    this.investigationsActive = new Gauge({
      name: `${config.metrics.prefix}investigations_active`,
      help: 'Number of active investigations',
      labelNames: ['status', 'tenant'],
      registers: [this.registry],
    });

    this.aiRequestsTotal = new Counter({
      name: `${config.metrics.prefix}ai_requests_total`,
      help: 'Total AI/ML requests',
      labelNames: ['model', 'operation', 'status'],
      registers: [this.registry],
    });

    this.aiRequestDuration = new Histogram({
      name: `${config.metrics.prefix}ai_request_duration_seconds`,
      help: 'AI/ML request duration in seconds',
      labelNames: ['model', 'operation'],
      buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
      registers: [this.registry],
    });

    // SLO Metrics
    this.sloAvailability = new Gauge({
      name: `${config.metrics.prefix}slo_availability_percent`,
      help: 'Current availability percentage',
      registers: [this.registry],
    });

    this.sloLatencyBudget = new Gauge({
      name: `${config.metrics.prefix}slo_latency_budget_remaining`,
      help: 'Remaining latency error budget',
      registers: [this.registry],
    });

    this.sloErrorBudget = new Gauge({
      name: `${config.metrics.prefix}slo_error_budget_remaining`,
      help: 'Remaining error budget',
      registers: [this.registry],
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJSON(): Promise<object> {
    return this.registry.getMetricsAsJSON();
  }

  /**
   * HTTP request tracking middleware
   */
  httpMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const start = process.hrtime.bigint();
      const requestSize = parseInt(req.get('content-length') || '0');

      this.activeConnections.inc();

      if (requestSize > 0) {
        this.httpRequestSize.observe(
          { method: req.method, path: this.normalizePath(req.path) },
          requestSize
        );
      }

      const originalEnd = res.end;
      const self = this;

      res.end = function (this: Response, ...args: Parameters<Response['end']>): Response {
        const duration = Number(process.hrtime.bigint() - start) / 1e9;
        const normalizedPath = self.normalizePath(req.path);
        const tenant = req.headers['x-tenant-id']?.toString() || 'default';

        self.httpRequestsTotal.inc({
          method: req.method,
          path: normalizedPath,
          status: res.statusCode.toString(),
          tenant,
        });

        self.httpRequestDuration.observe(
          { method: req.method, path: normalizedPath, status: res.statusCode.toString() },
          duration
        );

        const responseSize = parseInt(res.get('content-length') || '0');
        if (responseSize > 0) {
          self.httpResponseSize.observe(
            { method: req.method, path: normalizedPath, status: res.statusCode.toString() },
            responseSize
          );
        }

        self.activeConnections.dec();

        return originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * Normalize path for metrics (replace IDs with placeholders)
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .split('?')[0];
  }
}

/**
 * Health Check Manager
 */
export class HealthCheckManager {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private config: ObservabilityConfig;
  private logger: StructuredLogger;

  constructor(config: ObservabilityConfig = defaultConfig) {
    this.config = config;
    this.logger = new StructuredLogger(config);
  }

  /**
   * Register a health check
   */
  registerCheck(name: string, check: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async runChecks(): Promise<HealthCheckResponse> {
    const results: Record<string, HealthCheckResult> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [name, check] of this.checks) {
      try {
        const timeoutPromise = new Promise<HealthCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), this.config.healthCheck.timeout)
        );

        results[name] = await Promise.race([check(), timeoutPromise]);

        if (results[name].status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (results[name].status === 'degraded' && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: this.config.serviceName,
      version: this.config.serviceVersion,
      checks: results,
    };
  }

  /**
   * Health check endpoint middleware
   */
  middleware(): (req: Request, res: Response) => Promise<void> {
    return async (req: Request, res: Response): Promise<void> => {
      const health = await this.runChecks();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);
    };
  }
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  checks: Record<string, HealthCheckResult>;
}

/**
 * Correlation ID middleware
 */
export function correlationIdMiddleware(
  headerName: string = 'x-correlation-id'
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = req.get(headerName) || crypto.randomUUID();

    // Attach to request for use in logging
    (req as any).correlationId = correlationId;

    // Set response header
    res.setHeader(headerName, correlationId);

    next();
  };
}

/**
 * Create default observability setup
 */
export function createObservabilitySetup(
  config: Partial<ObservabilityConfig> = {}
): {
  logger: StructuredLogger;
  metrics: MetricsCollector;
  healthCheck: HealthCheckManager;
} {
  const mergedConfig = { ...defaultConfig, ...config };

  return {
    logger: new StructuredLogger(mergedConfig),
    metrics: new MetricsCollector(mergedConfig),
    healthCheck: new HealthCheckManager(mergedConfig),
  };
}

// Export default instances
export const observability = createObservabilitySetup();

export default observability;

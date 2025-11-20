/**
 * Deployment Metrics Middleware
 *
 * Tracks deployment-related metrics for monitoring and observability.
 * Integrates with Prometheus, Datadog, or custom metrics backends.
 *
 * @module middleware/deployment-metrics
 */

import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

/**
 * Deployment metrics configuration
 */
export interface DeploymentMetricsConfig {
  enabled: boolean;
  prefix?: string;
  labels?: Record<string, string>;
}

/**
 * Deployment Metrics class
 *
 * Provides comprehensive metrics for deployments, feature flags, and health monitoring.
 */
export class DeploymentMetrics {
  private registry: Registry;
  private enabled: boolean;
  private prefix: string;

  // Deployment metrics
  private deploymentCounter: Counter;
  private deploymentDuration: Histogram;
  private deploymentStatus: Gauge;

  // Feature flag metrics
  private featureFlagEvaluations: Counter;
  private featureFlagCacheHits: Counter;
  private featureFlagCacheMisses: Counter;

  // Health check metrics
  private healthCheckDuration: Histogram;
  private healthCheckStatus: Gauge;

  // Release metrics
  private releaseCounter: Counter;
  private rollbackCounter: Counter;

  // API metrics
  private requestDuration: Histogram;
  private requestCounter: Counter;
  private errorCounter: Counter;

  constructor(config: DeploymentMetricsConfig) {
    this.enabled = config.enabled;
    this.prefix = config.prefix || 'intelgraph_';
    this.registry = new Registry();

    if (!this.enabled) {
      return;
    }

    this.initializeMetrics(config.labels || {});
  }

  /**
   * Initialize all metrics
   *
   * @private
   */
  private initializeMetrics(defaultLabels: Record<string, string>): void {
    // Set default labels (environment, version, etc.)
    this.registry.setDefaultLabels(defaultLabels);

    // Deployment metrics
    this.deploymentCounter = new Counter({
      name: `${this.prefix}deployments_total`,
      help: 'Total number of deployments',
      labelNames: ['environment', 'status', 'strategy'],
      registers: [this.registry],
    });

    this.deploymentDuration = new Histogram({
      name: `${this.prefix}deployment_duration_seconds`,
      help: 'Deployment duration in seconds',
      labelNames: ['environment', 'strategy'],
      buckets: [10, 30, 60, 120, 300, 600, 1800],
      registers: [this.registry],
    });

    this.deploymentStatus = new Gauge({
      name: `${this.prefix}deployment_status`,
      help: 'Current deployment status (1 = success, 0 = failure)',
      labelNames: ['environment'],
      registers: [this.registry],
    });

    // Feature flag metrics
    this.featureFlagEvaluations = new Counter({
      name: `${this.prefix}feature_flag_evaluations_total`,
      help: 'Total number of feature flag evaluations',
      labelNames: ['flag_key', 'result'],
      registers: [this.registry],
    });

    this.featureFlagCacheHits = new Counter({
      name: `${this.prefix}feature_flag_cache_hits_total`,
      help: 'Total number of feature flag cache hits',
      registers: [this.registry],
    });

    this.featureFlagCacheMisses = new Counter({
      name: `${this.prefix}feature_flag_cache_misses_total`,
      help: 'Total number of feature flag cache misses',
      registers: [this.registry],
    });

    // Health check metrics
    this.healthCheckDuration = new Histogram({
      name: `${this.prefix}health_check_duration_seconds`,
      help: 'Health check duration in seconds',
      labelNames: ['check_name', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.healthCheckStatus = new Gauge({
      name: `${this.prefix}health_check_status`,
      help: 'Health check status (1 = healthy, 0 = unhealthy)',
      labelNames: ['check_name'],
      registers: [this.registry],
    });

    // Release metrics
    this.releaseCounter = new Counter({
      name: `${this.prefix}releases_total`,
      help: 'Total number of releases',
      labelNames: ['type', 'branch'],
      registers: [this.registry],
    });

    this.rollbackCounter = new Counter({
      name: `${this.prefix}rollbacks_total`,
      help: 'Total number of rollbacks',
      labelNames: ['environment', 'reason'],
      registers: [this.registry],
    });

    // API metrics
    this.requestDuration = new Histogram({
      name: `${this.prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.requestCounter = new Counter({
      name: `${this.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.errorCounter = new Counter({
      name: `${this.prefix}errors_total`,
      help: 'Total number of errors',
      labelNames: ['type', 'code'],
      registers: [this.registry],
    });
  }

  /**
   * Record a deployment
   */
  recordDeployment(
    environment: string,
    status: 'success' | 'failure',
    strategy: string,
    durationSeconds: number
  ): void {
    if (!this.enabled) return;

    this.deploymentCounter.inc({ environment, status, strategy });
    this.deploymentDuration.observe({ environment, strategy }, durationSeconds);
    this.deploymentStatus.set({ environment }, status === 'success' ? 1 : 0);
  }

  /**
   * Record a feature flag evaluation
   */
  recordFeatureFlagEvaluation(flagKey: string, result: string | boolean): void {
    if (!this.enabled) return;

    this.featureFlagEvaluations.inc({
      flag_key: flagKey,
      result: String(result),
    });
  }

  /**
   * Record feature flag cache hit
   */
  recordFeatureFlagCacheHit(): void {
    if (!this.enabled) return;
    this.featureFlagCacheHits.inc();
  }

  /**
   * Record feature flag cache miss
   */
  recordFeatureFlagCacheMiss(): void {
    if (!this.enabled) return;
    this.featureFlagCacheMisses.inc();
  }

  /**
   * Record a health check
   */
  recordHealthCheck(
    checkName: string,
    status: 'healthy' | 'unhealthy',
    durationSeconds: number
  ): void {
    if (!this.enabled) return;

    this.healthCheckDuration.observe({ check_name: checkName, status }, durationSeconds);
    this.healthCheckStatus.set({ check_name: checkName }, status === 'healthy' ? 1 : 0);
  }

  /**
   * Record a release
   */
  recordRelease(type: 'major' | 'minor' | 'patch', branch: string): void {
    if (!this.enabled) return;
    this.releaseCounter.inc({ type, branch });
  }

  /**
   * Record a rollback
   */
  recordRollback(environment: string, reason: string): void {
    if (!this.enabled) return;
    this.rollbackCounter.inc({ environment, reason });
  }

  /**
   * Record an HTTP request
   */
  recordRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number
  ): void {
    if (!this.enabled) return;

    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };

    this.requestDuration.observe(labels, durationSeconds);
    this.requestCounter.inc(labels);
  }

  /**
   * Record an error
   */
  recordError(type: string, code?: string): void {
    if (!this.enabled) return;
    this.errorCounter.inc({ type, code: code || 'unknown' });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    if (!this.enabled) return '';
    return this.registry.metrics();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    if (!this.enabled) return;
    this.registry.resetMetrics();
  }

  /**
   * Get the Prometheus registry
   */
  getRegistry(): Registry {
    return this.registry;
  }
}

/**
 * Express middleware for request metrics
 */
export function requestMetricsMiddleware(metrics: DeploymentMetrics) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!metrics) {
      return next();
    }

    const start = Date.now();

    // Capture response
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;

      metrics.recordRequest(req.method, route, res.statusCode, duration);

      // Record errors for 5xx status codes
      if (res.statusCode >= 500) {
        metrics.recordError('http_error', res.statusCode.toString());
      }
    });

    next();
  };
}

/**
 * Create and configure deployment metrics
 */
export function createDeploymentMetrics(
  config: Partial<DeploymentMetricsConfig> = {}
): DeploymentMetrics {
  const defaultConfig: DeploymentMetricsConfig = {
    enabled: process.env.METRICS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    prefix: 'intelgraph_',
    labels: {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || 'unknown',
      service: 'intelgraph-api',
    },
  };

  return new DeploymentMetrics({ ...defaultConfig, ...config });
}

// Singleton instance
let metricsInstance: DeploymentMetrics | null = null;

/**
 * Get or create metrics instance
 */
export function getMetrics(): DeploymentMetrics {
  if (!metricsInstance) {
    metricsInstance = createDeploymentMetrics();
  }
  return metricsInstance;
}

/**
 * Reset metrics instance (for testing)
 */
export function resetMetrics(): void {
  if (metricsInstance) {
    metricsInstance.reset();
  }
  metricsInstance = null;
}

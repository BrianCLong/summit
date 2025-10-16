/**
 * OTEL spans and Prometheus metrics for Safe Mutations system
 * Comprehensive observability for budget enforcement, rate limiting, and rollbacks
 */

import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { metrics } from '@opentelemetry/api';
import { register, Counter, Histogram, Gauge } from 'prom-client';
import logger from '../utils/logger';

// OTEL tracer for safe mutations
const tracer = trace.getTracer('intelgraph-safe-mutations', '1.0.0');

// Prometheus metrics
const budgetDenialsTotal = new Counter({
  name: 'budget_denials_total',
  help: 'Total number of budget denials by reason, tenant, provider, and model',
  labelNames: ['reason', 'tenant', 'provider', 'model', 'field_name'],
  registers: [register],
});

const tokenEstimationErrorRatio = new Histogram({
  name: 'token_estimation_error_ratio',
  help: 'Ratio of actual to estimated tokens (for accuracy tracking)',
  buckets: [0.5, 0.7, 0.9, 1.0, 1.1, 1.3, 1.5, 2.0, 3.0],
  labelNames: ['provider', 'model', 'estimation_method'],
  registers: [register],
});

const rollbackEventsTotal = new Counter({
  name: 'rollback_events_total',
  help: 'Total number of rollback events by reason and type',
  labelNames: ['reason', 'type', 'tenant', 'operation'],
  registers: [register],
});

const mutationLatencyMs = new Histogram({
  name: 'mutation_latency_ms',
  help: 'Latency of safe mutations in milliseconds',
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
  labelNames: ['mutation', 'tenant', 'success'],
  registers: [register],
});

const rateLimitHitsTotal = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits by tenant and operation',
  labelNames: ['tenant', 'operation', 'bucket_type'],
  registers: [register],
});

const activeTokenBuckets = new Gauge({
  name: 'active_token_buckets_total',
  help: 'Number of active token buckets',
  labelNames: ['bucket_type'],
  registers: [register],
});

const compensationLogSize = new Gauge({
  name: 'compensation_log_size',
  help: 'Number of entries in compensation log',
  labelNames: ['status'],
  registers: [register],
});

const tokenCacheHitRate = new Histogram({
  name: 'token_cache_hit_rate',
  help: 'Token counting cache hit rate',
  buckets: [0.0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0],
  registers: [register],
});

const budgetUsageRatio = new Histogram({
  name: 'budget_usage_ratio',
  help: 'Ratio of used to total budget per tenant',
  buckets: [0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0],
  labelNames: ['tenant', 'time_window'],
  registers: [register],
});

/**
 * OTEL span utilities for safe mutations
 */
export class SafeMutationTracing {
  /**
   * Create a span for GraphQL budget enforcement
   */
  static async withBudgetSpan<T>(
    fieldName: string,
    operation: (span: any) => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return tracer.startActiveSpan(
      `graphql.budget.${fieldName}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'graphql.field.name': fieldName,
          'mutation.type': 'safe_mutation',
          ...attributes,
        },
      },
      async (span) => {
        const startTime = Date.now();

        try {
          const result = await operation(span);

          span.setStatus({ code: SpanStatusCode.OK });
          span.setAttributes({
            'mutation.success': true,
            'mutation.duration_ms': Date.now() - startTime,
          });

          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: errorMessage,
          });

          span.setAttributes({
            'mutation.success': false,
            'mutation.duration_ms': Date.now() - startTime,
            'error.type':
              error instanceof Error ? error.constructor.name : 'Unknown',
            'error.message': errorMessage,
          });

          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Create a span for token counting operations
   */
  static async withTokenCountSpan<T>(
    provider: string,
    model: string,
    operation: (span: any) => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return tracer.startActiveSpan(
      `tokcount.estimate`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'tokcount.provider': provider,
          'tokcount.model': model,
          ...attributes,
        },
      },
      async (span) => {
        try {
          const result = await operation(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Create a span for rate limiting operations
   */
  static async withRateLimitSpan<T>(
    tenant: string,
    operation: string,
    operationFn: (span: any) => Promise<T>,
  ): Promise<T> {
    return tracer.startActiveSpan(
      `ratelimit.check`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'ratelimit.tenant': tenant,
          'ratelimit.operation': operation,
        },
      },
      operationFn,
    );
  }

  /**
   * Create a span for compensation log operations
   */
  static async withCompensationSpan<T>(
    correlationId: string,
    operationType: string,
    operation: (span: any) => Promise<T>,
  ): Promise<T> {
    return tracer.startActiveSpan(
      `compensation.${operationType}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'compensation.correlation_id': correlationId,
          'compensation.operation_type': operationType,
        },
      },
      operation,
    );
  }
}

/**
 * Metrics collection utilities
 */
export class SafeMutationMetrics {
  /**
   * Record a budget denial
   */
  static recordBudgetDenial(
    reason: 'token_ceiling' | 'cap_usd',
    tenant: string,
    provider: string,
    model: string,
    fieldName: string,
  ): void {
    budgetDenialsTotal.inc({
      reason,
      tenant,
      provider,
      model,
      field_name: fieldName,
    });

    logger.warn('Budget denial recorded', {
      reason,
      tenant,
      provider,
      model,
      fieldName,
    });
  }

  /**
   * Record token estimation accuracy
   */
  static recordTokenEstimationAccuracy(
    provider: string,
    model: string,
    estimationMethod: string,
    actualTokens: number,
    estimatedTokens: number,
  ): void {
    const ratio = actualTokens / Math.max(estimatedTokens, 1);
    tokenEstimationErrorRatio
      .labels({ provider, model, estimation_method: estimationMethod })
      .observe(ratio);
  }

  /**
   * Record rollback event
   */
  static recordRollback(
    reason: 'mutation_failed' | 'manual_rollback' | 'compensation_failure',
    type: 'automatic' | 'manual',
    tenant: string,
    operation: string,
  ): void {
    rollbackEventsTotal.inc({ reason, type, tenant, operation });

    logger.warn('Rollback event recorded', {
      reason,
      type,
      tenant,
      operation,
    });
  }

  /**
   * Record mutation latency
   */
  static recordMutationLatency(
    mutation: string,
    tenant: string,
    durationMs: number,
    success: boolean,
  ): void {
    mutationLatencyMs
      .labels({ mutation, tenant, success: success.toString() })
      .observe(durationMs);
  }

  /**
   * Record rate limit hit
   */
  static recordRateLimitHit(
    tenant: string,
    operation: string,
    bucketType: 'token_bucket' | 'request_limit',
  ): void {
    rateLimitHitsTotal.inc({ tenant, operation, bucket_type: bucketType });
  }

  /**
   * Update active token buckets count
   */
  static updateActiveTokenBuckets(count: number, bucketType: string): void {
    activeTokenBuckets.labels({ bucket_type: bucketType }).set(count);
  }

  /**
   * Update compensation log size
   */
  static updateCompensationLogSize(count: number, status: string): void {
    compensationLogSize.labels({ status }).set(count);
  }

  /**
   * Record token cache performance
   */
  static recordTokenCacheHit(hitRate: number): void {
    tokenCacheHitRate.observe(hitRate);
  }

  /**
   * Record budget usage ratio
   */
  static recordBudgetUsage(
    tenant: string,
    usedBudget: number,
    totalBudget: number,
    timeWindow: 'hourly' | 'daily' | 'monthly',
  ): void {
    const ratio = usedBudget / Math.max(totalBudget, 1);
    budgetUsageRatio.labels({ tenant, time_window: timeWindow }).observe(ratio);
  }

  /**
   * Get current metrics snapshot for debugging
   */
  static async getMetricsSnapshot(): Promise<{
    budgetDenials: number;
    rollbackEvents: number;
    rateLimitHits: number;
    activeTokenBuckets: number;
  }> {
    try {
      // This is a simplified snapshot - in production, you'd query the actual metric values
      return {
        budgetDenials: 0, // budgetDenialsTotal.get() // Not directly available
        rollbackEvents: 0,
        rateLimitHits: 0,
        activeTokenBuckets: 0,
      };
    } catch (error) {
      logger.error('Failed to get metrics snapshot', { error });
      return {
        budgetDenials: -1,
        rollbackEvents: -1,
        rateLimitHits: -1,
        activeTokenBuckets: -1,
      };
    }
  }

  /**
   * Health check for metrics system
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    metrics: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const metricNames: string[] = [];

    try {
      // Check if metrics are registered
      const registeredMetrics = register.getMetricsAsArray();
      for (const metric of registeredMetrics) {
        if (
          metric.name.startsWith('budget_') ||
          metric.name.startsWith('token_') ||
          metric.name.startsWith('rollback_') ||
          metric.name.startsWith('mutation_') ||
          metric.name.startsWith('rate_limit_') ||
          metric.name.startsWith('compensation_')
        ) {
          metricNames.push(metric.name);
        }
      }

      if (metricNames.length === 0) {
        errors.push('No safe mutation metrics found in registry');
      }

      return {
        healthy: errors.length === 0,
        metrics: metricNames,
        errors,
      };
    } catch (error) {
      errors.push(
        `Metrics health check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        healthy: false,
        metrics: metricNames,
        errors,
      };
    }
  }
}

/**
 * Middleware to automatically add metrics to GraphQL context
 */
export function createMetricsContext() {
  return {
    metrics: {
      budget_denials_total: {
        inc: (labels: {
          reason: string;
          tenant?: string;
          provider?: string;
          model?: string;
          field_name?: string;
        }) => {
          SafeMutationMetrics.recordBudgetDenial(
            labels.reason as any,
            labels.tenant || 'unknown',
            labels.provider || 'unknown',
            labels.model || 'unknown',
            labels.field_name || 'unknown',
          );
        },
      },
      token_estimation_error_ratio: {
        observe: (ratio: number) => {
          // This would be called with more context in real usage
          tokenEstimationErrorRatio
            .labels({
              provider: 'unknown',
              model: 'unknown',
              estimation_method: 'unknown',
            })
            .observe(ratio);
        },
      },
    },
    tracing: SafeMutationTracing,
  };
}

/**
 * Export metrics for Prometheus scraping
 */
export async function getPrometheusMetrics(): Promise<string> {
  try {
    return await register.metrics();
  } catch (error) {
    logger.error('Failed to export Prometheus metrics', { error });
    return '';
  }
}

/**
 * Background job to collect periodic metrics
 */
export class MetricsCollector {
  private intervalId: NodeJS.Timeout | null = null;
  private collectionIntervalMs: number;

  constructor(collectionIntervalMs: number = 60000) {
    // Default: 1 minute
    this.collectionIntervalMs = collectionIntervalMs;
  }

  /**
   * Start periodic metrics collection
   */
  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Metrics collection failed', { error });
      }
    }, this.collectionIntervalMs);

    logger.info('Metrics collector started', {
      intervalMs: this.collectionIntervalMs,
    });
  }

  /**
   * Stop periodic metrics collection
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Metrics collector stopped');
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<void> {
    // This would integrate with your Redis, Neo4j, and other systems
    // to collect real-time metrics

    try {
      // Example: collect token cache stats
      // const cacheStats = getCacheStats();
      // SafeMutationMetrics.recordTokenCacheHit(cacheStats.hitRate);

      // Example: collect active buckets from Redis
      // const bucketStats = await redisBucket.getGlobalStats();
      // SafeMutationMetrics.updateActiveTokenBuckets(bucketStats.activeBuckets, 'redis');

      // Example: collect compensation log size from Neo4j
      // const compensationStats = await compensationManager.getStats();
      // SafeMutationMetrics.updateCompensationLogSize(compensationStats.totalEntries, 'all');

      logger.debug('Metrics collection completed');
    } catch (error) {
      logger.error('Error during metrics collection', { error });
    }
  }
}

// Global metrics collector instance
let globalMetricsCollector: MetricsCollector | null = null;

export function startMetricsCollection(intervalMs?: number): MetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new MetricsCollector(intervalMs);
  }

  globalMetricsCollector.start();
  return globalMetricsCollector;
}

export function stopMetricsCollection(): void {
  if (globalMetricsCollector) {
    globalMetricsCollector.stop();
  }
}

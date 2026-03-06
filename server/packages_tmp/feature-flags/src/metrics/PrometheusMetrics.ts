/**
 * Prometheus Metrics Implementation
 *
 * Prometheus metrics for feature flag operations
 */

import { Registry, Counter, Histogram } from 'prom-client';
import type { FlagMetrics } from '../types.js';

/**
 * Prometheus metrics configuration
 */
export interface PrometheusMetricsConfig {
  /** Metrics registry */
  registry?: Registry;
  /** Metric prefix */
  prefix?: string;
  /** Enable default metrics */
  enableDefaultMetrics?: boolean;
}

/**
 * Prometheus-based feature flag metrics
 */
export class PrometheusMetrics implements FlagMetrics {
  private registry: Registry;
  private prefix: string;

  // Metrics
  private evaluationCounter: Counter;
  private evaluationDuration: Histogram;
  private cacheHitCounter: Counter;
  private cacheMissCounter: Counter;
  private errorCounter: Counter;

  constructor(config: PrometheusMetricsConfig = {}) {
    this.registry = config.registry ?? new Registry();
    this.prefix = config.prefix ?? 'feature_flags_';

    // Initialize metrics
    this.evaluationCounter = new Counter({
      name: `${this.prefix}evaluations_total`,
      help: 'Total number of feature flag evaluations',
      labelNames: ['flag_key', 'variation'],
      registers: [this.registry],
    });

    this.evaluationDuration = new Histogram({
      name: `${this.prefix}evaluation_duration_ms`,
      help: 'Duration of feature flag evaluations in milliseconds',
      labelNames: ['flag_key'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
      registers: [this.registry],
    });

    this.cacheHitCounter = new Counter({
      name: `${this.prefix}cache_hits_total`,
      help: 'Total number of cache hits',
      labelNames: ['flag_key'],
      registers: [this.registry],
    });

    this.cacheMissCounter = new Counter({
      name: `${this.prefix}cache_misses_total`,
      help: 'Total number of cache misses',
      labelNames: ['flag_key'],
      registers: [this.registry],
    });

    this.errorCounter = new Counter({
      name: `${this.prefix}errors_total`,
      help: 'Total number of errors during flag evaluation',
      labelNames: ['flag_key', 'error_type'],
      registers: [this.registry],
    });

    // Enable default metrics if requested
    if (config.enableDefaultMetrics) {
      this.registry.setDefaultLabels({
        service: 'feature-flags',
      });
    }
  }

  /**
   * Record flag evaluation
   */
  recordEvaluation(
    flagKey: string,
    variation: string,
    duration: number,
  ): void {
    this.evaluationCounter.inc({ flag_key: flagKey, variation });
    this.evaluationDuration.observe({ flag_key: flagKey }, duration);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(flagKey: string): void {
    this.cacheHitCounter.inc({ flag_key: flagKey });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(flagKey: string): void {
    this.cacheMissCounter.inc({ flag_key: flagKey });
  }

  /**
   * Record error
   */
  recordError(flagKey: string, error: Error): void {
    this.errorCounter.inc({
      flag_key: flagKey,
      error_type: error.constructor.name,
    });
  }

  /**
   * Get metrics registry
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Get metrics as string (for /metrics endpoint)
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

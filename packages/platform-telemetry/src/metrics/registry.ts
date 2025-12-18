/**
 * P31: Metrics Registry
 * Centralized metrics collection with Prometheus and OpenTelemetry support
 */

import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
  register as defaultRegister,
} from 'prom-client';
import type { MetricDefinition } from './taxonomy.js';
import { MetricsTaxonomy } from './taxonomy.js';

export interface MetricsConfig {
  prefix: string;
  defaultLabels: Record<string, string>;
  collectDefaultMetrics: boolean;
  defaultMetricsInterval: number;
}

const DEFAULT_CONFIG: MetricsConfig = {
  prefix: 'summit_',
  defaultLabels: {},
  collectDefaultMetrics: true,
  defaultMetricsInterval: 10000,
};

type MetricInstance = Counter | Gauge | Histogram;

/**
 * Metrics registry for Summit platform
 */
export class MetricsRegistry {
  private config: MetricsConfig;
  private registry: Registry;
  private metrics: Map<string, MetricInstance> = new Map();
  private initialized = false;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = new Registry();

    if (Object.keys(this.config.defaultLabels).length > 0) {
      this.registry.setDefaultLabels(this.config.defaultLabels);
    }
  }

  /**
   * Initialize the metrics registry
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Collect default Node.js metrics
    if (this.config.collectDefaultMetrics) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: this.config.prefix,
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      });
    }

    // Register all taxonomy metrics
    this.registerTaxonomyMetrics();

    this.initialized = true;
  }

  /**
   * Register all metrics from taxonomy
   */
  private registerTaxonomyMetrics(): void {
    for (const category of Object.values(MetricsTaxonomy)) {
      for (const metric of Object.values(category)) {
        this.registerMetric(metric);
      }
    }
  }

  /**
   * Register a single metric
   */
  registerMetric(definition: MetricDefinition): MetricInstance {
    const fullName = `${this.config.prefix}${definition.name}`;

    if (this.metrics.has(fullName)) {
      return this.metrics.get(fullName)!;
    }

    let metric: MetricInstance;

    switch (definition.type) {
      case 'counter':
        metric = new Counter({
          name: fullName,
          help: definition.description,
          labelNames: definition.labels,
          registers: [this.registry],
        });
        break;

      case 'gauge':
        metric = new Gauge({
          name: fullName,
          help: definition.description,
          labelNames: definition.labels,
          registers: [this.registry],
        });
        break;

      case 'histogram':
        metric = new Histogram({
          name: fullName,
          help: definition.description,
          labelNames: definition.labels,
          buckets: definition.buckets || [0.1, 0.5, 1, 2.5, 5, 10],
          registers: [this.registry],
        });
        break;

      case 'summary':
        // Use histogram as summary alternative
        metric = new Histogram({
          name: fullName,
          help: definition.description,
          labelNames: definition.labels,
          buckets: definition.buckets || [0.5, 0.9, 0.95, 0.99],
          registers: [this.registry],
        });
        break;

      default:
        throw new Error(`Unknown metric type: ${definition.type}`);
    }

    this.metrics.set(fullName, metric);
    return metric;
  }

  /**
   * Get a counter metric
   */
  counter(name: string): Counter | undefined {
    const fullName = `${this.config.prefix}${name}`;
    const metric = this.metrics.get(fullName);
    return metric instanceof Counter ? metric : undefined;
  }

  /**
   * Get a gauge metric
   */
  gauge(name: string): Gauge | undefined {
    const fullName = `${this.config.prefix}${name}`;
    const metric = this.metrics.get(fullName);
    return metric instanceof Gauge ? metric : undefined;
  }

  /**
   * Get a histogram metric
   */
  histogram(name: string): Histogram | undefined {
    const fullName = `${this.config.prefix}${name}`;
    const metric = this.metrics.get(fullName);
    return metric instanceof Histogram ? metric : undefined;
  }

  /**
   * Increment a counter
   */
  inc(name: string, labels: Record<string, string> = {}, value = 1): void {
    const counter = this.counter(name);
    if (counter) {
      counter.inc(labels, value);
    }
  }

  /**
   * Set a gauge value
   */
  set(name: string, labels: Record<string, string>, value: number): void {
    const gauge = this.gauge(name);
    if (gauge) {
      gauge.set(labels, value);
    }
  }

  /**
   * Observe a histogram value
   */
  observe(name: string, labels: Record<string, string>, value: number): void {
    const histogram = this.histogram(name);
    if (histogram) {
      histogram.observe(labels, value);
    }
  }

  /**
   * Start a timer for a histogram
   */
  startTimer(name: string, labels: Record<string, string> = {}): () => number {
    const histogram = this.histogram(name);
    if (histogram) {
      return histogram.startTimer(labels);
    }
    // Return a no-op timer
    const start = Date.now();
    return () => (Date.now() - start) / 1000;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics content type
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Get underlying registry
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.registry.resetMetrics();
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.registry.clear();
    this.metrics.clear();
    this.initialized = false;
  }
}

// Singleton instance
let defaultRegistry: MetricsRegistry | null = null;

/**
 * Get or create default metrics registry
 */
export function getMetricsRegistry(config?: Partial<MetricsConfig>): MetricsRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new MetricsRegistry(config);
    defaultRegistry.initialize();
  }
  return defaultRegistry;
}

/**
 * HTTP metrics helpers
 */
export const httpMetrics = {
  recordRequest(
    registry: MetricsRegistry,
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
  ): void {
    const labels = { method, path, status_code: String(statusCode) };
    registry.inc('http_requests_total', labels);
    registry.observe('http_request_duration_seconds', labels, durationMs / 1000);
  },

  incrementActiveRequests(registry: MetricsRegistry, method: string): void {
    registry.set('http_requests_active', { method }, 1);
  },

  decrementActiveRequests(registry: MetricsRegistry, method: string): void {
    registry.set('http_requests_active', { method }, -1);
  },
};

/**
 * Database metrics helpers
 */
export const dbMetrics = {
  recordQuery(
    registry: MetricsRegistry,
    database: string,
    operation: string,
    durationMs: number,
    error?: string
  ): void {
    const labels = { database, operation };
    registry.inc('db_queries_total', labels);
    registry.observe('db_query_duration_seconds', labels, durationMs / 1000);

    if (error) {
      registry.inc('db_query_errors_total', { ...labels, error_type: error });
    }
  },

  setConnectionPoolMetrics(
    registry: MetricsRegistry,
    database: string,
    size: number,
    active: number,
    waiting: number
  ): void {
    registry.set('db_connection_pool_size', { database }, size);
    registry.set('db_connection_pool_active', { database }, active);
    registry.set('db_connection_pool_waiting', { database }, waiting);
  },
};

/**
 * Cache metrics helpers
 */
export const cacheMetrics = {
  recordHit(registry: MetricsRegistry, layer: string): void {
    registry.inc('cache_hits_total', { cache_layer: layer });
  },

  recordMiss(registry: MetricsRegistry, layer: string): void {
    registry.inc('cache_misses_total', { cache_layer: layer });
  },

  setHitRate(registry: MetricsRegistry, layer: string, rate: number): void {
    registry.set('cache_hit_rate', { cache_layer: layer }, rate);
  },

  setSize(registry: MetricsRegistry, layer: string, size: number): void {
    registry.set('cache_size', { cache_layer: layer }, size);
  },
};

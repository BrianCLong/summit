// @ts-nocheck

import { snapshotter } from './diagnostic-snapshotter.js';
import { otelService } from '../observability/otel';
import { metrics } from '../observability/metrics';
import {
  Meter,
  Counter,
  Histogram,
  UpDownCounter,
  ObservableGauge,
} from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import {
  MeterProvider,
} from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as os from 'os';
import os from 'os';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// @deprecated - Use server/src/lib/observability/ instead
class ComprehensiveTelemetry {
  private static instance: ComprehensiveTelemetry;
  private meter: Meter;
  // Performance counters
  public readonly subsystems: {
      database: { queries: Counter; errors: Counter; latency: Histogram };
      cache: { hits: Counter; misses: Counter; sets: Counter; dels: Counter };
      api: { requests: Counter; errors: Counter };
  };
  public readonly subsystems: any;

  // Request/response timing
  public readonly requestDuration: Histogram;

  // Resource utilization
  private cpuUsage: ObservableGauge;
  private memoryUsage: ObservableGauge;
  private activeConnections: UpDownCounter;
  private previousCpuTime: { user: number; system: number; time: number } | null = null;

  private constructor() {
    const prometheusExporter = new PrometheusExporter({ port: 9464 });

    // In SDK 0.208+ or newer, readers are passed in constructor options
    const meterProvider = new MeterProvider({
        readers: [prometheusExporter]
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'intelgraph-server',
    });

    const prometheusExporter = new PrometheusExporter({ port: 9464 });
    const meterProvider = new MeterProvider({
      resource,
      readers: [prometheusExporter],
    });

    this.meter = meterProvider.getMeter('intelgraph-server-telemetry');

    this.subsystems = {
      database: {
        queries: this.createCounter('subsystem_database_queries_total', 'Total number of database queries'),
        errors: this.createCounter('subsystem_database_errors_total', 'Total number of database errors'),
        latency: this.createHistogram('subsystem_database_latency_seconds', 'Database query latency in seconds'),
      },
      cache: {
        hits: this.createCounter('subsystem_cache_hits_total', 'Total number of cache hits'),
        misses: this.createCounter('subsystem_cache_misses_total', 'Total number of cache misses'),
        sets: this.createCounter('subsystem_cache_sets_total', 'Total number of cache sets'),
        dels: this.createCounter('subsystem_cache_dels_total', 'Total number of cache deletes'),
      },
      api: {
        requests: this.createCounter('subsystem_api_requests_total', 'Total number of API requests'),
        errors: this.createCounter('subsystem_api_errors_total', 'Total number of API errors'),
      },
    };

    this.requestDuration = this.createHistogram('request_duration_seconds', 'Request duration in seconds');
    this.activeConnections = this.createUpDownCounter('active_connections', 'Number of active connections');

    // Initialize subsystems AFTER meter is ready
    this.subsystems = {
        database: {
          queries: this.createCounter('subsystem_database_queries_total', 'Total number of database queries'),
          errors: this.createCounter('subsystem_database_errors_total', 'Total number of database errors'),
          latency: this.createHistogram('subsystem_database_latency_seconds', 'Database query latency in seconds'),
        },
        cache: {
          hits: this.createCounter('subsystem_cache_hits_total', 'Total number of cache hits'),
          misses: this.createCounter('subsystem_cache_misses_total', 'Total number of cache misses'),
          sets: this.createCounter('subsystem_cache_sets_total', 'Total number of cache sets'),
          dels: this.createCounter('subsystem_cache_dels_total', 'Total number of cache deletes'),
        },
        api: {
          requests: this.createCounter('subsystem_api_requests_total', 'Total number of API requests'),
          errors: this.createCounter('subsystem_api_errors_total', 'Total number of API errors'),
        },
    };

    this.setupResourceUtilizationMetrics();
  public readonly requestDuration: any;
  private activeConnections: any;

  private constructor() {
    // Legacy support: Reuse the OTel service or create a bridged meter
    // For now, we stub this to prevent breaking existing consumers but direct them to new metrics
    // Ideally this class should be deleted and consumers migrated.

    // We create a dummy meter provider for backward compat if needed,
    // but really we should just point to the new registry.
    const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'intelgraph-server-legacy',
    });
    const meterProvider = new MeterProvider({ resource });
    this.meter = meterProvider.getMeter('intelgraph-server-telemetry-legacy');

    // Mocks to satisfy type checker while we migrate
    this.requestDuration = { record: () => {} };
    this.activeConnections = { add: () => {} };
    this.subsystems = {
        database: { queries: { add: () => {} }, errors: { add: () => {} }, latency: { record: () => {} } },
        cache: { hits: { add: () => {} }, misses: { add: () => {} }, sets: { add: () => {} }, dels: { add: () => {} } },
        api: { requests: { add: () => {} }, errors: { add: () => {} } }
    };
  }

  public static getInstance(): ComprehensiveTelemetry {
    if (!ComprehensiveTelemetry.instance) {
      ComprehensiveTelemetry.instance = new ComprehensiveTelemetry();
    }
    return ComprehensiveTelemetry.instance;
  }

  public recordRequest(duration: number, attributes: Record<string, string | number>) {
     // Forward to new metric
     metrics.httpRequestDuration.observe(attributes as any, duration);
  }

  public onMetric(listener: (metricName: string, value: number) => void) {
      // No-op or reimplement if critical
  }
}

export const telemetry = ComprehensiveTelemetry.getInstance();

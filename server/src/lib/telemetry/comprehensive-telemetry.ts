
import { snapshotter } from './diagnostic-snapshotter';
import {
  Meter,
  Counter,
  Histogram,
  UpDownCounter,
  ObservableGauge,
  metrics,
} from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import os from 'os';

class ComprehensiveTelemetry {
  private static instance: ComprehensiveTelemetry;
  private meter: Meter;

  // Performance counters
  public readonly subsystems = {
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

  // Request/response timing
  public readonly requestDuration: Histogram;
  public readonly ingestionDuration: Histogram;

  // Query Cost Guard Metrics
  public readonly queryCostEstimated: Histogram;
  public readonly slowQueriesKilled: Counter;

  // Resource utilization
  private cpuUsage: ObservableGauge;
  private memoryUsage: ObservableGauge;
  private activeConnections: UpDownCounter;
  private previousCpuTime: { user: number; system: number; time: number } | null = null;

  private constructor() {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'intelgraph-server',
    });

    const prometheusExporter = new PrometheusExporter({ port: 9464 });
    const meterProvider = new MeterProvider({ resource });
    meterProvider.addMetricReader(prometheusExporter);

    this.meter = meterProvider.getMeter('intelgraph-server-telemetry');

    this.requestDuration = this.createHistogram('request_duration_seconds', 'Request duration in seconds');
    this.ingestionDuration = this.createHistogram('ingestion_duration_seconds', 'End-to-end duration of data ingestion in seconds');
    this.activeConnections = this.createUpDownCounter('active_connections', 'Number of active connections');

    // Initialize Query Cost Guard metrics
    this.queryCostEstimated = this.createHistogram('query_cost_estimated', 'Estimated cost of database queries');
    this.slowQueriesKilled = this.createCounter('slow_queries_killed_total', 'Total number of slow queries terminated');


    this.setupResourceUtilizationMetrics();
  }

  public static getInstance(): ComprehensiveTelemetry {
    if (!ComprehensiveTelemetry.instance) {
      ComprehensiveTelemetry.instance = new ComprehensiveTelemetry();
    }
    return ComprehensiveTelemetry.instance;
  }

  private createCounter(name: string, description: string): Counter {
    return this.meter.createCounter(name, { description });
  }

  private createHistogram(name: string, description: string): Histogram {
    return this.meter.createHistogram(name, { description });
  }

  private createUpDownCounter(name: string, description: string): UpDownCounter {
    return this.meter.createUpDownCounter(name, { description });
  }

  private setupResourceUtilizationMetrics() {
    this.cpuUsage = this.meter.createObservableGauge('cpu_usage_percent', {
      description: 'CPU usage percentage',
    });
    this.memoryUsage = this.meter.createObservableGauge('memory_usage_bytes', {
      description: 'Memory usage in bytes',
    });

    this.cpuUsage.addCallback((result) => {
      const now = Date.now();
      const { user, system } = process.cpuUsage();

      if (this.previousCpuTime) {
        const elapsedTime = now - this.previousCpuTime.time;
        const elapsedUserTime = user - this.previousCpuTime.user;
        const elapsedSystemTime = system - this.previousCpuTime.system;
        const cpuUsage = ((elapsedUserTime + elapsedSystemTime) / (elapsedTime * 1000)) * 100;
        result.observe(cpuUsage, {});
        this.notifyListeners('cpu_usage_percent', cpuUsage);
      }

      this.previousCpuTime = { user, system, time: now };
    });

    this.memoryUsage.addCallback((result) => {
      const memoryUsage = process.memoryUsage().heapUsed;
      result.observe(memoryUsage, {});
      this.notifyListeners('memory_usage_bytes', memoryUsage);
    });
  }

  private metricListeners: ((metricName: string, value: number) => void)[] = [];

  public onMetric(listener: (metricName: string, value: number) => void) {
    this.metricListeners.push(listener);
  }

  private notifyListeners(metricName: string, value: number) {
    for (const listener of this.metricListeners) {
      listener(metricName, value);
    }
  }

  public recordRequest(duration: number, attributes: Record<string, string | number>) {
    this.requestDuration.record(duration, attributes);
    this.notifyListeners('request_duration_seconds', duration);
  }

  public incrementActiveConnections() {
    this.activeConnections.add(1);
  }

  public decrementActiveConnections() {
    this.activeConnections.add(-1);
  }

  public getMeter(): Meter {
    return this.meter;
  }
}

export const telemetry = ComprehensiveTelemetry.getInstance();

// @ts-nocheck

import { metrics } from '../observability/metrics';
import {
  Meter,
  Counter,
  Histogram,
  UpDownCounter,
} from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import {
  MeterProvider,
} from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
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

  // Request/response timing
  public readonly requestDuration: Histogram;

  // Resource utilization
  private activeConnections: UpDownCounter;

  private constructor() {
    // Legacy support: Reuse the OTel service or create a bridged meter
    // For now, we stub this to prevent breaking existing consumers but direct them to new metrics
    // Ideally this class should be deleted and consumers migrated.

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'intelgraph-server-legacy',
    });

    // Mocks to satisfy type checker while we migrate
    this.requestDuration = { record: () => { } } as any;
    this.activeConnections = { add: () => { } } as any;
    this.subsystems = {
      database: {
        queries: { add: () => { } },
        errors: { add: () => { } },
        latency: { record: () => { } }
      },
      cache: {
        hits: { add: () => { } },
        misses: { add: () => { } },
        sets: { add: () => { } },
        dels: { add: () => { } }
      },
      api: {
        requests: { add: () => { } },
        errors: { add: () => { } }
      }
    } as any;
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

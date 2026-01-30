// @ts-nocheck
import { metrics } from '../observability/metrics.js';
import { Meter } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// @deprecated - Use server/src/lib/observability/ instead
class ComprehensiveTelemetry {
  private static instance: ComprehensiveTelemetry;
  private meter: Meter;

  // Performance counters
  public readonly subsystems: {
    database: {
      queries: { add: (value?: number) => void };
      errors: { add: (value?: number) => void };
      latency: { record: (value: number) => void };
    };
    cache: {
      hits: { add: (value?: number) => void };
      misses: { add: (value?: number) => void };
      sets: { add: (value?: number) => void };
      dels: { add: (value?: number) => void };
    };
    api: { requests: { add: (value?: number) => void }; errors: { add: (value?: number) => void } };
  };

  // Request/response timing
  public readonly requestDuration: { record: (value: number) => void };
  private activeConnections: { add: (value: number) => void };
  private activeConnectionsCount = 0;

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
    this.activeConnections = { add: (value: number) => {} };
    this.subsystems = {
      database: {
        queries: { add: (value?: number) => {} },
        errors: { add: (value?: number) => {} },
        latency: { record: (value?: number) => {} },
      },
      cache: {
        hits: { add: (value?: number) => {} },
        misses: { add: (value?: number) => {} },
        sets: { add: (value?: number) => {} },
        dels: { add: (value?: number) => {} },
      },
      api: { requests: { add: (value?: number) => {} }, errors: { add: (value?: number) => {} } },
    };
  }

  public static getInstance(): ComprehensiveTelemetry {
    if (!ComprehensiveTelemetry.instance) {
      ComprehensiveTelemetry.instance = new ComprehensiveTelemetry();
    }
    return ComprehensiveTelemetry.instance;
  }

  public recordRequest(
    duration: number,
    attributes: Record<string, string | number>,
  ) {
    // Forward to new metric
    metrics.httpRequestDuration.observe(
      attributes as Record<string, string>,
      duration,
    );
  }

  public incrementActiveConnections() {
    this.activeConnectionsCount++;
    this.activeConnections.add(1);
  }

  public decrementActiveConnections() {
    this.activeConnectionsCount--;
    this.activeConnections.add(-1);
  }

  public onMetric(_listener: (metricName: string, value: number) => void) {
    // No-op or reimplement if critical
  }
}

export const telemetry = ComprehensiveTelemetry.getInstance();

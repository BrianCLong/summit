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
      queries: { add: () => void };
      errors: { add: () => void };
      latency: { record: () => void };
    };
    cache: {
      hits: { add: () => void };
      misses: { add: () => void };
      sets: { add: () => void };
      dels: { add: () => void };
    };
    api: { requests: { add: () => void }; errors: { add: () => void } };
  };

  // Request/response timing
  public readonly requestDuration: { record: () => void };
  private activeConnections: { add: () => void };

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
      database: {
        queries: { add: () => {} },
        errors: { add: () => {} },
        latency: { record: () => {} },
      },
      cache: {
        hits: { add: () => {} },
        misses: { add: () => {} },
        sets: { add: () => {} },
        dels: { add: () => {} },
      },
      api: { requests: { add: () => {} }, errors: { add: () => {} } },
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

  public onMetric(_listener: (metricName: string, value: number) => void) {
    // No-op or reimplement if critical
  }
}

export const telemetry = ComprehensiveTelemetry.getInstance();

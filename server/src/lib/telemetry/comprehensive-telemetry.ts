
import { metrics } from '../../observability/metrics.js';
import { registry } from '../../observability/metrics-enhanced.js';
import { Meter } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Gauge } from 'prom-client';

// @deprecated - Use server/src/lib/observability/ instead, but now backed by real metrics
class ComprehensiveTelemetry {
  private static instance: ComprehensiveTelemetry;
  private meter: any; // Meter type from API is interface, but implementation is separate

  // Performance counters mapped to real Prometheus metrics
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
    // Legacy support: We still initialize a dummy meter to avoid breaking types if anything accessed .meter
    // Removing MeterProvider usage as it requires sdk-metrics which is missing in dev environment
    // and this is deprecated code anyway.
    this.meter = {
        createCounter: () => ({ add: () => {} }),
        createHistogram: () => ({ record: () => {} }),
    };

    // Real metric bindings
    this.requestDuration = {
      record: (value: number) => {
        // Value is in ms from app.ts (process.hrtime converted to ms)
        // Prometheus standard is seconds
        metrics.httpRequestDuration.observe(value / 1000);
      }
    };

    this.activeConnections = {
      add: (value: number) => {
        if (value > 0) metrics.activeConnections.inc(value);
        else metrics.activeConnections.dec(Math.abs(value));
      }
    };

    this.subsystems = {
      database: {
        queries: {
            add: (value?: number) => {
                // We don't have a dedicated query counter in basic metrics,
                // but we can infer from histogram count if needed.
                // For now, no-op or add a specific counter if strictly required.
            }
        },
        errors: {
            add: (value?: number) => {
                // Can be added to a general error counter if one exists
            }
        },
        latency: {
          record: (value: number) => {
             // value in ms
             metrics.databaseQueryDuration.observe(value / 1000);
          }
        },
      },
      cache: {
        hits: { add: (value?: number) => metrics.cacheHits.inc(value || 1) },
        misses: { add: (value?: number) => metrics.cacheMisses.inc(value || 1) },
        sets: { add: (value?: number) => { /* No metric yet */ } },
        dels: { add: (value?: number) => { /* No metric yet */ } },
      },
      api: {
        requests: {
           // Handled by middleware mostly
           add: (value?: number) => { }
        },
        errors: {
           add: (value?: number) => {
             // We can assume 500 error for generic count if needed
             // metrics.httpRequestsTotal.inc({ status: '500' }); // If such metric existed
           }
        }
      },
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
    // duration is in ms from app.ts
    // attributes usually contain method, route, status
    const labels: Record<string, string> = {};
    if (attributes.method) labels.method = String(attributes.method);
    if (attributes.route) labels.route = String(attributes.route);
    if (attributes.status) labels.status = String(attributes.status);

    metrics.httpRequestDuration.observe(
      labels,
      duration / 1000,
    );
  }

  public incrementActiveConnections() {
    this.activeConnectionsCount++;
    metrics.activeConnections.inc(1);
  }

  public decrementActiveConnections() {
    this.activeConnectionsCount--;
    metrics.activeConnections.dec(1);
  }

  public onMetric(_listener: (metricName: string, value: number) => void) {
    // No-op
  }
}

export const telemetry = ComprehensiveTelemetry.getInstance();

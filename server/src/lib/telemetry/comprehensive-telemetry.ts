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

    // Wire up subsystems to actual metrics
    this.subsystems = {
      database: {
        queries: {
          add: (value: number = 1) => {
            if (metrics.dbQueriesTotal) {
              // Use generic labels for legacy adapter usage
              metrics.dbQueriesTotal.labels('unknown', 'query', 'ok').inc(value);
            }
          }
        },
        errors: {
          add: (value: number = 1) => {
             if (metrics.dbQueriesTotal) {
               metrics.dbQueriesTotal.labels('unknown', 'query', 'error').inc(value);
             }
          }
        },
        latency: {
          record: (value: number) => {
            if (metrics.dbQueryDuration) {
              metrics.dbQueryDuration.labels('unknown', 'query').observe(value);
            }
            // Also update legacy metric
            if (metrics.intelgraphDatabaseQueryDuration) {
               metrics.intelgraphDatabaseQueryDuration.labels('unknown', 'query').observe(value);
            }
          }
        },
      },
      cache: {
        hits: {
          add: (value: number = 1) => {
            if (metrics.intelgraphCacheHits) metrics.intelgraphCacheHits.labels('redis').inc(value);
            if (metrics.cacheHits) metrics.cacheHits.inc(value);
          }
        },
        misses: {
          add: (value: number = 1) => {
            if (metrics.intelgraphCacheMisses) metrics.intelgraphCacheMisses.inc(value);
            if (metrics.cacheMisses) metrics.cacheMisses.inc(value);
          }
        },
        sets: { add: (value: number = 1) => { /* TODO: cacheSets? */ } },
        dels: { add: (value: number = 1) => { /* TODO: cacheDels? */ } },
      },
      api: {
        requests: {
          add: (value: number = 1) => {
            if (metrics.stdHttpRequestsTotal) {
               metrics.stdHttpRequestsTotal.labels('GET', 'unknown', '200').inc(value);
            }
          }
        },
        errors: {
          add: (value: number = 1) => {
            if (metrics.applicationErrors) {
              metrics.applicationErrors.labels('api', 'error', 'high', 'general').inc(value);
            }
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
    const labels = {
      method: String(attributes.method || 'GET'),
      route: String(attributes.route || 'unknown'),
      status_code: String(attributes.status || 200),
    };

    // Forward to standard metrics (for dashboard)
    if (metrics.stdHttpRequestDuration) {
      metrics.stdHttpRequestDuration.observe(labels, duration);
    }
    if (metrics.stdHttpRequestsTotal) {
      metrics.stdHttpRequestsTotal.inc(labels);
    }

    // Forward to legacy metric (intelgraph_ prefix)
    // Note: legacy metric uses 'status' label instead of 'status_code'
    const legacyLabels = {
      method: String(attributes.method || 'GET'),
      route: String(attributes.route || 'unknown'),
      status_code: String(attributes.status || 200),
    };
    metrics.httpRequestDuration.observe(legacyLabels, duration);
  }

  public incrementActiveConnections() {
    this.activeConnectionsCount++;
    if (metrics.websocketConnections) {
      metrics.websocketConnections.inc();
    }
    // Also update legacy metric if possible, assuming single tenant or unknown
    if (metrics.intelgraphActiveConnections) {
      metrics.intelgraphActiveConnections.set({ tenant: 'unknown' }, this.activeConnectionsCount);
    }
  }

  public decrementActiveConnections() {
    this.activeConnectionsCount--;
    if (metrics.websocketConnections) {
      metrics.websocketConnections.dec();
    }
    if (metrics.intelgraphActiveConnections) {
      metrics.intelgraphActiveConnections.set({ tenant: 'unknown' }, this.activeConnectionsCount);
    }
  }

  public onMetric(_listener: (metricName: string, value: number) => void) {
    // No-op or reimplement if critical
  }
}

export const telemetry = ComprehensiveTelemetry.getInstance();

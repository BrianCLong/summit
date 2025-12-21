// @ts-nocheck
import { snapshotter } from './diagnostic-snapshotter.js';
import { anomalyDetector } from './anomaly-detector.js';
import { alertingService } from './alerting-service.js';
import {
  httpRequestDuration,
  httpRequestsTotal,
  dbConnectionsActive,
  dbQueryDuration,
  dbQueriesTotal,
  aiJobsQueued,
  aiJobsProcessing,
  aiJobDuration,
  aiJobsTotal,
  graphNodesTotal,
  graphEdgesTotal,
  graphOperationDuration,
  websocketConnections,
  websocketMessages,
  investigationsActive,
  investigationOperations,
  applicationErrors,
  tenantScopeViolationsTotal,
  memoryUsage,
} from '../observability/metrics.js'; // Importing from the unified metrics file

// @deprecated - Use server/src/lib/observability/ instead
class ComprehensiveTelemetry {
  private static instance: ComprehensiveTelemetry;
  private listeners: Array<(metricName: string, value: number) => void> = [];
  public readonly subsystems: {
    database: { queries: { add: (n: number) => void }; errors: { add: (n: number) => void }; latency: { record: (ms: number) => void } };
    cache: { hits: { add: (n: number) => void }; misses: { add: (n: number) => void }; sets: { add: (n: number) => void }; dels: { add: (n: number) => void } };
    api: { requests: { add: (n: number) => void }; errors: { add: (n: number) => void } };
  };

  private constructor() {
    this.subsystems = {
      database: {
        queries: { add: (n: number) => dbQueriesTotal.inc(n) },
        errors: { add: (n: number) => dbQueriesTotal.inc({ status: 'error' }, n) },
        latency: { record: (ms: number) => dbQueryDuration.observe(ms / 1000) }
      },
      cache: {
        hits: { add: (n: number) => {} }, // TODO: Map to cache metrics if available
        misses: { add: (n: number) => {} },
        sets: { add: (n: number) => {} },
        dels: { add: (n: number) => {} }
      },
      api: {
        requests: { add: (n: number) => httpRequestsTotal.inc(n) },
        errors: { add: (n: number) => httpRequestsTotal.inc({ status_code: '500' }, n) } // Simplified
      }
    };

    // Wire up anomaly detector and alerting service (legacy support)
    // In a real system these should listen to Prometheus events, but for this legacy class we keep the internal pub/sub
    this.onMetric((name, value) => {
      // Forward to anomaly detector
      const anomaly = anomalyDetector.detect(name, value);
      if (anomaly) {
         snapshotter.triggerSnapshot('anomaly_detected');
         alertingService.sendAlert(`Anomaly detected in ${name}: value ${value} (z-score: ${anomaly.zScore})`);
      }
    });
  }

  public static getInstance(): ComprehensiveTelemetry {
    if (!ComprehensiveTelemetry.instance) {
      ComprehensiveTelemetry.instance = new ComprehensiveTelemetry();
    }
    return ComprehensiveTelemetry.instance;
  }

  public incrementActiveConnections() {
    // This metric is not exactly standard http active connections, but we can assume it for now
    // or maybe it's websocket? In app.ts it seems to be per-request.
    // There isn't a gauge for active HTTP requests in the imported metrics,
    // so we might skip or add one if strictly needed.
    // However, existing code expects this method.
  }

  public decrementActiveConnections() {
    // Same as above
  }

  public recordRequest(durationMs: number, attributes: Record<string, any>) {
    // duration comes in ms, histogram expects seconds
    httpRequestDuration.observe(
      {
        method: attributes.method || 'GET',
        route: attributes.route || 'unknown',
        status_code: attributes.status || '200'
      },
      durationMs / 1000
    );

    httpRequestsTotal.inc({
        method: attributes.method || 'GET',
        route: attributes.route || 'unknown',
        status_code: attributes.status || '200'
    });

    // Legacy support for anomaly detection on request latency
    this.notifyListeners('request_duration_ms', durationMs);
  }

  public onMetric(listener: (metricName: string, value: number) => void) {
    this.listeners.push(listener);
  }

  // Used by tests to simulate metric updates
  public notifyListeners(metricName: string, value: number) {
    this.listeners.forEach(listener => listener(metricName, value));
  }
}

export const telemetry = ComprehensiveTelemetry.getInstance();

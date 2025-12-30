import { Histogram, Registry, collectDefaultMetrics, Counter, Gauge } from 'prom-client';
import { HealthStatus } from './types';

export class ConnectorObservability {
  private registry: Registry;
  private latency: Histogram<string>;
  private failures: Counter<string>;
  private throughput: Counter<string>;
  private lastSuccess: Gauge<string>;
  private health: Map<string, HealthStatus> = new Map();

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.latency = new Histogram({
      name: 'connector_latency_seconds',
      help: 'Latency per connector operation',
      labelNames: ['connectorId']
    });

    this.failures = new Counter({
      name: 'connector_failures_total',
      help: 'Count of connector failures',
      labelNames: ['connectorId']
    });

    this.throughput = new Counter({
      name: 'connector_success_total',
      help: 'Successful connector operations',
      labelNames: ['connectorId']
    });

    this.lastSuccess = new Gauge({
      name: 'connector_last_success_timestamp',
      help: 'Last success timestamp per connector',
      labelNames: ['connectorId']
    });

    this.registry.registerMetric(this.latency);
    this.registry.registerMetric(this.failures);
    this.registry.registerMetric(this.throughput);
    this.registry.registerMetric(this.lastSuccess);
  }

  recordSuccess(connectorId: string, latencyMs: number) {
    this.latency.labels(connectorId).observe(latencyMs / 1000);
    this.throughput.labels(connectorId).inc();
    this.lastSuccess.labels(connectorId).set(Date.now());
    this.health.set(connectorId, 'connected');
  }

  recordFailure(connectorId: string) {
    this.failures.labels(connectorId).inc();
    const current = this.health.get(connectorId);
    if (!current || current === 'connected') {
      this.health.set(connectorId, 'degraded');
    } else {
      this.health.set(connectorId, 'failing');
    }
  }

  pause(connectorId: string) {
    this.health.set(connectorId, 'paused');
  }

  getHealth(connectorId: string): HealthStatus {
    return this.health.get(connectorId) ?? 'degraded';
  }

  metrics() {
    return this.registry.metrics();
  }
}

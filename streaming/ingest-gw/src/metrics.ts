import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry });

const ingestEventsTotal = new Counter({
  name: 'ingest_events_total',
  help: 'Count of events received by the ingest gateway.',
  labelNames: ['result'],
  registers: [registry],
});

const ingestProduceDurationSeconds = new Histogram({
  name: 'ingest_produce_duration_seconds',
  help: 'Time spent producing events to the downstream topic.',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export function recordIngest(result: 'accepted' | 'rejected' | 'failed'): void {
  ingestEventsTotal.labels(result).inc();
}

export function startProduceTimer() {
  return ingestProduceDurationSeconds.startTimer();
}

export async function metricsSnapshot(): Promise<string> {
  return registry.metrics();
}

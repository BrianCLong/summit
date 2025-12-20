import { Counter, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry });

const alertStreamClients = new Gauge({
  name: 'alert_stream_clients',
  help: 'Current number of active SSE clients.',
  registers: [registry],
});

const alertsStreamedTotal = new Counter({
  name: 'alerts_streamed_total',
  help: 'Total alerts delivered over SSE.',
  registers: [registry],
});

const alertStreamErrorsTotal = new Counter({
  name: 'alert_stream_errors_total',
  help: 'Errors encountered while streaming alerts.',
  registers: [registry],
});

export function clientConnected(): void {
  alertStreamClients.inc();
}

export function clientDisconnected(): void {
  alertStreamClients.dec();
}

export function recordAlertStreamed(): void {
  alertsStreamedTotal.inc();
}

export function recordStreamError(): void {
  alertStreamErrorsTotal.inc();
}

export async function metricsSnapshot(): Promise<string> {
  return registry.metrics();
}

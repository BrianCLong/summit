
import { PrometheusMetrics } from '../utils/metrics.js';

// Epic E3.S1 — Standard telemetry contract
// Every service emits: request count, latency, error rate, saturation

const metrics = new PrometheusMetrics('companyos');

// Initialize standard metrics
metrics.createCounter('http_requests_total', 'Total HTTP requests', ['method', 'route', 'status']);
metrics.createHistogram('http_request_duration_seconds', 'HTTP request latency', { buckets: [0.1, 0.5, 1, 2, 5] });
metrics.createCounter('errors_total', 'Total application errors', ['type', 'service']);
metrics.createGauge('cpu_saturation', 'CPU saturation (0-1)', ['hostname']);
metrics.createGauge('memory_saturation', 'Memory saturation (0-1)', ['hostname']);

export const standardTelemetry = {
  recordRequest: (method: string, route: string, status: number, duration: number) => {
    metrics.incrementCounter('http_requests_total', { method, route, status: status.toString() });
    metrics.observeHistogram('http_request_duration_seconds', duration, { method, route });
  },

  recordError: (type: string, service: string = 'server') => {
    metrics.incrementCounter('errors_total', { type, service });
  },

  recordSaturation: (cpu: number, memory: number, hostname: string = 'local') => {
    metrics.setGauge('cpu_saturation', cpu, { hostname });
    metrics.setGauge('memory_saturation', memory, { hostname });
  }
};

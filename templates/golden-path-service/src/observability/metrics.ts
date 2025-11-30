import client from 'prom-client';
import { config } from '../config.js';

export const register = new client.Registry();
register.setDefaultLabels({ service: config.serviceName });

client.collectDefaultMetrics({ register, labels: { service: config.serviceName } });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

export const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total HTTP error responses',
  labelNames: ['method', 'route', 'status']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);

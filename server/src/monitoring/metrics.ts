import { Counter, Gauge, Histogram } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const narrativeSimulationActiveSimulations = new Gauge({
  name: 'narrative_simulation_active_simulations',
  help: 'Number of active narrative simulations',
});

export const aiTokenUsage = new Counter({
  name: 'ai_token_usage',
  help: 'Total AI tokens used',
  labelNames: ['model', 'type'],
});

import client, { Counter, Gauge, Histogram } from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const doclingLatency = new Histogram({
  name: 'docling_inference_latency_seconds',
  help: 'Latency of granite-docling requests',
  labelNames: ['operation', 'tenant_id', 'purpose'],
  registers: [register],
  buckets: [0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1, 1.5, 2, 3],
});

export const doclingChars = new Counter({
  name: 'docling_processed_characters_total',
  help: 'Characters processed by operation',
  labelNames: ['operation', 'tenant_id'],
  registers: [register],
});

export const doclingCost = new Counter({
  name: 'docling_cost_usd_total',
  help: 'USD cost accrued per tenant',
  labelNames: ['tenant_id', 'purpose'],
  registers: [register],
});

export const doclingSuccess = new Counter({
  name: 'docling_requests_total',
  help: 'Request count by outcome',
  labelNames: ['operation', 'status'],
  registers: [register],
});

export const doclingCacheGauge = new Gauge({
  name: 'docling_cache_entries',
  help: 'Number of entries in request cache',
  registers: [register],
});

export const doclingQuality = new Histogram({
  name: 'docling_quality_signal',
  help: 'Quality signal distribution (0-1)',
  labelNames: ['signal'],
  registers: [register],
  buckets: [0.1, 0.25, 0.4, 0.5, 0.65, 0.8, 0.9, 1],
});

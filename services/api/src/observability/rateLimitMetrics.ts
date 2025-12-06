import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const rateLimitMetrics = {
  registry,
  allowed: new Counter({
    name: 'rate_limit_allowed_total',
    help: 'Count of requests allowed by the rate limiter',
    labelNames: ['bucket', 'source', 'endpoint'],
    registers: [registry],
  }),
  blocked: new Counter({
    name: 'rate_limit_blocked_total',
    help: 'Count of requests blocked by the rate limiter',
    labelNames: ['bucket', 'source', 'reason', 'endpoint'],
    registers: [registry],
  }),
  backoff: new Histogram({
    name: 'rate_limit_backoff_ms',
    help: 'Observed backoff durations applied when limits are exceeded',
    labelNames: ['bucket', 'endpoint'],
    buckets: [100, 250, 500, 1000, 2000, 4000, 8000, 16000, 30000, 60000],
    registers: [registry],
  }),
  circuitOpen: new Gauge({
    name: 'rate_limit_circuit_open',
    help: 'Indicates whether the rate limiter circuit breaker is open (1) or closed (0)',
    registers: [registry],
  }),
  latency: new Histogram({
    name: 'rate_limit_decision_latency_ms',
    help: 'Latency histogram for rate limit decision making',
    labelNames: ['source'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500],
    registers: [registry],
  }),
};

export const metricsContentType = registry.contentType;

export async function renderMetrics(): Promise<string> {
  return registry.metrics();
}

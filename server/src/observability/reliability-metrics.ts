// @ts-nocheck
import { Counter, Gauge, Histogram, Summary } from 'prom-client';
import { registry } from '../metrics';

type ReliabilityEndpoint = 'ingest' | 'graph_query' | 'rag';

const latencyHistogram = getOrCreateHistogram(
  'reliability_request_duration_seconds',
  'Endpoint latency for high-traffic reliability surfaces',
  ['endpoint', 'status'],
  [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
);

const latencySummary = getOrCreateSummary(
  'reliability_request_latency_quantiles',
  'p50/p95 latency for reliability endpoints',
  ['endpoint'],
  [0.5, 0.95],
);

const errorCounter = getOrCreateCounter(
  'reliability_request_errors_total',
  'Error responses for reliability endpoints',
  ['endpoint', 'status'],
);

const queueDepthGauge = getOrCreateGauge(
  'reliability_queue_depth',
  'In-flight/backlog size for hot paths',
  ['endpoint', 'tenant'],
);

const tenantQueryBudgetHits = getOrCreateCounter(
  'tenant_query_budget_hits_total',
  'Per-tenant budget consumption for query-style endpoints',
  ['tenant', 'endpoint'],
);

export function recordEndpointResult(options: {
  endpoint: ReliabilityEndpoint;
  statusCode: number;
  durationSeconds: number;
  tenantId?: string;
  queueDepth?: number;
}) {
  const endpoint = options.endpoint;
  const tenantLabel = normalizeTenant(options.tenantId);
  const statusLabel = classifyStatus(options.statusCode);

  latencyHistogram.labels(endpoint, statusLabel).observe(options.durationSeconds);
  latencySummary.labels(endpoint).observe(options.durationSeconds);

  if (options.statusCode >= 400) {
    errorCounter.labels(endpoint, statusLabel).inc();
  }

  if (options.queueDepth !== undefined) {
    queueDepthGauge.labels(endpoint, tenantLabel).set(options.queueDepth);
  }
}

export function incrementTenantBudgetHit(
  endpoint: ReliabilityEndpoint,
  tenantId?: string,
) {
  tenantQueryBudgetHits.labels(normalizeTenant(tenantId), endpoint).inc();
}

export function resetReliabilityMetrics() {
  latencyHistogram.reset();
  latencySummary.reset();
  errorCounter.reset();
  queueDepthGauge.reset();
  tenantQueryBudgetHits.reset();
}

function classifyStatus(statusCode: number): string {
  if (statusCode >= 500) return '5xx';
  if (statusCode >= 400) return '4xx';
  if (statusCode >= 300) return '3xx';
  if (statusCode >= 200) return '2xx';
  return '1xx';
}

function normalizeTenant(tenantId?: string): string {
  if (!tenantId) {
    return 'unknown';
  }

  return String(tenantId)
    .replace(/[^a-zA-Z0-9:_-]/g, '_')
    .substring(0, 48);
}

function getOrCreateHistogram(
  name: string,
  help: string,
  labelNames: string[],
  buckets: number[],
) {
  const existing = registry.getSingleMetric(name);
  if (existing instanceof Histogram) {
    return existing;
  }

  const metric = new Histogram({
    name,
    help,
    labelNames,
    buckets,
    registers: [registry],
  });
  return metric;
}

function getOrCreateSummary(
  name: string,
  help: string,
  labelNames: string[],
  percentiles: number[],
) {
  const existing = registry.getSingleMetric(name);
  if (existing instanceof Summary) {
    return existing;
  }

  return new Summary({
    name,
    help,
    labelNames,
    percentiles,
    maxAgeSeconds: 600,
    ageBuckets: 5,
    registers: [registry],
  });
}

function getOrCreateCounter(
  name: string,
  help: string,
  labelNames: string[],
) {
  const existing = registry.getSingleMetric(name);
  if (existing instanceof Counter) {
    return existing;
  }

  return new Counter({
    name,
    help,
    labelNames,
    registers: [registry],
  });
}

function getOrCreateGauge(
  name: string,
  help: string,
  labelNames: string[],
) {
  const existing = registry.getSingleMetric(name);
  if (existing instanceof Gauge) {
    return existing;
  }

  return new Gauge({
    name,
    help,
    labelNames,
    registers: [registry],
  });
}

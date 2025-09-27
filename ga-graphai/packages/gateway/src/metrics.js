import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { context as otelContext, trace } from '@opentelemetry/api';
import { percentile } from 'common-types';

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'gateway';
const DEFAULT_TENANT = 'unknown';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

const requestLatency = new Histogram({
  name: 'request_latency',
  help: 'Latency for incoming requests (seconds).',
  labelNames: ['tenant', 'service', 'operation'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry]
});

const errorRate = new Counter({
  name: 'error_rate',
  help: 'Total errors observed by operation.',
  labelNames: ['tenant', 'service', 'operation'],
  registers: [registry]
});

const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Number of requests queued or in-flight.',
  labelNames: ['tenant', 'service'],
  registers: [registry]
});

const batchThroughput = new Counter({
  name: 'batch_throughput',
  help: 'Count of work items processed.',
  labelNames: ['tenant', 'service', 'operation'],
  registers: [registry]
});

const costPerCall = new Histogram({
  name: 'cost_per_call',
  help: 'Distribution of USD cost per invocation.',
  labelNames: ['tenant', 'service', 'operation'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [registry]
});

function buildLabels(overrides = {}) {
  return {
    tenant: overrides.tenant ?? DEFAULT_TENANT,
    service: overrides.service ?? SERVICE_NAME,
    ...('operation' in overrides ? { operation: overrides.operation } : {})
  };
}

function buildOperationLabels(overrides = {}) {
  return buildLabels({ ...overrides, operation: overrides.operation ?? 'unknown' });
}

function getExemplarLabels() {
  const span = trace.getActiveSpan();
  if (!span) {
    return undefined;
  }
  const spanContext = span.spanContext();
  if (!spanContext?.traceId) {
    return undefined;
  }
  return { trace_id: spanContext.traceId, span_id: spanContext.spanId };
}

function observeHistogram(metric, labels, value) {
  if (!Number.isFinite(value)) {
    return;
  }
  const exemplar = getExemplarLabels();
  if (exemplar) {
    metric.observe(labels, value, exemplar);
  } else {
    metric.observe(labels, value);
  }
}

function incrementCounter(metric, labels, value = 1) {
  if (!Number.isFinite(value)) {
    return;
  }
  const exemplar = getExemplarLabels();
  if (exemplar) {
    metric.inc(labels, value, exemplar);
  } else {
    metric.inc(labels, value);
  }
}

export function observeQueueDepth(depth, labels = {}) {
  if (!Number.isFinite(depth)) {
    return;
  }
  queueDepth.set(buildLabels(labels), depth);
}

export function recordRequestMetric({
  tenant = DEFAULT_TENANT,
  operation = 'unknown',
  latencySeconds,
  isError = false,
  costUsd,
  batchSize = 1,
  queueSize
}) {
  const metricLabels = buildOperationLabels({ tenant, operation });
  observeHistogram(requestLatency, metricLabels, latencySeconds);
  if (queueSize !== undefined) {
    observeQueueDepth(queueSize, { tenant });
  }
  incrementCounter(batchThroughput, metricLabels, Math.max(1, batchSize));
  if (isError) {
    incrementCounter(errorRate, metricLabels);
  }
  if (Number.isFinite(costUsd)) {
    observeHistogram(costPerCall, metricLabels, costUsd);
  }
}

export function observeSuccess(operation, modelId, adapterResult, context = {}) {
  const latencyMs = adapterResult?.latencyMs ?? adapterResult?.latency ?? adapterResult?.durationMs;
  const latencySeconds = Number.isFinite(latencyMs) ? latencyMs / 1000 : undefined;
  const costUsd = adapterResult?.usd ?? adapterResult?.costUsd;
  recordRequestMetric({
    tenant: context.tenant ?? DEFAULT_TENANT,
    operation,
    latencySeconds,
    costUsd,
    batchSize: context.batchSize ?? 1,
    queueSize: context.queueSize
  });
}

export function observePolicyDeny(reason, context = {}) {
  incrementCounter(
    errorRate,
    buildOperationLabels({
      tenant: context.tenant ?? DEFAULT_TENANT,
      operation: context.operation ?? 'policy'
    })
  );
}

export function createHttpInstrumentation(options = {}) {
  const tracer = trace.getTracer(options.tracerName ?? 'gateway-http');
  return function httpMetricsMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    const span = tracer.startSpan('http.request', {
      attributes: {
        'http.method': req.method,
        'http.route': req.path,
        'http.target': req.originalUrl ?? req.url,
        'service.name': SERVICE_NAME
      }
    });

    const requestContext = trace.setSpan(otelContext.active(), span);
    otelContext.with(requestContext, () => next());

    const complete = () => {
      const end = process.hrtime.bigint();
      const latencySeconds = Number(end - start) / 1e9;
      const tenant = req.aiContext?.tenant ?? req.headers['x-tenant'] ?? DEFAULT_TENANT;
      const operation = options.operationResolver?.(req) ?? req.path ?? 'http';
      const statusCode = res.statusCode ?? 500;
      const isError = statusCode >= 400;
      recordRequestMetric({
        tenant,
        operation,
        latencySeconds,
        isError
      });
      span.setAttribute('http.status_code', statusCode);
      if (isError) {
        span.setStatus({ code: 2, message: `HTTP ${statusCode}` });
      }
      span.end();
      res.removeListener('finish', complete);
      res.removeListener('close', complete);
    };

    res.on('finish', complete);
    res.on('close', complete);
  };
}

export class MetricsRecorder {
  constructor() {
    this.latencies = [];
    this.costs = [];
    this.qualities = [];
    this.cacheHits = 0;
    this.total = 0;
  }

  record({ latency, cost, quality, cacheHit, tenant = DEFAULT_TENANT, operation = 'orchestrator', queueSize }) {
    if (Number.isFinite(latency)) {
      this.latencies.push(latency);
      const latencySeconds = latency > 10 ? latency / 1000 : latency;
      recordRequestMetric({ tenant, operation, latencySeconds, costUsd: cost, batchSize: 1, queueSize });
    }
    if (Number.isFinite(cost)) {
      this.costs.push(cost);
    }
    if (Number.isFinite(quality)) {
      this.qualities.push(quality);
    }
    if (cacheHit) {
      this.cacheHits += 1;
    }
    this.total += 1;
  }

  snapshot() {
    return {
      p50Latency: percentile(this.latencies, 0.5),
      p95Latency: percentile(this.latencies, 0.95),
      avgCost: this.costs.length === 0 ? 0 : this.costs.reduce((a, b) => a + b, 0) / this.costs.length,
      avgQuality:
        this.qualities.length === 0
          ? 0
          : this.qualities.reduce((a, b) => a + b, 0) / this.qualities.length,
      cacheHitRate: this.total === 0 ? 0 : this.cacheHits / this.total
    };
  }
}

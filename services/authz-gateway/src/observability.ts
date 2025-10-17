import os from 'node:os';
import type { Request, RequestHandler, Response } from 'express';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

function ensureCounter(
  name: string,
  factory: () => Counter<'method' | 'route' | 'status_code'>,
) {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing as Counter<'method' | 'route' | 'status_code'>;
  }
  const metric = factory();
  registry.registerMetric(metric);
  return metric;
}

function ensureHistogram(
  name: string,
  factory: () => Histogram<'method' | 'route' | 'status_code'>,
) {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing as Histogram<'method' | 'route' | 'status_code'>;
  }
  const metric = factory();
  registry.registerMetric(metric);
  return metric;
}

function ensureGauge(
  name: string,
  factory: () => Gauge<'method' | 'route'>,
) {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing as Gauge<'method' | 'route'>;
  }
  const metric = factory();
  registry.registerMetric(metric);
  return metric;
}

const httpRequestsTotal = ensureCounter(
  'authz_gateway_requests_total',
  () =>
    new Counter({
      name: 'authz_gateway_requests_total',
      help: 'Total number of HTTP requests processed by the AuthZ gateway.',
      labelNames: ['method', 'route', 'status_code'],
    }),
);

const httpRequestDuration = ensureHistogram(
  'authz_gateway_request_duration_seconds',
  () =>
    new Histogram({
      name: 'authz_gateway_request_duration_seconds',
      help: 'Duration of HTTP requests handled by the AuthZ gateway.',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [
        0.005,
        0.01,
        0.025,
        0.05,
        0.1,
        0.25,
        0.5,
        1,
        2.5,
        5,
        10,
      ],
    }),
);

const httpRequestErrors = ensureCounter(
  'authz_gateway_request_errors_total',
  () =>
    new Counter({
      name: 'authz_gateway_request_errors_total',
      help: 'Total number of HTTP requests that resulted in server errors.',
      labelNames: ['method', 'route', 'status_code'],
    }),
);

const httpActiveRequests = ensureGauge(
  'authz_gateway_active_requests',
  () =>
    new Gauge({
      name: 'authz_gateway_active_requests',
      help: 'Current number of in-flight HTTP requests.',
      labelNames: ['method', 'route'],
    }),
);

function normalizeRoute(req: Request) {
  if (req.route?.path) {
    return typeof req.route.path === 'string'
      ? req.route.path
      : Array.isArray(req.route.path)
        ? req.route.path[0]
        : String(req.route.path);
  }
  if (req.baseUrl) {
    return req.baseUrl;
  }
  return req.originalUrl.split('?')[0] || req.path || 'unknown';
}

export const requestMetricsMiddleware: RequestHandler = (req, res, next) => {
  if (req.path?.startsWith('/metrics')) {
    next();
    return;
  }

  const route = normalizeRoute(req);
  const gaugeLabels = { method: req.method, route } as const;
  httpActiveRequests.inc(gaugeLabels);
  const start = process.hrtime();
  let finished = false;

  const finalize = () => {
    if (finished) {
      return;
    }
    finished = true;
    httpActiveRequests.dec(gaugeLabels);
  };

  res.once('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    } as const;
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
    if (res.statusCode >= 500) {
      httpRequestErrors.inc(labels);
    }
    finalize();
  });

  res.once('close', () => {
    if (finished) {
      return;
    }
    const labels = {
      method: req.method,
      route,
      status_code: '499',
    } as const;
    httpRequestsTotal.inc(labels);
    httpRequestErrors.inc(labels);
    finalize();
  });

  next();
};

const serviceName =
  process.env.OTEL_SERVICE_NAME ||
  process.env.SERVICE_NAME ||
  'authz-gateway';
const serviceNamespace = process.env.SERVICE_NAMESPACE || 'summit';
const serviceVersion =
  process.env.SERVICE_VERSION || process.env.npm_package_version || '0.1.0';
const environment = process.env.NODE_ENV || 'development';
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: serviceNamespace,
  [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
  [SemanticResourceAttributes.SERVICE_INSTANCE_ID]:
    process.env.SERVICE_INSTANCE_ID || os.hostname(),
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
});

const traceEndpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter(
    traceEndpoint ? { url: traceEndpoint } : {},
  ),
  instrumentations: [getNodeAutoInstrumentations()],
});

let started = false;

export async function startObservability() {
  if (started) return;
  await sdk.start();
  started = true;
}

export async function stopObservability() {
  if (!started) return;
  await sdk.shutdown();
  started = false;
}

export async function metricsHandler(_req: Request, res: Response) {
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}

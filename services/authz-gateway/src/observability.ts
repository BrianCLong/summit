import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
  metrics as otelMetrics,
  trace,
  type Attributes,
} from '@opentelemetry/api';
import {
  Registry,
  collectDefaultMetrics,
  Histogram,
  Counter,
} from 'prom-client';
import type { Request, Response } from 'express';

const otlpEndpoint =
  process.env.OTLP_ENDPOINT ||
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
  'http://localhost:4318';
const otlpBase = otlpEndpoint.replace(/\/$/, '');

const serviceName =
  process.env.OTEL_SERVICE_NAME || process.env.SERVICE_NAME || 'authz-gateway';
const serviceNamespace = process.env.SERVICE_NAMESPACE || 'access-control';
const environment =
  process.env.SERVICE_ENV ||
  process.env.DEPLOYMENT_ENV ||
  process.env.NODE_ENV ||
  'development';
const purpose = process.env.SERVICE_PURPOSE || 'authz';

const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: serviceNamespace,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
  'app.purpose': purpose,
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({ url: `${otlpBase}/v1/traces` }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${otlpBase}/v1/metrics` }),
  }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: `${otlpBase}/v1/logs` }),
  ),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-pino': {
        enabled: true,
        logHook(span, record) {
          const spanContext = span.spanContext();
          record.trace_id = spanContext.traceId;
          record.span_id = spanContext.spanId;
          record.service = serviceName;
          record.environment = environment;
          record.purpose = purpose;
        },
      },
    }),
  ],
});

let started = false;
let sdkEnabled = true;

export const serviceDimensions = {
  service: serviceName,
  environment,
  purpose,
};

const registry = new Registry();
registry.setDefaultLabels(serviceDimensions);
collectDefaultMetrics({ register: registry });

const defaultTenant = 'unknown';

const graphqlDurationHistogram = new Histogram({
  name: 'graphql_request_duration',
  help: 'Duration of proxied GraphQL requests in seconds',
  buckets: [0.05, 0.1, 0.2, 0.35, 0.7, 1, 2, 5],
  labelNames: ['tenant', 'operation'],
  registers: [registry],
});

const errorRateCounter = new Counter({
  name: 'error_rate',
  help: 'Count of requests returning error responses (status >= 500)',
  labelNames: ['tenant', 'code'],
  registers: [registry],
});

const ingestEventsCounter = new Counter({
  name: 'ingest_events_processed',
  help: 'Count of authorization ingest events processed',
  labelNames: ['tenant', 'decision'],
  registers: [registry],
});

const meter = otelMetrics.getMeter(serviceName);
const graphqlDurationMetric = meter.createHistogram(
  'graphql_request_duration',
  {
    description: 'Duration of proxied GraphQL requests',
    unit: 's',
  },
);

const errorRateMetric = meter.createCounter('error_rate', {
  description: 'Number of gateway error responses (status >= 500)',
});

const ingestEventsMetric = meter.createCounter('ingest_events_processed', {
  description: 'Number of authorization ingest events processed',
});

function tenantLabel(tenantId?: string) {
  if (!tenantId) return defaultTenant;
  const trimmed = String(tenantId).trim();
  return trimmed.length > 0 ? trimmed : defaultTenant;
}

function baseAttributes(tenantId?: string, extra: Attributes = {}): Attributes {
  return {
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: serviceNamespace,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    'app.purpose': purpose,
    'app.tenant.id': tenantLabel(tenantId),
    ...extra,
  };
}

export function buildLogContext(tenantId?: string) {
  return {
    ...serviceDimensions,
    tenant: tenantLabel(tenantId),
  };
}

export function annotateActiveSpan(tenantId?: string, extra: Attributes = {}) {
  const span = trace.getActiveSpan();
  if (!span) return;
  span.setAttributes(baseAttributes(tenantId, extra));
}

export function recordGraphqlDuration(
  durationMs: number,
  tenantId?: string,
  operation?: string,
) {
  const operationName = operation?.trim() ? operation.trim() : 'unknown';
  const durationSeconds = durationMs / 1000;
  const tenant = tenantLabel(tenantId);
  graphqlDurationHistogram
    .labels(tenant, operationName)
    .observe(durationSeconds);
  graphqlDurationMetric.record(
    durationSeconds,
    baseAttributes(tenantId, {
      'graphql.operation.name': operationName,
    }),
  );
}

export function recordErrorRate(tenantId?: string, statusCode?: number) {
  const tenant = tenantLabel(tenantId);
  const code = statusCode ? String(statusCode) : 'unknown';
  errorRateCounter.labels(tenant, code).inc();
  errorRateMetric.add(
    1,
    baseAttributes(tenantId, { 'http.status_code': code }),
  );
}

export function recordIngestEvent(tenantId?: string, decision?: string) {
  const tenant = tenantLabel(tenantId);
  const outcome = decision?.trim() ? decision.trim() : 'unknown';
  ingestEventsCounter.labels(tenant, outcome).inc();
  ingestEventsMetric.add(
    1,
    baseAttributes(tenantId, { 'abac.decision': outcome }),
  );
}

export async function startObservability() {
  if (started) return;
  if (
    process.env.OTEL_SDK_DISABLED === 'true' ||
    process.env.NODE_ENV === 'test'
  ) {
    sdkEnabled = false;
    started = true;
    return;
  }
  await sdk.start();
  started = true;
}

export async function stopObservability() {
  if (!started || !sdkEnabled) {
    started = false;
    return;
  }
  await sdk.shutdown();
  started = false;
  sdkEnabled = true;
}

export async function metricsHandler(_req: Request, res: Response) {
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}

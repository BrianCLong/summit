import os from 'node:os';
import type { ClientRequest } from 'node:http';
import type { Request, RequestHandler, Response } from 'express';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  SpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger';
import {
  baggage,
  context,
  propagation,
  trace,
  type Context,
  type Sampler,
} from '@opentelemetry/api';
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

type ExporterKind = 'otlp' | 'jaeger' | 'zipkin';

export interface TracingConfig {
  exporters: ExporterKind[];
  otlpEndpoint?: string;
  jaegerEndpoint?: string;
  zipkinEndpoint?: string;
  sampling: {
    strategy: 'always_on' | 'always_off' | 'parentbased_ratio' | 'ratio';
    ratio: number;
  };
}

class CompositeSpanProcessor implements SpanProcessor {
  constructor(private readonly processors: SpanProcessor[]) {}

  onStart(...args: Parameters<SpanProcessor['onStart']>) {
    this.processors.forEach((processor) => processor.onStart(...args));
  }

  onEnd(...args: Parameters<SpanProcessor['onEnd']>) {
    this.processors.forEach((processor) => processor.onEnd(...args));
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.processors.map((processor) => processor.shutdown()));
  }

  async forceFlush(): Promise<void> {
    await Promise.all(
      this.processors.map((processor) => processor.forceFlush()),
    );
  }
}

export function buildTracingConfig(
  env: NodeJS.ProcessEnv = process.env,
): TracingConfig {
  const exporters = (
    env.TRACING_EXPORTERS ||
    env.OTEL_TRACES_EXPORTER ||
    'otlp'
  )
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ExporterKind =>
      ['otlp', 'jaeger', 'zipkin'].includes(value as ExporterKind),
    );

  const samplingRatio = Number(
    env.TRACE_SAMPLE_RATIO ?? env.OTEL_TRACES_SAMPLER_ARG ?? '1',
  );
  const boundedRatio = Number.isFinite(samplingRatio)
    ? Math.min(Math.max(samplingRatio, 0), 1)
    : 1;

  const strategy = (env.OTEL_TRACES_SAMPLER || '').toLowerCase();
  const samplingStrategy:
    | 'always_on'
    | 'always_off'
    | 'parentbased_ratio'
    | 'ratio' =
    strategy === 'always_off'
      ? 'always_off'
      : strategy === 'traceidratio'
        ? 'ratio'
        : strategy === 'parentbased_always_off'
          ? 'always_off'
          : strategy === 'parentbased_traceidratio'
            ? 'parentbased_ratio'
            : 'parentbased_ratio';

  return {
    exporters: exporters.length > 0 ? exporters : ['otlp'],
    otlpEndpoint:
      env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || env.OTEL_EXPORTER_OTLP_ENDPOINT,
    jaegerEndpoint: env.JAEGER_ENDPOINT || env.JAEGER_COLLECTOR_ENDPOINT,
    zipkinEndpoint: env.ZIPKIN_ENDPOINT,
    sampling: {
      strategy: samplingStrategy,
      ratio: boundedRatio,
    },
  };
}

export function createSampler(config: TracingConfig): Sampler {
  switch (config.sampling.strategy) {
    case 'always_off':
      return new AlwaysOffSampler();
    case 'always_on':
      return new AlwaysOnSampler();
    case 'ratio':
      return new TraceIdRatioBasedSampler(config.sampling.ratio);
    case 'parentbased_ratio':
    default:
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(config.sampling.ratio),
      });
  }
}

export function createPropagator() {
  return new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new W3CBaggagePropagator(),
      new JaegerPropagator(),
      new B3Propagator(),
    ],
  });
}

export function createSpanProcessors(config: TracingConfig): SpanProcessor[] {
  const processors: SpanProcessor[] = [];

  if (config.exporters.includes('otlp')) {
    processors.push(
      new BatchSpanProcessor(
        new OTLPTraceExporter(
          config.otlpEndpoint ? { url: config.otlpEndpoint } : {},
        ),
      ),
    );
  }

  if (config.exporters.includes('jaeger')) {
    processors.push(
      new BatchSpanProcessor(
        new JaegerExporter({
          endpoint:
            config.jaegerEndpoint || 'http://localhost:14268/api/traces',
        }),
      ),
    );
  }

  if (config.exporters.includes('zipkin')) {
    processors.push(
      new BatchSpanProcessor(
        new ZipkinExporter({
          url: config.zipkinEndpoint || 'http://localhost:9411/api/v2/spans',
        }),
      ),
    );
  }

  return processors;
}

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

function ensureGauge(name: string, factory: () => Gauge<'method' | 'route'>) {
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
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
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
  process.env.OTEL_SERVICE_NAME || process.env.SERVICE_NAME || 'authz-gateway';
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

const tracingConfig = buildTracingConfig();
const spanProcessors = createSpanProcessors(tracingConfig);
const spanProcessor = spanProcessors.length
  ? new CompositeSpanProcessor(spanProcessors)
  : new BatchSpanProcessor(
      new OTLPTraceExporter(
        tracingConfig.otlpEndpoint ? { url: tracingConfig.otlpEndpoint } : {},
      ),
    );

const sdk = new NodeSDK({
  resource,
  spanProcessor,
  sampler: createSampler(tracingConfig),
  textMapPropagator: createPropagator(),
  instrumentations: [getNodeAutoInstrumentations()],
});

function buildDefaultBaggage(currentContext: Context = context.active()) {
  const existing = propagation.getBaggage(currentContext) ?? baggage.create();
  return existing
    .setEntry('service.name', { value: serviceName })
    .setEntry('service.namespace', { value: serviceNamespace })
    .setEntry('service.version', { value: serviceVersion })
    .setEntry('deployment.environment', { value: environment });
}

export const tracingContextMiddleware: RequestHandler = (req, res, next) => {
  const extractedContext = propagation.extract(context.active(), req.headers);
  const mergedBaggage = propagation.setBaggage(
    extractedContext,
    buildDefaultBaggage(extractedContext),
  );

  return context.with(mergedBaggage, () => {
    const span = trace.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      res.setHeader('x-trace-id', spanContext.traceId);
      res.setHeader('x-span-id', spanContext.spanId);
    }
    next();
  });
};

export function attachAuthorizationBaggage(details: {
  subjectId: string;
  tenantId: string;
  resourceId: string;
  action: string;
  classification?: string;
  residency?: string;
}): Context {
  const base =
    propagation.getBaggage(context.active()) ?? buildDefaultBaggage();
  const updated = base
    .setEntry('subject.id', { value: details.subjectId })
    .setEntry('tenant.id', { value: details.tenantId })
    .setEntry('resource.id', { value: details.resourceId })
    .setEntry('action.name', { value: details.action })
    .setEntry('resource.classification', {
      value: details.classification || 'unknown',
    })
    .setEntry('resource.residency', { value: details.residency || 'unknown' });
  return propagation.setBaggage(context.active(), updated);
}

export function injectTraceContext(proxyReq: ClientRequest) {
  propagation.inject(context.active(), proxyReq, {
    set(carrier, key, value) {
      carrier.setHeader(key, value);
    },
  });
}

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

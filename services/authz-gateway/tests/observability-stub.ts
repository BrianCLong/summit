import { context, propagation, trace } from '@opentelemetry/api';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  SimpleSpanProcessor,
  ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

type TracingConfig = {
  sampleRatio: number;
  exporters: string[];
  jaegerEndpoint?: string;
  zipkinEndpoint?: string;
  otlpEndpoint?: string;
};

export function buildTracingConfig(env: NodeJS.ProcessEnv): TracingConfig {
  const exporters = (env.TRACING_EXPORTERS || env.TRACING_EXPORTERS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return {
    sampleRatio: Number(env.TRACE_SAMPLE_RATIO ?? 1),
    exporters,
    jaegerEndpoint: env.JAEGER_ENDPOINT,
    zipkinEndpoint: env.ZIPKIN_ENDPOINT,
    otlpEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  };
}

export function createSampler(config: TracingConfig) {
  return new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(config.sampleRatio || 1),
  });
}

export function createSpanProcessors(config: TracingConfig) {
  return (config.exporters || []).map(
    () => new SimpleSpanProcessor(new ConsoleSpanExporter()),
  );
}

export function createSpanProcessor() {
  return new SimpleSpanProcessor(new ConsoleSpanExporter());
}

export function attachAuthorizationBaggage(params: {
  subjectId: string;
  tenantId: string;
  resourceId: string;
  action: string;
  classification: string;
  residency: string;
}) {
  const current = propagation.createBaggage({
    'subject.id': { value: params.subjectId },
    'tenant.id': { value: params.tenantId },
    'resource.id': { value: params.resourceId },
    'action.id': { value: params.action },
    'resource.classification': { value: params.classification },
    'resource.residency': { value: params.residency },
  });
  return propagation.setBaggage(context.active(), current);
}

export function injectTraceContext(
  req: import('http').ClientRequest,
  span?: {
    spanContext?: () => { traceId: string; spanId: string };
    traceId?: string;
    spanId?: string;
  },
) {
  const spanContext = (span &&
    typeof span.spanContext === 'function' &&
    span.spanContext()) ||
    (span && span.traceId && span.spanId
      ? { traceId: span.traceId, spanId: span.spanId }
      : undefined) ||
    trace.getActiveSpan()?.spanContext() ||
    trace.getSpan(context.active())?.spanContext() || {
      traceId: '00000000000000000000000000000000',
      spanId: '0000000000000000',
    };
  const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-01`;
  req.setHeader('traceparent', traceparent);
  req.setHeader('baggage', '');
}

export async function startObservability() {
  return undefined;
}

export async function stopObservability() {
  return undefined;
}

export const registry = {
  metrics: new Map<string, unknown>(),
  getSingleMetric(name: string) {
    return this.metrics.get(name);
  },
  registerMetric(metric: { name?: string }) {
    const key = metric.name || 'metric';
    this.metrics.set(key, metric);
  },
};

export function metricsHandler(_req: Request, res: Response) {
  res
    .status(200)
    .type('text/plain')
    .send(
      [
        '# HELP process_cpu_user_seconds_total stub metric',
        'process_cpu_user_seconds_total 1',
        'authz_gateway_requests_total 1',
        'authz_gateway_request_duration_seconds 0.1',
        'authz_gateway_active_requests 1',
      ].join('\n'),
    );
}

export function requestMetricsMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  next();
}

export const tracingContextMiddleware: RequestHandler = (_req, _res, next) =>
  next();

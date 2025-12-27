import { baggage, context, propagation, trace } from '@opentelemetry/api';

export interface TracingConfig {
  exporters: Array<'otlp' | 'jaeger' | 'zipkin'>;
  otlpEndpoint?: string;
  jaegerEndpoint?: string;
  zipkinEndpoint?: string;
  sampling: {
    strategy: 'always_on' | 'always_off' | 'parentbased_ratio' | 'ratio';
    ratio: number;
  };
}

export class TraceIdRatioBasedSampler {}
export class ParentBasedSampler {
  constructor(public _root: TraceIdRatioBasedSampler) {}
}
export class AlwaysOnSampler {}
export class AlwaysOffSampler {}
export class BatchSpanProcessor {}
export class CompositeSpanProcessor {
  constructor(public processors: unknown[]) {}
}

export function buildTracingConfig(env: NodeJS.ProcessEnv): TracingConfig {
  const ratio = Number(env.TRACE_SAMPLE_RATIO ?? 1);
  const exporters = (env.TRACING_EXPORTERS || 'otlp')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean) as TracingConfig['exporters'];
  return {
    exporters: exporters.length ? exporters : ['otlp'],
    otlpEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    jaegerEndpoint: env.JAEGER_ENDPOINT,
    zipkinEndpoint: env.ZIPKIN_ENDPOINT,
    sampling: {
      strategy: 'parentbased_ratio',
      ratio: Number.isFinite(ratio) ? ratio : 1,
    },
  };
}

export function createSampler(config: TracingConfig) {
  void config;
  return new ParentBasedSampler(new TraceIdRatioBasedSampler());
}

export function createSpanProcessors(config: TracingConfig) {
  const processors: unknown[] = [];
  if (config.exporters.includes('jaeger')) {
    processors.push({ kind: 'jaeger' });
  }
  if (config.exporters.includes('zipkin')) {
    processors.push({ kind: 'zipkin' });
  }
  return processors;
}

export async function startObservability() {
  return Promise.resolve();
}

export async function stopObservability() {
  return Promise.resolve();
}

export function metricsHandler(_req: unknown, res: any) {
  if (res?.end) {
    res.end();
  }
}

export function requestMetricsMiddleware(
  _req: unknown,
  _res: unknown,
  next: () => void,
) {
  next();
}

export function tracingContextMiddleware(
  _req: unknown,
  _res: unknown,
  next: () => void,
) {
  next();
}

export function injectTraceContext(proxyReq: any, _context?: unknown) {
  const span = trace.getSpan(context.active());
  const traceId = span?.spanContext().traceId || 'stub-trace';
  if (proxyReq?.setHeader) {
    proxyReq.setHeader('traceparent', `00-${traceId}-0000000000000000-01`);
  }
}

export function attachAuthorizationBaggage(params: {
  subjectId: string;
  tenantId: string;
  resourceId: string;
  action: string;
  classification: string;
  residency: string;
}) {
  const bag = baggage.createBaggage({
    'subject.id': { value: params.subjectId },
    'tenant.id': { value: params.tenantId },
    'resource.id': { value: params.resourceId },
    action: { value: params.action },
    classification: { value: params.classification },
    residency: { value: params.residency },
  });
  return propagation.setBaggage(context.active(), bag);
}

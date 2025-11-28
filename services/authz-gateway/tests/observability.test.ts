import { propagation } from '@opentelemetry/api';
import {
  BasicTracerProvider,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import {
  attachAuthorizationBaggage,
  buildTracingConfig,
  createSampler,
  createSpanProcessors,
  injectTraceContext,
} from '../src/observability';

describe('observability tracing configuration', () => {
  it('creates a parent based sampler with bounded ratio by default', () => {
    const config = buildTracingConfig({
      TRACE_SAMPLE_RATIO: '0.5',
    } as NodeJS.ProcessEnv);
    const sampler = createSampler(config);
    expect(sampler).toBeInstanceOf(ParentBasedSampler);
    const inner = (sampler as ParentBasedSampler)['_root'];
    expect(inner).toBeInstanceOf(TraceIdRatioBasedSampler);
  });

  it('supports jaeger and zipkin exporters together', () => {
    const config = buildTracingConfig({
      TRACING_EXPORTERS: 'jaeger,zipkin',
      JAEGER_ENDPOINT: 'http://jaeger:14268/api/traces',
      ZIPKIN_ENDPOINT: 'http://zipkin:9411/api/v2/spans',
    } as NodeJS.ProcessEnv);
    const processors = createSpanProcessors(config);
    expect(processors).toHaveLength(2);
  });
});

describe('trace context propagation', () => {
  it('injects trace headers into proxy requests', async () => {
    const provider = new BasicTracerProvider();
    provider.register();
    const tracer = provider.getTracer('test-proxy');
    const headers: Record<string, string> = {};

    tracer.startActiveSpan('proxy-span', (span) => {
      injectTraceContext({
        setHeader: (key: string, value: unknown) => {
          headers[key] = String(value);
        },
      } as unknown as import('http').ClientRequest);
      expect(headers.traceparent).toContain(span.spanContext().traceId);
      span.end();
    });

    await provider.shutdown();
  });

  it('adds authorization baggage entries for downstream spans', () => {
    const provider = new BasicTracerProvider();
    provider.register();
    const tracer = provider.getTracer('baggage-test');

    tracer.startActiveSpan('baggage-span', (span) => {
      const ctx = attachAuthorizationBaggage({
        subjectId: 'user-1',
        tenantId: 'tenant-2',
        resourceId: 'res-3',
        action: 'read',
        classification: 'secret',
        residency: 'us',
      });
      const downstreamBaggage = propagation.getBaggage(ctx);
      expect(downstreamBaggage?.getEntry('tenant.id')?.value).toBe('tenant-2');
      expect(downstreamBaggage?.getEntry('resource.id')?.value).toBe('res-3');
      span.end();
    });

    await provider.shutdown();
  });
});

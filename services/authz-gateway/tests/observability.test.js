"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@opentelemetry/api");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const observability_1 = require("../src/observability");
describe('observability tracing configuration', () => {
    it('creates a parent based sampler with bounded ratio by default', () => {
        const config = (0, observability_1.buildTracingConfig)({
            TRACE_SAMPLE_RATIO: '0.5',
        });
        const sampler = (0, observability_1.createSampler)(config);
        expect(sampler).toBeInstanceOf(sdk_trace_base_1.ParentBasedSampler);
        const inner = sampler['_root'];
        expect(inner).toBeInstanceOf(sdk_trace_base_1.TraceIdRatioBasedSampler);
    });
    it('supports jaeger and zipkin exporters together', () => {
        const config = (0, observability_1.buildTracingConfig)({
            TRACING_EXPORTERS: 'jaeger,zipkin',
            JAEGER_ENDPOINT: 'http://jaeger:14268/api/traces',
            ZIPKIN_ENDPOINT: 'http://zipkin:9411/api/v2/spans',
        });
        const processors = (0, observability_1.createSpanProcessors)(config);
        expect(processors).toHaveLength(2);
    });
});
describe('trace context propagation', () => {
    it('injects trace headers into proxy requests', async () => {
        const provider = new sdk_trace_base_1.BasicTracerProvider();
        provider.register();
        const tracer = provider.getTracer('test-proxy');
        const headers = {};
        tracer.startActiveSpan('proxy-span', (span) => {
            (0, observability_1.injectTraceContext)({
                setHeader: (key, value) => {
                    headers[key] = String(value);
                },
            });
            expect(headers.traceparent).toContain(span.spanContext().traceId);
            span.end();
        });
        await provider.shutdown();
    });
    it('adds authorization baggage entries for downstream spans', () => {
        const provider = new sdk_trace_base_1.BasicTracerProvider();
        provider.register();
        const tracer = provider.getTracer('baggage-test');
        tracer.startActiveSpan('baggage-span', (span) => {
            const ctx = (0, observability_1.attachAuthorizationBaggage)({
                subjectId: 'user-1',
                tenantId: 'tenant-2',
                resourceId: 'res-3',
                action: 'read',
                classification: 'secret',
                residency: 'us',
            });
            const downstreamBaggage = api_1.propagation.getBaggage(ctx);
            expect(downstreamBaggage?.getEntry('tenant.id')?.value).toBe('tenant-2');
            expect(downstreamBaggage?.getEntry('resource.id')?.value).toBe('res-3');
            span.end();
        });
        await provider.shutdown();
    });
});

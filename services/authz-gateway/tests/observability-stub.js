"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracingContextMiddleware = exports.registry = void 0;
exports.buildTracingConfig = buildTracingConfig;
exports.createSampler = createSampler;
exports.createSpanProcessors = createSpanProcessors;
exports.createSpanProcessor = createSpanProcessor;
exports.attachAuthorizationBaggage = attachAuthorizationBaggage;
exports.injectTraceContext = injectTraceContext;
exports.startObservability = startObservability;
exports.stopObservability = stopObservability;
exports.metricsHandler = metricsHandler;
exports.requestMetricsMiddleware = requestMetricsMiddleware;
const api_1 = require("@opentelemetry/api");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
function buildTracingConfig(env) {
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
function createSampler(config) {
    return new sdk_trace_base_1.ParentBasedSampler({
        root: new sdk_trace_base_1.TraceIdRatioBasedSampler(config.sampleRatio || 1),
    });
}
function createSpanProcessors(config) {
    return (config.exporters || []).map(() => new sdk_trace_base_1.SimpleSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter()));
}
function createSpanProcessor() {
    return new sdk_trace_base_1.SimpleSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter());
}
function attachAuthorizationBaggage(params) {
    const current = api_1.propagation.createBaggage({
        'subject.id': { value: params.subjectId },
        'tenant.id': { value: params.tenantId },
        'resource.id': { value: params.resourceId },
        'action.id': { value: params.action },
        'resource.classification': { value: params.classification },
        'resource.residency': { value: params.residency },
    });
    return api_1.propagation.setBaggage(api_1.context.active(), current);
}
function injectTraceContext(req, span) {
    const spanContext = (span &&
        typeof span.spanContext === 'function' &&
        span.spanContext()) ||
        (span && span.traceId && span.spanId
            ? { traceId: span.traceId, spanId: span.spanId }
            : undefined) ||
        api_1.trace.getActiveSpan()?.spanContext() ||
        api_1.trace.getSpan(api_1.context.active())?.spanContext() || {
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
    };
    const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-01`;
    req.setHeader('traceparent', traceparent);
    req.setHeader('baggage', '');
}
async function startObservability() {
    return undefined;
}
async function stopObservability() {
    return undefined;
}
exports.registry = {
    metrics: new Map(),
    getSingleMetric(name) {
        return this.metrics.get(name);
    },
    registerMetric(metric) {
        const key = metric.name || 'metric';
        this.metrics.set(key, metric);
    },
};
function metricsHandler(_req, res) {
    res
        .status(200)
        .type('text/plain')
        .send([
        '# HELP process_cpu_user_seconds_total stub metric',
        'process_cpu_user_seconds_total 1',
        'authz_gateway_requests_total 1',
        'authz_gateway_request_duration_seconds 0.1',
        'authz_gateway_active_requests 1',
    ].join('\n'));
}
function requestMetricsMiddleware(_req, _res, next) {
    next();
}
const tracingContextMiddleware = (_req, _res, next) => next();
exports.tracingContextMiddleware = tracingContextMiddleware;

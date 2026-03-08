"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeSpanProcessor = exports.BatchSpanProcessor = exports.AlwaysOffSampler = exports.AlwaysOnSampler = exports.ParentBasedSampler = exports.TraceIdRatioBasedSampler = void 0;
exports.buildTracingConfig = buildTracingConfig;
exports.createSampler = createSampler;
exports.createSpanProcessors = createSpanProcessors;
exports.startObservability = startObservability;
exports.stopObservability = stopObservability;
exports.metricsHandler = metricsHandler;
exports.requestMetricsMiddleware = requestMetricsMiddleware;
exports.tracingContextMiddleware = tracingContextMiddleware;
exports.injectTraceContext = injectTraceContext;
exports.attachAuthorizationBaggage = attachAuthorizationBaggage;
const api_1 = require("@opentelemetry/api");
class TraceIdRatioBasedSampler {
}
exports.TraceIdRatioBasedSampler = TraceIdRatioBasedSampler;
class ParentBasedSampler {
    _root;
    constructor(_root) {
        this._root = _root;
    }
}
exports.ParentBasedSampler = ParentBasedSampler;
class AlwaysOnSampler {
}
exports.AlwaysOnSampler = AlwaysOnSampler;
class AlwaysOffSampler {
}
exports.AlwaysOffSampler = AlwaysOffSampler;
class BatchSpanProcessor {
}
exports.BatchSpanProcessor = BatchSpanProcessor;
class CompositeSpanProcessor {
    processors;
    constructor(processors) {
        this.processors = processors;
    }
}
exports.CompositeSpanProcessor = CompositeSpanProcessor;
function buildTracingConfig(env) {
    const ratio = Number(env.TRACE_SAMPLE_RATIO ?? 1);
    const exporters = (env.TRACING_EXPORTERS || 'otlp')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
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
function createSampler(config) {
    void config;
    return new ParentBasedSampler(new TraceIdRatioBasedSampler());
}
function createSpanProcessors(config) {
    const processors = [];
    if (config.exporters.includes('jaeger')) {
        processors.push({ kind: 'jaeger' });
    }
    if (config.exporters.includes('zipkin')) {
        processors.push({ kind: 'zipkin' });
    }
    return processors;
}
async function startObservability() {
    return Promise.resolve();
}
async function stopObservability() {
    return Promise.resolve();
}
function metricsHandler(_req, res) {
    if (res?.end) {
        res.end();
    }
}
function requestMetricsMiddleware(_req, _res, next) {
    next();
}
function tracingContextMiddleware(_req, _res, next) {
    next();
}
function injectTraceContext(proxyReq) {
    const span = api_1.trace.getSpan(api_1.context.active());
    const traceId = span?.spanContext().traceId || 'stub-trace';
    if (proxyReq?.setHeader) {
        proxyReq.setHeader('traceparent', `00-${traceId}-0000000000000000-01`);
    }
}
function attachAuthorizationBaggage(params) {
    const bag = api_1.baggage.createBaggage({
        'subject.id': { value: params.subjectId },
        'tenant.id': { value: params.tenantId },
        'resource.id': { value: params.resourceId },
        action: { value: params.action },
        classification: { value: params.classification },
        residency: { value: params.residency },
    });
    return api_1.propagation.setBaggage(api_1.context.active(), bag);
}

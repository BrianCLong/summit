"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracingContextMiddleware = exports.requestMetricsMiddleware = exports.registry = void 0;
exports.buildTracingConfig = buildTracingConfig;
exports.createSampler = createSampler;
exports.createPropagator = createPropagator;
exports.createSpanProcessors = createSpanProcessors;
exports.attachAuthorizationBaggage = attachAuthorizationBaggage;
exports.injectTraceContext = injectTraceContext;
exports.startObservability = startObservability;
exports.stopObservability = stopObservability;
exports.metricsHandler = metricsHandler;
// @ts-nocheck
const node_os_1 = __importDefault(require("node:os"));
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const exporter_zipkin_1 = require("@opentelemetry/exporter-zipkin");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const core_1 = require("@opentelemetry/core");
const propagator_b3_1 = require("@opentelemetry/propagator-b3");
const propagator_jaeger_1 = require("@opentelemetry/propagator-jaeger");
const api_1 = require("@opentelemetry/api");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const prom_client_1 = require("prom-client");
exports.registry = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({ register: exports.registry });
class CompositeSpanProcessor {
    processors;
    constructor(processors) {
        this.processors = processors;
    }
    onStart(...args) {
        this.processors.forEach((processor) => processor.onStart(...args));
    }
    onEnd(...args) {
        this.processors.forEach((processor) => processor.onEnd(...args));
    }
    async shutdown() {
        await Promise.all(this.processors.map((processor) => processor.shutdown()));
    }
    async forceFlush() {
        await Promise.all(this.processors.map((processor) => processor.forceFlush()));
    }
}
function buildTracingConfig(env = process.env) {
    const exporters = (env.TRACING_EXPORTERS ||
        env.OTEL_TRACES_EXPORTER ||
        'otlp')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => ['otlp', 'jaeger', 'zipkin'].includes(value));
    const samplingRatio = Number(env.TRACE_SAMPLE_RATIO ?? env.OTEL_TRACES_SAMPLER_ARG ?? '1');
    const boundedRatio = Number.isFinite(samplingRatio)
        ? Math.min(Math.max(samplingRatio, 0), 1)
        : 1;
    const strategy = (env.OTEL_TRACES_SAMPLER || '').toLowerCase();
    const samplingStrategy = strategy === 'always_off'
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
        otlpEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || env.OTEL_EXPORTER_OTLP_ENDPOINT,
        jaegerEndpoint: env.JAEGER_ENDPOINT || env.JAEGER_COLLECTOR_ENDPOINT,
        zipkinEndpoint: env.ZIPKIN_ENDPOINT,
        sampling: {
            strategy: samplingStrategy,
            ratio: boundedRatio,
        },
    };
}
function createSampler(config) {
    switch (config.sampling.strategy) {
        case 'always_off':
            return new sdk_trace_base_1.AlwaysOffSampler();
        case 'always_on':
            return new sdk_trace_base_1.AlwaysOnSampler();
        case 'ratio':
            return new sdk_trace_base_1.TraceIdRatioBasedSampler(config.sampling.ratio);
        case 'parentbased_ratio':
        default:
            return new sdk_trace_base_1.ParentBasedSampler({
                root: new sdk_trace_base_1.TraceIdRatioBasedSampler(config.sampling.ratio),
            });
    }
}
function createPropagator() {
    return new core_1.CompositePropagator({
        propagators: [
            new core_1.W3CTraceContextPropagator(),
            new core_1.W3CBaggagePropagator(),
            new propagator_jaeger_1.JaegerPropagator(),
            new propagator_b3_1.B3Propagator(),
        ],
    });
}
function createSpanProcessors(config) {
    const processors = [];
    if (config.exporters.includes('otlp')) {
        processors.push(new sdk_trace_base_1.BatchSpanProcessor(new exporter_trace_otlp_http_1.OTLPTraceExporter(config.otlpEndpoint ? { url: config.otlpEndpoint } : {})));
    }
    if (config.exporters.includes('jaeger')) {
        processors.push(new sdk_trace_base_1.BatchSpanProcessor(new exporter_jaeger_1.JaegerExporter({
            endpoint: config.jaegerEndpoint || 'http://localhost:14268/api/traces',
        })));
    }
    if (config.exporters.includes('zipkin')) {
        processors.push(new sdk_trace_base_1.BatchSpanProcessor(new exporter_zipkin_1.ZipkinExporter({
            url: config.zipkinEndpoint || 'http://localhost:9411/api/v2/spans',
        })));
    }
    return processors;
}
function ensureCounter(name, factory) {
    const existing = exports.registry.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    const metric = factory();
    exports.registry.registerMetric(metric);
    return metric;
}
function ensureHistogram(name, factory) {
    const existing = exports.registry.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    const metric = factory();
    exports.registry.registerMetric(metric);
    return metric;
}
function ensureGauge(name, factory) {
    const existing = exports.registry.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    const metric = factory();
    exports.registry.registerMetric(metric);
    return metric;
}
const httpRequestsTotal = ensureCounter('authz_gateway_requests_total', () => new prom_client_1.Counter({
    name: 'authz_gateway_requests_total',
    help: 'Total number of HTTP requests processed by the AuthZ gateway.',
    labelNames: ['method', 'route', 'status_code'],
}));
const httpRequestDuration = ensureHistogram('authz_gateway_request_duration_seconds', () => new prom_client_1.Histogram({
    name: 'authz_gateway_request_duration_seconds',
    help: 'Duration of HTTP requests handled by the AuthZ gateway.',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
}));
const httpRequestErrors = ensureCounter('authz_gateway_request_errors_total', () => new prom_client_1.Counter({
    name: 'authz_gateway_request_errors_total',
    help: 'Total number of HTTP requests that resulted in server errors.',
    labelNames: ['method', 'route', 'status_code'],
}));
const httpActiveRequests = ensureGauge('authz_gateway_active_requests', () => new prom_client_1.Gauge({
    name: 'authz_gateway_active_requests',
    help: 'Current number of in-flight HTTP requests.',
    labelNames: ['method', 'route'],
}));
function normalizeRoute(req) {
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
const requestMetricsMiddleware = (req, res, next) => {
    if (req.path?.startsWith('/metrics')) {
        next();
        return;
    }
    const route = normalizeRoute(req);
    const gaugeLabels = { method: req.method, route };
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
        };
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
        };
        httpRequestsTotal.inc(labels);
        httpRequestErrors.inc(labels);
        finalize();
    });
    next();
};
exports.requestMetricsMiddleware = requestMetricsMiddleware;
const serviceName = process.env.OTEL_SERVICE_NAME || process.env.SERVICE_NAME || 'authz-gateway';
const serviceNamespace = process.env.SERVICE_NAMESPACE || 'summit';
const serviceVersion = process.env.SERVICE_VERSION || process.env.npm_package_version || '0.1.0';
const environment = process.env.NODE_ENV || 'development';
const resource = new resources_1.Resource({
    [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAMESPACE]: serviceNamespace,
    [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [semantic_conventions_1.SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.SERVICE_INSTANCE_ID || node_os_1.default.hostname(),
    [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
});
const tracingConfig = buildTracingConfig();
const spanProcessors = createSpanProcessors(tracingConfig);
const spanProcessor = spanProcessors.length
    ? new CompositeSpanProcessor(spanProcessors)
    : new sdk_trace_base_1.BatchSpanProcessor(new exporter_trace_otlp_http_1.OTLPTraceExporter(tracingConfig.otlpEndpoint ? { url: tracingConfig.otlpEndpoint } : {}));
const sdk = new sdk_node_1.NodeSDK({
    resource,
    spanProcessor,
    sampler: createSampler(tracingConfig),
    textMapPropagator: createPropagator(),
    instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
});
function buildDefaultBaggage(currentContext = api_1.context.active()) {
    const existing = api_1.propagation.getBaggage(currentContext) ?? api_1.baggage.create();
    return existing
        .setEntry('service.name', { value: serviceName })
        .setEntry('service.namespace', { value: serviceNamespace })
        .setEntry('service.version', { value: serviceVersion })
        .setEntry('deployment.environment', { value: environment });
}
const tracingContextMiddleware = (req, res, next) => {
    const extractedContext = api_1.propagation.extract(api_1.context.active(), req.headers);
    const mergedBaggage = api_1.propagation.setBaggage(extractedContext, buildDefaultBaggage(extractedContext));
    return api_1.context.with(mergedBaggage, () => {
        const span = api_1.trace.getActiveSpan();
        if (span) {
            const spanContext = span.spanContext();
            res.setHeader('x-trace-id', spanContext.traceId);
            res.setHeader('x-span-id', spanContext.spanId);
        }
        next();
    });
};
exports.tracingContextMiddleware = tracingContextMiddleware;
function attachAuthorizationBaggage(details) {
    const base = api_1.propagation.getBaggage(api_1.context.active()) ?? buildDefaultBaggage();
    const updated = base
        .setEntry('subject.id', { value: details.subjectId })
        .setEntry('tenant.id', { value: details.tenantId })
        .setEntry('resource.id', { value: details.resourceId })
        .setEntry('action.name', { value: details.action })
        .setEntry('resource.classification', {
        value: details.classification || 'unknown',
    })
        .setEntry('resource.residency', { value: details.residency || 'unknown' });
    return api_1.propagation.setBaggage(api_1.context.active(), updated);
}
function injectTraceContext(proxyReq) {
    api_1.propagation.inject(api_1.context.active(), proxyReq, {
        set(carrier, key, value) {
            carrier.setHeader(key, value);
        },
    });
}
let started = false;
async function startObservability() {
    if (started)
        return;
    await sdk.start();
    started = true;
}
async function stopObservability() {
    if (!started)
        return;
    await sdk.shutdown();
    started = false;
}
async function metricsHandler(_req, res) {
    res.setHeader('Content-Type', exports.registry.contentType);
    res.end(await exports.registry.metrics());
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxSpans = void 0;
exports.initTracing = initTracing;
exports.shutdownTracing = shutdownTracing;
exports.getTracer = getTracer;
exports.withSpan = withSpan;
exports.extractTraceContext = extractTraceContext;
exports.injectTraceHeaders = injectTraceHeaders;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_grpc_1 = require("@opentelemetry/exporter-trace-otlp-grpc");
const exporter_metrics_otlp_grpc_1 = require("@opentelemetry/exporter-metrics-otlp-grpc");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_graphql_1 = require("@opentelemetry/instrumentation-graphql");
const instrumentation_pino_1 = require("@opentelemetry/instrumentation-pino");
const api_2 = require("@opentelemetry/api");
// Configure diagnostic logging
if (process.env.OTEL_DEBUG === 'true') {
    api_1.diag.setLogger(new api_1.DiagConsoleLogger(), api_1.DiagLogLevel.DEBUG);
}
// Service information
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'sandbox-gateway';
const SERVICE_VERSION = process.env.npm_package_version || '1.0.0';
const DEPLOYMENT_ENV = process.env.NODE_ENV || 'development';
// OTLP endpoint
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
// Create resource
const resource = new resources_1.Resource({
    [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
    [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
    [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: DEPLOYMENT_ENV,
    [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAMESPACE]: 'intelgraph',
    'service.component': 'sandbox',
});
// Create trace exporter
const traceExporter = new exporter_trace_otlp_grpc_1.OTLPTraceExporter({
    url: OTLP_ENDPOINT,
});
// Create metric exporter
const metricExporter = new exporter_metrics_otlp_grpc_1.OTLPMetricExporter({
    url: OTLP_ENDPOINT,
});
// Create metric reader
const metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000,
});
// Initialize SDK
let sdk = null;
function initTracing() {
    if (sdk) {
        return; // Already initialized
    }
    sdk = new sdk_node_1.NodeSDK({
        resource,
        traceExporter,
        metricReader,
        textMapPropagator: new core_1.W3CTraceContextPropagator(),
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                '@opentelemetry/instrumentation-fs': {
                    enabled: false, // Disable file system instrumentation for performance
                },
            }),
            new instrumentation_http_1.HttpInstrumentation({
                ignoreIncomingPaths: ['/health', '/health/live', '/health/ready', '/metrics'],
                requestHook: (span, request) => {
                    span.setAttribute('http.request.id', request.headers['x-request-id'] || 'unknown');
                },
            }),
            new instrumentation_express_1.ExpressInstrumentation({
                ignoreLayers: [],
                ignoreLayersType: [],
            }),
            new instrumentation_graphql_1.GraphQLInstrumentation({
                depth: 5,
                mergeItems: true,
                allowValues: process.env.NODE_ENV !== 'production',
            }),
            new instrumentation_pino_1.PinoInstrumentation({
                logHook: (span, record) => {
                    record['trace_id'] = span.spanContext().traceId;
                    record['span_id'] = span.spanContext().spanId;
                },
            }),
        ],
    });
    sdk.start();
    // Graceful shutdown
    process.on('SIGTERM', () => {
        sdk?.shutdown().catch(console.error);
    });
}
function shutdownTracing() {
    if (!sdk) {
        return Promise.resolve();
    }
    return sdk.shutdown();
}
// Get tracer for custom spans
function getTracer() {
    return api_2.trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
}
async function withSpan(options, fn) {
    const tracer = getTracer();
    return tracer.startActiveSpan(options.name, {
        kind: options.kind || api_2.SpanKind.INTERNAL,
        attributes: options.attributes,
    }, async (span) => {
        try {
            const result = await fn(span);
            span.setStatus({ code: api_2.SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.setStatus({
                code: api_2.SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    });
}
// Sandbox-specific tracing helpers
exports.SandboxSpans = {
    createSandbox: (sandboxId, userId) => ({
        name: 'sandbox.create',
        kind: api_2.SpanKind.INTERNAL,
        attributes: {
            'sandbox.id': sandboxId,
            'sandbox.user_id': userId,
            'sandbox.operation': 'create',
        },
    }),
    enforcementCheck: (sandboxId, operation) => ({
        name: 'sandbox.enforcement.check',
        kind: api_2.SpanKind.INTERNAL,
        attributes: {
            'sandbox.id': sandboxId,
            'sandbox.operation': operation,
            'enforcement.type': 'policy',
        },
    }),
    linkbackAttempt: (sandboxId, targetId, blocked) => ({
        name: 'sandbox.linkback.attempt',
        kind: api_2.SpanKind.INTERNAL,
        attributes: {
            'sandbox.id': sandboxId,
            'linkback.target_id': targetId,
            'linkback.blocked': blocked,
        },
    }),
    dataClone: (sandboxId, strategy, sourceType) => ({
        name: 'datalab.clone',
        kind: api_2.SpanKind.INTERNAL,
        attributes: {
            'sandbox.id': sandboxId,
            'clone.strategy': strategy,
            'clone.source_type': sourceType,
        },
    }),
    syntheticDataGeneration: (sandboxId, entityCount) => ({
        name: 'datalab.synthetic.generate',
        kind: api_2.SpanKind.INTERNAL,
        attributes: {
            'sandbox.id': sandboxId,
            'synthetic.entity_count': entityCount,
        },
    }),
    promotionRequest: (sandboxId, targetTenantId, promotionType) => ({
        name: 'sandbox.promotion.request',
        kind: api_2.SpanKind.INTERNAL,
        attributes: {
            'sandbox.id': sandboxId,
            'promotion.target_tenant_id': targetTenantId,
            'promotion.type': promotionType,
        },
    }),
    promotionExecution: (requestId) => ({
        name: 'sandbox.promotion.execute',
        kind: api_2.SpanKind.INTERNAL,
        attributes: {
            'promotion.request_id': requestId,
            'promotion.operation': 'execute',
        },
    }),
};
// Context propagation helper
function extractTraceContext(headers) {
    return api_2.context.active();
}
// Add trace ID to response headers
function injectTraceHeaders(headers) {
    const activeSpan = api_2.trace.getActiveSpan();
    if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        headers['x-trace-id'] = spanContext.traceId;
        headers['x-span-id'] = spanContext.spanId;
    }
    return headers;
}

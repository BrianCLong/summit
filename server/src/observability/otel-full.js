"use strict";
// @ts-nocheck
/**
 * Full OpenTelemetry Tracing Implementation
 * Provides distributed tracing across all services with Jaeger/OTLP export
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.context = exports.trace = exports.SpanKind = exports.SpanStatusCode = void 0;
exports.initializeOTel = initializeOTel;
exports.getTracer = getTracer;
exports.withSpan = withSpan;
exports.traceDbOperation = traceDbOperation;
exports.traceGraphQLOperation = traceGraphQLOperation;
exports.traceHttpCall = traceHttpCall;
exports.addSpanAttribute = addSpanAttribute;
exports.recordException = recordException;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const api_1 = require("@opentelemetry/api");
Object.defineProperty(exports, "trace", { enumerable: true, get: function () { return api_1.trace; } });
Object.defineProperty(exports, "context", { enumerable: true, get: function () { return api_1.context; } });
Object.defineProperty(exports, "SpanStatusCode", { enumerable: true, get: function () { return api_1.SpanStatusCode; } });
Object.defineProperty(exports, "SpanKind", { enumerable: true, get: function () { return api_1.SpanKind; } });
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// Configuration
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'intelgraph-server';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const OTEL_ENABLED = process.env.OTEL_ENABLED !== 'false';
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
const JAEGER_ENDPOINT = process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces';
// Resource definition
const resource = resources_1.Resource.default().merge(new resources_1.Resource({
    [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
    [semantic_conventions_1.SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
    [semantic_conventions_1.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: ENVIRONMENT,
}));
let sdk = null;
/**
 * Initialize OpenTelemetry SDK with auto-instrumentation
 */
function initializeOTel() {
    if (!OTEL_ENABLED) {
        logger_js_1.default.info('OpenTelemetry tracing is disabled');
        return null;
    }
    // Trace exporter (OTLP)
    const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: OTLP_ENDPOINT,
        headers: {},
    });
    // Metrics exporter (Prometheus)
    const prometheusExporter = new exporter_prometheus_1.PrometheusExporter({
        port: 9464,
        endpoint: '/metrics',
    }, () => {
        logger_js_1.default.info(`Prometheus metrics available at http://localhost:9464/metrics`);
    });
    sdk = new sdk_node_1.NodeSDK({
        resource,
        traceExporter,
        metricReader: prometheusExporter,
        spanProcessor: ENVIRONMENT === 'development'
            ? new sdk_trace_node_1.SimpleSpanProcessor(new sdk_trace_node_1.ConsoleSpanExporter())
            : new sdk_trace_node_1.BatchSpanProcessor(traceExporter, {
                maxQueueSize: 2048,
                maxExportBatchSize: 512,
                scheduledDelayMillis: 5000,
                exportTimeoutMillis: 30000,
            }),
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                '@opentelemetry/instrumentation-http': {
                    enabled: true,
                    ignoreIncomingPaths: ['/health', '/metrics', '/ready'],
                },
                '@opentelemetry/instrumentation-express': { enabled: true },
                '@opentelemetry/instrumentation-pg': { enabled: true },
                '@opentelemetry/instrumentation-redis': { enabled: true },
                '@opentelemetry/instrumentation-graphql': { enabled: true },
                '@opentelemetry/instrumentation-ioredis': { enabled: true },
            }),
        ],
    });
    sdk.start();
    logger_js_1.default.info('OpenTelemetry SDK initialized', {
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        environment: ENVIRONMENT,
        otlpEndpoint: OTLP_ENDPOINT,
    });
    // Graceful shutdown
    process.on('SIGTERM', () => {
        sdk?.shutdown()
            .then(() => logger_js_1.default.info('OpenTelemetry SDK shut down successfully'))
            .catch((error) => logger_js_1.default.error('Error shutting down OpenTelemetry SDK', error));
    });
    return sdk;
}
/**
 * Get the active tracer
 */
function getTracer(name = SERVICE_NAME) {
    return api_1.trace.getTracer(name, SERVICE_VERSION);
}
/**
 * Create a custom span with automatic error handling
 */
async function withSpan(name, fn, attributes) {
    const tracer = getTracer();
    return tracer.startActiveSpan(name, async (span) => {
        try {
            if (attributes) {
                span.setAttributes(attributes);
            }
            const result = await fn(span);
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: error.message,
            });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
/**
 * Trace database operations with detailed metrics
 */
async function traceDbOperation(operation, dbType, query, fn) {
    return withSpan(`db.${dbType}.${operation}`, async (span) => {
        span.setAttributes({
            'db.system': dbType,
            'db.operation': operation,
            'db.statement': query.substring(0, 500), // Truncate long queries
        });
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;
        span.setAttributes({
            'db.duration_ms': duration,
        });
        return result;
    });
}
/**
 * Trace GraphQL operations
 */
async function traceGraphQLOperation(operationName, operationType, fn) {
    return withSpan(`graphql.${operationType}.${operationName}`, async (span) => {
        span.setAttributes({
            'graphql.operation.name': operationName,
            'graphql.operation.type': operationType,
        });
        return await fn();
    });
}
/**
 * Trace external HTTP calls
 */
async function traceHttpCall(method, url, fn) {
    return withSpan(`http.client.${method}`, async (span) => {
        span.setAttributes({
            'http.method': method,
            'http.url': url,
            'span.kind': api_1.SpanKind.CLIENT,
        });
        return await fn();
    });
}
/**
 * Add custom attributes to the current active span
 */
function addSpanAttribute(key, value) {
    const span = api_1.trace.getActiveSpan();
    if (span) {
        span.setAttribute(key, value);
    }
}
/**
 * Record an exception in the current span
 */
function recordException(error, attributes) {
    const span = api_1.trace.getActiveSpan();
    if (span) {
        span.recordException(error);
        if (attributes) {
            span.setAttributes(attributes);
        }
        span.setStatus({ code: api_1.SpanStatusCode.ERROR });
    }
}
// Auto-initialize if enabled
if (OTEL_ENABLED && process.env.NODE_ENV !== 'test') {
    initializeOTel();
}

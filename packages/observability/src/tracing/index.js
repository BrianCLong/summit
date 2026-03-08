"use strict";
/**
 * CompanyOS Observability SDK - Distributed Tracing Module
 *
 * Provides OpenTelemetry-based distributed tracing with automatic
 * instrumentation and manual span creation utilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanStatusCode = exports.Context = exports.Tracer = void 0;
exports.initializeTracing = initializeTracing;
exports.shutdownTracing = shutdownTracing;
exports.getTracer = getTracer;
exports.getActiveSpan = getActiveSpan;
exports.getTraceContext = getTraceContext;
exports.startSpan = startSpan;
exports.withSpan = withSpan;
exports.withSpanSync = withSpanSync;
exports.createHttpClientSpan = createHttpClientSpan;
exports.createDbSpan = createDbSpan;
exports.createCacheSpan = createCacheSpan;
exports.createExternalCallSpan = createExternalCallSpan;
exports.createQueueSpan = createQueueSpan;
exports.createGraphQLSpan = createGraphQLSpan;
exports.extractContext = extractContext;
exports.injectContext = injectContext;
exports.addSpanAttributes = addSpanAttributes;
exports.recordException = recordException;
exports.addSpanEvent = addSpanEvent;
const api_1 = require("@opentelemetry/api");
Object.defineProperty(exports, "SpanStatusCode", { enumerable: true, get: function () { return api_1.SpanStatusCode; } });
Object.defineProperty(exports, "Tracer", { enumerable: true, get: function () { return api_1.Tracer; } });
Object.defineProperty(exports, "Context", { enumerable: true, get: function () { return api_1.Context; } });
const sdk_node_1 = require("@opentelemetry/sdk-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
// =============================================================================
// SDK INITIALIZATION
// =============================================================================
let sdk = null;
let isInitialized = false;
/**
 * Initialize OpenTelemetry tracing for a service
 */
async function initializeTracing(config) {
    if (isInitialized) {
        console.warn('Tracing already initialized, skipping re-initialization');
        return;
    }
    const { service, otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318', sampleRate = parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'), autoInstrumentation = true, batchProcessing = process.env.NODE_ENV === 'production', resourceAttributes = {}, } = config;
    // Create resource with service attributes
    const resource = new resources_1.Resource({
        [semantic_conventions_1.ATTR_SERVICE_NAME]: service.name,
        [semantic_conventions_1.ATTR_SERVICE_VERSION]: service.version,
        [semantic_conventions_1.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: service.environment,
        'service.team': service.team,
        'service.tier': service.tier,
        'service.namespace': service.namespace,
        ...resourceAttributes,
    });
    // Create OTLP exporter
    const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: `${otlpEndpoint}/v1/traces`,
        headers: {},
    });
    // Create span processor
    const spanProcessor = batchProcessing
        ? new sdk_trace_base_1.BatchSpanProcessor(traceExporter, {
            maxQueueSize: 2048,
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
            exportTimeoutMillis: 30000,
        })
        : new sdk_trace_base_1.SimpleSpanProcessor(traceExporter);
    // Initialize SDK
    sdk = new sdk_node_1.NodeSDK({
        resource,
        spanProcessors: [spanProcessor],
        instrumentations: autoInstrumentation ? [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                '@opentelemetry/instrumentation-fs': { enabled: false },
                '@opentelemetry/instrumentation-dns': { enabled: false },
            })] : [],
    });
    await sdk.start();
    isInitialized = true;
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        await shutdownTracing();
    });
}
/**
 * Shutdown tracing gracefully
 */
async function shutdownTracing() {
    if (sdk) {
        await sdk.shutdown();
        isInitialized = false;
    }
}
// =============================================================================
// TRACER ACCESS
// =============================================================================
/**
 * Get a tracer for manual span creation
 */
function getTracer(name, version) {
    return api_1.trace.getTracer(name || 'companyos-observability', version || '1.0.0');
}
/**
 * Get the currently active span
 */
function getActiveSpan() {
    return api_1.trace.getActiveSpan();
}
/**
 * Get trace context from the active span
 */
function getTraceContext() {
    const span = getActiveSpan();
    if (!span)
        return {};
    const ctx = span.spanContext();
    return {
        traceId: ctx.traceId,
        spanId: ctx.spanId,
    };
}
// =============================================================================
// SPAN CREATION UTILITIES
// =============================================================================
const SPAN_KIND_MAP = {
    internal: api_1.SpanKind.INTERNAL,
    server: api_1.SpanKind.SERVER,
    client: api_1.SpanKind.CLIENT,
    producer: api_1.SpanKind.PRODUCER,
    consumer: api_1.SpanKind.CONSUMER,
};
/**
 * Create and start a new span
 */
function startSpan(name, options = {}) {
    const tracer = getTracer();
    const { kind = 'internal', attributes = {}, parent } = options;
    const ctx = parent || api_1.context.active();
    return tracer.startSpan(name, {
        kind: SPAN_KIND_MAP[kind],
        attributes,
    }, ctx);
}
/**
 * Execute a function within a span context
 */
async function withSpan(name, fn, options = {}) {
    const span = startSpan(name, options);
    try {
        const result = await api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => fn(span));
        span.setStatus({ code: api_1.SpanStatusCode.OK });
        return result;
    }
    catch (error) {
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof Error) {
            span.recordException(error);
        }
        throw error;
    }
    finally {
        span.end();
    }
}
/**
 * Execute a synchronous function within a span context
 */
function withSpanSync(name, fn, options = {}) {
    const span = startSpan(name, options);
    try {
        const result = api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => fn(span));
        span.setStatus({ code: api_1.SpanStatusCode.OK });
        return result;
    }
    catch (error) {
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof Error) {
            span.recordException(error);
        }
        throw error;
    }
    finally {
        span.end();
    }
}
// =============================================================================
// SPECIALIZED SPAN CREATORS
// =============================================================================
/**
 * Create a span for HTTP client requests
 */
function createHttpClientSpan(method, url, attributes) {
    return startSpan(`HTTP ${method}`, {
        kind: 'client',
        attributes: {
            'http.method': method,
            'http.url': url,
            ...attributes,
        },
    });
}
/**
 * Create a span for database operations
 */
function createDbSpan(dbSystem, operation, statement, attributes) {
    return startSpan(`${dbSystem} ${operation}`, {
        kind: 'client',
        attributes: {
            'db.system': dbSystem,
            'db.operation': operation,
            ...(statement && { 'db.statement': statement }),
            ...attributes,
        },
    });
}
/**
 * Create a span for cache operations
 */
function createCacheSpan(cacheName, operation, key, attributes) {
    return startSpan(`cache.${operation}`, {
        kind: 'client',
        attributes: {
            'cache.name': cacheName,
            'cache.operation': operation,
            ...(key && { 'cache.key': key }),
            ...attributes,
        },
    });
}
/**
 * Create a span for external service calls
 */
function createExternalCallSpan(serviceName, operation, attributes) {
    return startSpan(`${serviceName}.${operation}`, {
        kind: 'client',
        attributes: {
            'peer.service': serviceName,
            'rpc.method': operation,
            ...attributes,
        },
    });
}
/**
 * Create a span for message queue operations
 */
function createQueueSpan(queueName, operation, attributes) {
    return startSpan(`${queueName} ${operation}`, {
        kind: operation === 'publish' ? 'producer' : 'consumer',
        attributes: {
            'messaging.system': 'queue',
            'messaging.destination': queueName,
            'messaging.operation': operation,
            ...attributes,
        },
    });
}
/**
 * Create a span for GraphQL operations
 */
function createGraphQLSpan(operationType, operationName, attributes) {
    return startSpan(`graphql.${operationType}`, {
        kind: 'server',
        attributes: {
            'graphql.operation.type': operationType,
            'graphql.operation.name': operationName,
            ...attributes,
        },
    });
}
// =============================================================================
// CONTEXT PROPAGATION
// =============================================================================
/**
 * Extract trace context from incoming headers
 */
function extractContext(headers) {
    const getter = {
        get(carrier, key) {
            return carrier[key.toLowerCase()];
        },
        keys(carrier) {
            return Object.keys(carrier);
        },
    };
    return api_1.propagation.extract(api_1.context.active(), headers, getter);
}
/**
 * Inject trace context into outgoing headers
 */
function injectContext(headers) {
    const setter = {
        set(carrier, key, value) {
            carrier[key] = value;
        },
    };
    api_1.propagation.inject(api_1.context.active(), headers, setter);
    return headers;
}
// =============================================================================
// SPAN UTILITIES
// =============================================================================
/**
 * Add attributes to the active span
 */
function addSpanAttributes(attributes) {
    const span = getActiveSpan();
    if (span) {
        span.setAttributes(attributes);
    }
}
/**
 * Record an exception on the active span
 */
function recordException(error, attributes) {
    const span = getActiveSpan();
    if (span) {
        span.recordException(error);
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: error.message,
        });
        if (attributes) {
            span.setAttributes(attributes);
        }
    }
}
/**
 * Add an event to the active span
 */
function addSpanEvent(name, attributes, timestamp) {
    const span = getActiveSpan();
    if (span) {
        span.addEvent(name, attributes, timestamp);
    }
}

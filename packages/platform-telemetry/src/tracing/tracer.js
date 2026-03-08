"use strict";
// @ts-nocheck
/**
 * P32: Distributed Tracing SDK
 * OpenTelemetry-based tracing for Summit platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.spans = exports.SummitAttributes = exports.TracingConfigSchema = void 0;
exports.initializeTracing = initializeTracing;
exports.shutdownTracing = shutdownTracing;
exports.getTracer = getTracer;
exports.createSpan = createSpan;
exports.withSpan = withSpan;
exports.setSpanAttributes = setSpanAttributes;
exports.recordSpanError = recordSpanError;
exports.getTraceContext = getTraceContext;
exports.extractTraceContext = extractTraceContext;
exports.traced = traced;
exports.Trace = Trace;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const zod_1 = require("zod");
/**
 * Tracing configuration schema
 */
exports.TracingConfigSchema = zod_1.z.object({
    serviceName: zod_1.z.string(),
    serviceVersion: zod_1.z.string().default('1.0.0'),
    environment: zod_1.z.string().default('development'),
    enabled: zod_1.z.boolean().default(true),
    samplingRate: zod_1.z.number().min(0).max(1).default(1.0),
    exporterEndpoint: zod_1.z.string().optional(),
    exporterHeaders: zod_1.z.record(zod_1.z.string()).optional(),
    instrumentations: zod_1.z.object({
        http: zod_1.z.boolean().default(true),
        express: zod_1.z.boolean().default(true),
        graphql: zod_1.z.boolean().default(true),
        pg: zod_1.z.boolean().default(true),
        redis: zod_1.z.boolean().default(true),
    }).default({}),
});
/**
 * Summit-specific span attributes
 */
exports.SummitAttributes = {
    // User context
    USER_ID: 'summit.user.id',
    USER_ROLE: 'summit.user.role',
    SESSION_ID: 'summit.session.id',
    // Investigation context
    INVESTIGATION_ID: 'summit.investigation.id',
    INVESTIGATION_TYPE: 'summit.investigation.type',
    // Entity context
    ENTITY_ID: 'summit.entity.id',
    ENTITY_TYPE: 'summit.entity.type',
    // Graph context
    GRAPH_PATTERN: 'summit.graph.pattern',
    GRAPH_DEPTH: 'summit.graph.depth',
    NODES_VISITED: 'summit.graph.nodes_visited',
    RELATIONSHIPS_FOLLOWED: 'summit.graph.relationships_followed',
    // Cache context
    CACHE_HIT: 'summit.cache.hit',
    CACHE_LAYER: 'summit.cache.layer',
    // AI/Copilot context
    COPILOT_ACTION: 'summit.copilot.action',
    COPILOT_MODEL: 'summit.copilot.model',
    COPILOT_TOKENS: 'summit.copilot.tokens',
    // Error context
    ERROR_CODE: 'summit.error.code',
    ERROR_MESSAGE: 'summit.error.message',
};
let sdk = null;
let globalTracer = null;
/**
 * Initialize the tracing SDK
 */
function initializeTracing(config) {
    const validatedConfig = exports.TracingConfigSchema.parse(config);
    if (!validatedConfig.enabled) {
        return null;
    }
    const resource = new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: validatedConfig.serviceName,
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: validatedConfig.serviceVersion,
        [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: validatedConfig.environment,
    });
    const exporter = validatedConfig.exporterEndpoint
        ? new exporter_trace_otlp_http_1.OTLPTraceExporter({
            url: validatedConfig.exporterEndpoint,
            headers: validatedConfig.exporterHeaders,
        })
        : undefined;
    const instrumentations = (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
        '@opentelemetry/instrumentation-http': {
            enabled: validatedConfig.instrumentations.http,
        },
        '@opentelemetry/instrumentation-express': {
            enabled: validatedConfig.instrumentations.express,
        },
        '@opentelemetry/instrumentation-graphql': {
            enabled: validatedConfig.instrumentations.graphql,
        },
        '@opentelemetry/instrumentation-pg': {
            enabled: validatedConfig.instrumentations.pg,
        },
        '@opentelemetry/instrumentation-redis-4': {
            enabled: validatedConfig.instrumentations.redis,
        },
        // Disable noisy instrumentations
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
    });
    sdk = new sdk_node_1.NodeSDK({
        resource,
        traceExporter: exporter,
        instrumentations,
        sampler: {
            shouldSample: () => ({
                decision: Math.random() < validatedConfig.samplingRate ? 1 : 0,
                attributes: {},
                traceState: undefined,
            }),
        },
    });
    // Set up W3C trace context propagation
    api_1.propagation.setGlobalPropagator(new core_1.W3CTraceContextPropagator());
    sdk.start();
    globalTracer = api_1.trace.getTracer(validatedConfig.serviceName, validatedConfig.serviceVersion);
    return sdk;
}
/**
 * Shutdown the tracing SDK
 */
async function shutdownTracing() {
    if (sdk) {
        await sdk.shutdown();
        sdk = null;
        globalTracer = null;
    }
}
/**
 * Get the global tracer
 */
function getTracer() {
    if (!globalTracer) {
        globalTracer = api_1.trace.getTracer('summit-default');
    }
    return globalTracer;
}
/**
 * Create a new span with Summit conventions
 */
function createSpan(name, options = {}) {
    const tracer = getTracer();
    return tracer.startSpan(name, options);
}
/**
 * Run a function within a span context
 */
async function withSpan(name, fn, options = {}) {
    const tracer = getTracer();
    const span = tracer.startSpan(name, options);
    try {
        const result = await api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => fn(span));
        span.setStatus({ code: api_1.SpanStatusCode.OK });
        return result;
    }
    catch (error) {
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error);
        throw error;
    }
    finally {
        span.end();
    }
}
/**
 * Add attributes to the current span
 */
function setSpanAttributes(attributes) {
    const span = api_1.trace.getSpan(api_1.context.active());
    if (span) {
        for (const [key, value] of Object.entries(attributes)) {
            span.setAttribute(key, value);
        }
    }
}
/**
 * Record an error on the current span
 */
function recordSpanError(error, attributes) {
    const span = api_1.trace.getSpan(api_1.context.active());
    if (span) {
        span.recordException(error);
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: error.message,
        });
        if (attributes) {
            for (const [key, value] of Object.entries(attributes)) {
                span.setAttribute(key, value);
            }
        }
    }
}
/**
 * Get current trace context for propagation
 */
function getTraceContext() {
    const carrier = {};
    api_1.propagation.inject(api_1.context.active(), carrier);
    return carrier;
}
/**
 * Extract trace context from carrier
 */
function extractTraceContext(carrier) {
    return api_1.propagation.extract(api_1.context.active(), carrier);
}
/**
 * Higher-order function to trace a function
 */
function traced(name, fn, options) {
    return async (...args) => {
        return withSpan(name, async (span) => {
            // Add function arguments as attributes (be careful with sensitive data)
            span.setAttribute('function.args_count', args.length);
            return fn(...args);
        }, options);
    };
}
/**
 * Decorator for tracing class methods
 */
function Trace(name, options) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const spanName = name || `${target.constructor.name}.${propertyKey}`;
        descriptor.value = async function (...args) {
            return withSpan(spanName, async (span) => {
                span.setAttribute('class', target.constructor.name);
                span.setAttribute('method', propertyKey);
                return originalMethod.apply(this, args);
            }, options);
        };
        return descriptor;
    };
}
/**
 * Pre-configured span helpers for common operations
 */
exports.spans = {
    /**
     * Create a database query span
     */
    dbQuery(database, operation) {
        return (fn) => withSpan(`db.${operation}`, fn, {
            kind: api_1.SpanKind.CLIENT,
            attributes: {
                [semantic_conventions_1.SemanticAttributes.DB_SYSTEM]: database,
                [semantic_conventions_1.SemanticAttributes.DB_OPERATION]: operation,
            },
        });
    },
    /**
     * Create an HTTP request span
     */
    httpRequest(method, url) {
        return (fn) => withSpan(`HTTP ${method}`, fn, {
            kind: api_1.SpanKind.CLIENT,
            attributes: {
                [semantic_conventions_1.SemanticAttributes.HTTP_METHOD]: method,
                [semantic_conventions_1.SemanticAttributes.HTTP_URL]: url,
            },
        });
    },
    /**
     * Create a graph traversal span
     */
    graphTraversal(pattern, depth) {
        return (fn) => withSpan('graph.traversal', fn, {
            kind: api_1.SpanKind.INTERNAL,
            attributes: {
                [exports.SummitAttributes.GRAPH_PATTERN]: pattern,
                [exports.SummitAttributes.GRAPH_DEPTH]: depth,
            },
        });
    },
    /**
     * Create a cache operation span
     */
    cacheOperation(operation, layer) {
        return (fn) => withSpan(`cache.${operation}`, fn, {
            kind: api_1.SpanKind.CLIENT,
            attributes: {
                [exports.SummitAttributes.CACHE_LAYER]: layer,
            },
        });
    },
    /**
     * Create a copilot request span
     */
    copilotRequest(action, model) {
        return (fn) => withSpan('copilot.request', fn, {
            kind: api_1.SpanKind.CLIENT,
            attributes: {
                [exports.SummitAttributes.COPILOT_ACTION]: action,
                [exports.SummitAttributes.COPILOT_MODEL]: model,
            },
        });
    },
};

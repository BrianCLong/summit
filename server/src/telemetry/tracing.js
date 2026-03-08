"use strict";
// @ts-nocheck
/**
 * OpenTelemetry Distributed Tracing Configuration for IntelGraph
 * Provides comprehensive instrumentation for Maestro Orchestration System
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelGraphTracing = void 0;
exports.Traced = Traced;
exports.tracingMiddleware = tracingMiddleware;
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const exporter_otlp_http_1 = require("@opentelemetry/exporter-otlp-http");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const api_1 = require("@opentelemetry/api");
const sdk_trace_node_2 = require("@opentelemetry/sdk-trace-node");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
const instrumentation_graphql_1 = require("@opentelemetry/instrumentation-graphql");
const instrumentation_redis_1 = require("@opentelemetry/instrumentation-redis");
const instrumentation_pg_1 = require("@opentelemetry/instrumentation-pg");
/**
 * Custom IntelGraph Tracing Configuration
 */
class IntelGraphTracing {
    static instance;
    provider;
    tracer;
    constructor() {
        this.setupTracing();
    }
    static getInstance() {
        if (!IntelGraphTracing.instance) {
            IntelGraphTracing.instance = new IntelGraphTracing();
        }
        return IntelGraphTracing.instance;
    }
    setupTracing() {
        // Resource configuration
        const resource = resources_1.Resource.default().merge(new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: 'maestro-orchestrator',
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '2.0.0',
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown',
            [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
            'intelgraph.cluster': process.env.CLUSTER_NAME || 'local',
            'intelgraph.region': process.env.AWS_REGION || 'us-west-2',
        }));
        // Create tracer provider
        this.provider = new sdk_trace_node_2.NodeTracerProvider({
            resource: resource,
        });
        // Configure exporters
        const exporters = this.configureExporters();
        exporters.forEach((exporter) => {
            this.provider.addSpanProcessor(new sdk_trace_node_1.BatchSpanProcessor(exporter, {
                maxQueueSize: 2048,
                scheduledDelayMillis: 5000,
                exportTimeoutMillis: 30000,
                maxExportBatchSize: 512,
            }));
        });
        // Register provider
        this.provider.register();
        // Setup instrumentations
        this.setupInstrumentations();
        // Get tracer
        this.tracer = api_1.trace.getTracer('intelgraph-maestro', '2.0.0');
        console.log('✅ IntelGraph distributed tracing initialized');
    }
    configureExporters() {
        const exporters = [];
        // OTLP Exporter (primary - to OpenTelemetry Collector)
        const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';
        exporters.push(new exporter_otlp_http_1.OTLPTraceExporter({
            url: `${otlpEndpoint}/v1/traces`,
            headers: {
                'x-intelgraph-cluster': process.env.CLUSTER_NAME || 'local',
            },
        }));
        // Jaeger Exporter (backup/direct)
        if (process.env.JAEGER_ENDPOINT) {
            exporters.push(new exporter_jaeger_1.JaegerExporter({
                endpoint: process.env.JAEGER_ENDPOINT,
                serviceName: 'maestro-orchestrator',
            }));
        }
        // Console exporter for development
        if (process.env.NODE_ENV === 'development') {
            exporters.push(new sdk_trace_node_1.ConsoleSpanExporter());
        }
        return exporters;
    }
    setupInstrumentations() {
        (0, instrumentation_1.registerInstrumentations)({
            instrumentations: [
                // Auto-instrumentations
                (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                    '@opentelemetry/instrumentation-fs': {
                        enabled: false, // Too noisy
                    },
                }),
                // Custom instrumentations with detailed config
                new instrumentation_http_1.HttpInstrumentation({
                    requestHook: (span, request) => {
                        span.setAttributes({
                            'http.request.body.size': request.headers['content-length'] || 0,
                            'intelgraph.request.id': request.headers['x-request-id'],
                            'intelgraph.tenant.id': request.headers['x-tenant-id'],
                        });
                    },
                    responseHook: (span, response) => {
                        span.setAttributes({
                            'http.response.body.size': response.headers['content-length'] || 0,
                        });
                    },
                }),
                new instrumentation_express_1.ExpressInstrumentation({
                    requestHook: (span, info) => {
                        span.setAttributes({
                            'intelgraph.route': info.route,
                            'intelgraph.user.id': info.req.headers['x-user-id'],
                        });
                    },
                }),
                new instrumentation_graphql_1.GraphQLInstrumentation({
                    mergeItems: true,
                    allowValues: true,
                }),
                new instrumentation_redis_1.RedisInstrumentation({
                    dbStatementSerializer: (cmdName, cmdArgs) => {
                        // Sanitize Redis commands for tracing
                        if (cmdArgs.length > 0) {
                            return `${cmdName} ${cmdArgs[0]}`;
                        }
                        return cmdName;
                    },
                }),
                new instrumentation_pg_1.PgInstrumentation({
                    enhancedDatabaseReporting: true,
                }),
            ],
        });
    }
    /**
     * Create a custom span for orchestration operations
     */
    createOrchestrationSpan(operationName, attributes = {}) {
        return this.tracer.startSpan(operationName, {
            kind: api_1.SpanKind.INTERNAL,
            attributes: {
                'intelgraph.operation.type': 'orchestration',
                'intelgraph.component': 'maestro',
                ...attributes,
            },
        });
    }
    /**
     * Create a span for AI model interactions
     */
    createAIModelSpan(modelName, operation, attributes = {}) {
        return this.tracer.startSpan(`ai.${modelName}.${operation}`, {
            kind: api_1.SpanKind.CLIENT,
            attributes: {
                'ai.model.name': modelName,
                'ai.operation': operation,
                'intelgraph.component': 'ai-router',
                ...attributes,
            },
        });
    }
    /**
     * Create a span for graph database operations
     */
    createGraphSpan(operation, query, attributes = {}) {
        return this.tracer.startSpan(`graph.${operation}`, {
            kind: api_1.SpanKind.CLIENT,
            attributes: {
                'db.system': 'neo4j',
                'db.operation': operation,
                'db.statement': query ? this.sanitizeQuery(query) : undefined,
                'intelgraph.component': 'graph-engine',
                ...attributes,
            },
        });
    }
    /**
     * Create a span for premium routing decisions
     */
    createPremiumRoutingSpan(decision, attributes = {}) {
        return this.tracer.startSpan(`routing.premium.${decision}`, {
            kind: api_1.SpanKind.INTERNAL,
            attributes: {
                'intelgraph.routing.decision': decision,
                'intelgraph.component': 'premium-router',
                ...attributes,
            },
        });
    }
    /**
     * Trace async operations with automatic error handling
     */
    async traceAsync(spanName, operation, attributes = {}) {
        const span = this.tracer.startSpan(spanName, { attributes });
        try {
            const result = await operation();
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
    }
    /**
     * Add custom attributes to current span
     */
    addAttributesToCurrentSpan(attributes) {
        const currentSpan = api_1.trace.getActiveSpan();
        if (currentSpan) {
            currentSpan.setAttributes(attributes);
        }
    }
    /**
     * Record a custom event in the current span
     */
    recordEvent(name, attributes = {}) {
        const currentSpan = api_1.trace.getActiveSpan();
        if (currentSpan) {
            currentSpan.addEvent(name, attributes);
        }
    }
    /**
     * Get the current trace context
     */
    getCurrentTraceContext() {
        return api_1.context.active();
    }
    /**
     * Sanitize database queries for tracing (remove sensitive data)
     */
    sanitizeQuery(query) {
        // Remove potential sensitive data patterns
        return query
            .replace(/password\s*[:=]\s*['"][^'"]*['"]?/gi, 'password: [REDACTED]')
            .replace(/token\s*[:=]\s*['"][^'"]*['"]?/gi, 'token: [REDACTED]')
            .replace(/key\s*[:=]\s*['"][^'"]*['"]?/gi, 'key: [REDACTED]')
            .substring(0, 1000); // Limit query length
    }
    /**
     * Shutdown tracing gracefully
     */
    async shutdown() {
        await this.provider.shutdown();
        console.log('🔄 IntelGraph tracing shutdown complete');
    }
}
exports.IntelGraphTracing = IntelGraphTracing;
/**
 * Custom tracing decorators for common operations
 */
function Traced(operationName) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const tracing = IntelGraphTracing.getInstance();
        descriptor.value = async function (...args) {
            const spanName = operationName || `${target.constructor.name}.${propertyKey}`;
            return tracing.traceAsync(spanName, () => originalMethod.apply(this, args), {
                'code.function': propertyKey,
                'code.namespace': target.constructor.name,
            });
        };
        return descriptor;
    };
}
/**
 * Express middleware for request tracing
 */
function tracingMiddleware() {
    const tracing = IntelGraphTracing.getInstance();
    return (req, res, next) => {
        // Extract trace context from headers
        const traceId = req.headers['x-trace-id'];
        const spanId = req.headers['x-span-id'];
        // Add request attributes to span
        tracing.addAttributesToCurrentSpan({
            'http.method': req.method,
            'http.url': req.url,
            'http.route': req.route?.path,
            'intelgraph.request.id': req.headers['x-request-id'],
            'intelgraph.user.id': req.headers['x-user-id'],
            'intelgraph.tenant.id': req.headers['x-tenant-id'],
        });
        // Set response headers for trace propagation
        res.setHeader('x-trace-id', api_1.trace.getActiveSpan()?.spanContext().traceId || 'unknown');
        next();
    };
}
// Initialize tracing on module load
const tracing = IntelGraphTracing.getInstance();
// Graceful shutdown
process.on('SIGTERM', async () => {
    await tracing.shutdown();
});
exports.default = tracing;

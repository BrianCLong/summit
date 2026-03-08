"use strict";
// @ts-nocheck
/**
 * OpenTelemetry Tracing Infrastructure Module
 *
 * Drop-in OTEL tracing for distributed tracing across services.
 * Provides standardized hooks for GraphQL, databases, queues, and custom operations.
 *
 * Usage:
 *   import { tracer } from '@/observability/tracing';
 *   const result = await tracer.trace('operation.name', async (span: any) => {
 *     // Your operation here
 *     span.setAttribute('custom.attr', 'value');
 *     return result;
 *   });
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracer = exports.TracingService = void 0;
const api_1 = require("@opentelemetry/api");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'observability:tracing' });
/**
 * Centralized OpenTelemetry Tracing Service
 * Singleton pattern for consistent tracing across the application
 */
class TracingService {
    static instance;
    sdk = null;
    tracer = null;
    config;
    constructor(config) {
        this.config = {
            serviceName: config?.serviceName || process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
            serviceVersion: config?.serviceVersion || process.env.OTEL_SERVICE_VERSION || '2.5.0',
            environment: config?.environment || process.env.NODE_ENV || 'development',
            jaegerEndpoint: config?.jaegerEndpoint || process.env.JAEGER_ENDPOINT,
            prometheusPort: config?.prometheusPort || parseInt(process.env.PROMETHEUS_PORT || '9464'),
            sampleRate: config?.sampleRate ?? parseFloat(process.env.OTEL_SAMPLE_RATE || '0.1'),
            enabled: config?.enabled ?? process.env.OTEL_ENABLED !== 'false',
        };
        if (this.config.enabled && process.env.NODE_ENV !== 'test') {
            this.initialize();
        }
    }
    static getInstance(config) {
        if (!TracingService.instance) {
            TracingService.instance = new TracingService(config);
        }
        return TracingService.instance;
    }
    /**
     * Initialize OpenTelemetry SDK with exporters and instrumentation
     */
    initialize() {
        try {
            const resource = resources_1.Resource.default().merge(new resources_1.Resource({
                [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: this.config.serviceName,
                [semantic_conventions_1.SEMRESATTRS_SERVICE_VERSION]: this.config.serviceVersion,
                [semantic_conventions_1.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: this.config.environment,
            }));
            const traceExporter = this.config.jaegerEndpoint
                ? new exporter_jaeger_1.JaegerExporter({ endpoint: this.config.jaegerEndpoint })
                : undefined;
            const metricReader = new exporter_prometheus_1.PrometheusExporter({
                port: this.config.prometheusPort,
            });
            this.sdk = new sdk_node_1.NodeSDK({
                resource,
                traceExporter,
                metricReader,
                instrumentations: [
                    (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                        '@opentelemetry/instrumentation-fs': { enabled: false },
                    }),
                ],
            });
            this.sdk.start();
            this.tracer = api_1.trace.getTracer(this.config.serviceName, this.config.serviceVersion);
            logger.info({
                serviceName: this.config.serviceName,
                environment: this.config.environment,
                jaegerEnabled: !!this.config.jaegerEndpoint,
                prometheusPort: this.config.prometheusPort,
            }, 'OpenTelemetry tracing initialized');
        }
        catch (error) {
            logger.error({ error }, 'Failed to initialize OpenTelemetry');
            this.config.enabled = false;
        }
    }
    /**
     * Generic trace wrapper - wraps any async operation with tracing
     *
     * @example
     * const result = await tracer.trace('database.query', async (span: any) => {
     *   span.setAttribute('db.statement', query);
     *   return await db.query(query);
     * });
     */
    async trace(operationName, operation, options = {}) {
        if (!this.config.enabled || !this.tracer) {
            const noopSpan = this.createNoOpSpan();
            return await operation(noopSpan);
        }
        const span = this.startSpan(operationName, options);
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), async () => {
            try {
                const result = await operation(span);
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                span.recordException(error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Trace database operations with standardized attributes
     */
    async traceDatabase(operation, dbType, dbOperation, query) {
        return this.trace(`db.${dbType}.${operation}`, async (span) => {
            span.setAttribute('db.system', dbType);
            span.setAttribute('db.operation', operation);
            if (query) {
                span.setAttribute('db.statement', query.substring(0, 500)); // Truncate long queries
            }
            return await dbOperation();
        }, { kind: api_1.SpanKind.CLIENT });
    }
    /**
     * Trace GraphQL resolver operations
     */
    async traceGraphQL(operationName, fieldName, resolver, contextData) {
        return this.trace(`graphql.${operationName}`, async (span) => {
            span.setAttribute('graphql.operation.name', operationName);
            span.setAttribute('graphql.field.name', fieldName);
            if (contextData?.user?.id) {
                span.setAttribute('user.id', contextData.user.id);
            }
            return await resolver();
        }, { kind: api_1.SpanKind.SERVER });
    }
    /**
     * Trace message queue operations (BullMQ, Kafka, etc.)
     */
    async traceQueue(queueName, jobName, processor) {
        return this.trace(`queue.${queueName}.${jobName}`, async (span) => {
            span.setAttribute('messaging.system', 'redis');
            span.setAttribute('messaging.destination', queueName);
            span.setAttribute('messaging.operation', 'process');
            span.setAttribute('job.name', jobName);
            return await processor();
        }, { kind: api_1.SpanKind.CONSUMER });
    }
    /**
     * Trace HTTP requests
     */
    async traceHTTP(method, url, httpOperation) {
        return this.trace(`http.${method.toLowerCase()}`, async (span) => {
            span.setAttribute('http.method', method);
            span.setAttribute('http.url', url);
            return await httpOperation();
        }, { kind: api_1.SpanKind.CLIENT });
    }
    /**
     * Start a new span manually
     */
    startSpan(name, options = {}) {
        if (!this.config.enabled || !this.tracer) {
            return this.createNoOpSpan();
        }
        return this.tracer.startSpan(name, {
            kind: options.kind || api_1.SpanKind.INTERNAL,
            attributes: {
                'service.name': this.config.serviceName,
                'service.version': this.config.serviceVersion,
                'deployment.environment': this.config.environment,
                ...options.attributes,
            },
        });
    }
    /**
     * Get the currently active span
     */
    getActiveSpan() {
        return api_1.trace.getActiveSpan();
    }
    /**
     * Add attributes to the active span
     */
    addAttributes(attributes) {
        const span = this.getActiveSpan();
        if (span) {
            span.setAttributes(attributes);
        }
    }
    /**
     * Record an exception in the active span
     */
    recordException(error, attributes) {
        const span = this.getActiveSpan();
        if (span) {
            const errorObj = typeof error === 'string' ? new Error(error) : error;
            span.recordException(errorObj);
            if (attributes) {
                span.setAttributes(attributes);
            }
        }
    }
    /**
     * Get current trace context for propagation (W3C format)
     */
    getTraceContext() {
        const span = this.getActiveSpan();
        if (span) {
            const spanContext = span.spanContext();
            return `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
        }
        return undefined;
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Shutdown SDK gracefully
     */
    async shutdown() {
        if (this.sdk) {
            await this.sdk.shutdown();
            logger.info('OpenTelemetry SDK shutdown');
        }
    }
    /**
     * Create no-op span for disabled tracing
     */
    createNoOpSpan() {
        const noopSpan = {
            setStatus: () => noopSpan,
            setAttributes: () => noopSpan,
            setAttribute: () => noopSpan,
            addEvent: () => noopSpan,
            recordException: () => { },
            end: () => { },
            updateName: () => noopSpan,
            isRecording: () => false,
            spanContext: () => ({
                traceId: '00000000000000000000000000000000',
                spanId: '0000000000000000',
                traceFlags: 0,
            }),
        };
        return noopSpan;
    }
}
exports.TracingService = TracingService;
// Singleton instance export
exports.tracer = TracingService.getInstance();
// Graceful shutdown handlers
if (process.env.NODE_ENV !== 'test') {
    process.on('SIGTERM', async () => {
        await exports.tracer.shutdown();
    });
    process.on('SIGINT', async () => {
        await exports.tracer.shutdown();
    });
}
exports.default = exports.tracer;

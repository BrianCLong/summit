"use strict";
/**
 * OpenTelemetry Instrumentation
 *
 * Wrapper around the core observability/tracer to provide backward compatibility
 * and specialized wrapping methods.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otelService = void 0;
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const tracer_js_1 = require("../observability/tracer.js");
const logger = pino_1.default({ name: 'opentelemetry' });
class OpenTelemetryService {
    config;
    constructor(config = {}) {
        this.config = {
            serviceName: config.serviceName || process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
            serviceVersion: config.serviceVersion || process.env.OTEL_SERVICE_VERSION || '1.0.0',
            environment: config.environment || process.env.NODE_ENV || 'development',
            jaegerEndpoint: config.jaegerEndpoint || process.env.JAEGER_ENDPOINT,
            enableConsoleExporter: config.enableConsoleExporter ?? process.env.NODE_ENV === 'development',
            sampleRate: config.sampleRate ?? parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
        };
    }
    /**
     * Initialize OpenTelemetry SDK
     */
    initialize() {
        try {
            const tracer = (0, tracer_js_1.initializeTracing)({
                serviceName: this.config.serviceName,
                serviceVersion: this.config.serviceVersion,
                environment: this.config.environment,
                jaegerEndpoint: this.config.jaegerEndpoint,
                sampleRate: this.config.sampleRate
            });
            tracer.initialize();
            logger.info('OpenTelemetry initialized via core tracer');
        }
        catch (error) {
            logger.error(`Failed to initialize OpenTelemetry. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Shutdown OpenTelemetry SDK
     */
    async shutdown() {
        const tracer = (0, tracer_js_1.getTracer)();
        await tracer.shutdown();
        logger.info('OpenTelemetry SDK shutdown');
    }
    /**
     * Start a new span with proper error handling
     */
    startSpan(name, attributes = {}, kind = api_1.SpanKind.INTERNAL) {
        const tracer = (0, tracer_js_1.getTracer)();
        return tracer.startSpan(name, {
            kind,
            attributes: {
                'service.name': this.config.serviceName,
                'service.version': this.config.serviceVersion,
                'deployment.environment': this.config.environment,
                ...attributes,
            },
        });
    }
    /**
     * Wrap a GraphQL resolver with tracing
     */
    wrapResolver(operationName, resolver) {
        return async (parent, args, context, info) => {
            const span = this.startSpan(`graphql.${operationName}`, {
                'graphql.operation.name': operationName,
                'graphql.operation.type': info.operation?.operation || 'unknown',
                'graphql.field.name': info.fieldName,
                'graphql.field.path': info.path?.key || 'unknown',
                'user.id': context.user?.id || 'anonymous',
            }, api_1.SpanKind.SERVER);
            try {
                const result = await resolver(parent, args, context, info);
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                span.setAttributes({
                    'graphql.result.success': true,
                });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                span.setAttributes({
                    'graphql.result.success': false,
                    'error.name': error instanceof Error ? error.constructor.name : 'Unknown',
                    'error.message': error instanceof Error ? error.message : 'Unknown error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        };
    }
    /**
     * Wrap Neo4j operations with tracing
     */
    wrapNeo4jOperation(operationName, operation) {
        const span = this.startSpan(`neo4j.${operationName}`, {
            'db.system': 'neo4j',
            'db.operation': operationName,
        }, api_1.SpanKind.CLIENT);
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), async () => {
            try {
                const result = await operation();
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Wrap BullMQ job processing with tracing
     */
    wrapBullMQJob(jobName, processor) {
        const span = this.startSpan(`bullmq.${jobName}`, {
            'messaging.system': 'redis',
            'messaging.operation': 'process',
            'job.name': jobName,
        }, api_1.SpanKind.CONSUMER);
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), async () => {
            try {
                const result = await processor();
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Add custom span attributes
     */
    addSpanAttributes(attributes) {
        const activeSpan = api_1.trace.getActiveSpan();
        if (activeSpan) {
            activeSpan.setAttributes(attributes);
        }
    }
    /**
     * Add span event
     */
    addSpanEvent(name, attributes) {
        const activeSpan = api_1.trace.getActiveSpan();
        if (activeSpan) {
            activeSpan.addEvent(name, attributes);
        }
    }
    /**
     * Get current trace context for propagation
     */
    getCurrentTraceContext() {
        const activeSpan = api_1.trace.getActiveSpan();
        if (activeSpan) {
            const spanContext = activeSpan.spanContext();
            return `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16)}`;
        }
        return undefined;
    }
    /**
     * Get service health and metrics
     */
    getHealth() {
        const tracer = (0, tracer_js_1.getTracer)();
        return {
            enabled: tracer.isInitialized(),
            serviceName: this.config.serviceName,
            environment: this.config.environment,
            tracerActive: tracer.isInitialized(),
        };
    }
}
// Global instance
exports.otelService = new OpenTelemetryService();
// Initialize if not in test environment
if (process.env.NODE_ENV !== 'test') {
    exports.otelService.initialize();
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.otelService.shutdown();
});
process.on('SIGINT', async () => {
    await exports.otelService.shutdown();
});
exports.default = exports.otelService;

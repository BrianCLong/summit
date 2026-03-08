"use strict";
/**
 * OpenTelemetry Distributed Tracing for IntelGraph Server
 * Provides end-to-end visibility across all service operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanStatusCode = exports.SpanKind = exports.IntelGraphTracer = void 0;
exports.initializeTracing = initializeTracing;
exports.getTracer = getTracer;
exports.traced = traced;
const opentelemetrySdkNode = __importStar(require("@opentelemetry/sdk-node"));
const opentelemetryResources = __importStar(require("@opentelemetry/resources"));
const semanticConventions = __importStar(require("@opentelemetry/semantic-conventions"));
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const traceExporter = __importStar(require("@opentelemetry/exporter-trace-otlp-http"));
const metricsExporter = __importStar(require("@opentelemetry/exporter-metrics-otlp-http"));
const sdkMetrics = __importStar(require("@opentelemetry/sdk-metrics"));
const autoInstrumentations = __importStar(require("@opentelemetry/auto-instrumentations-node"));
const api_1 = require("@opentelemetry/api");
Object.defineProperty(exports, "SpanStatusCode", { enumerable: true, get: function () { return api_1.SpanStatusCode; } });
Object.defineProperty(exports, "SpanKind", { enumerable: true, get: function () { return api_1.SpanKind; } });
// Re-export with fallbacks for API compatibility
const NodeSDK = opentelemetrySdkNode.NodeSDK || opentelemetrySdkNode;
const Resource = opentelemetryResources.Resource || opentelemetryResources;
const SEMRESATTRS_SERVICE_NAME = semanticConventions.SEMRESATTRS_SERVICE_NAME || 'service.name';
const SEMRESATTRS_SERVICE_VERSION = semanticConventions.SEMRESATTRS_SERVICE_VERSION || 'service.version';
const SEMRESATTRS_DEPLOYMENT_ENVIRONMENT = semanticConventions.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT || 'deployment.environment';
const SEMRESATTRS_SERVICE_NAMESPACE = semanticConventions.SEMRESATTRS_SERVICE_NAMESPACE || 'service.namespace';
const OTLPTraceExporter = traceExporter.OTLPTraceExporter || traceExporter;
const OTLPMetricExporter = metricsExporter.OTLPMetricExporter || metricsExporter;
const PeriodicExportingMetricReader = sdkMetrics.PeriodicExportingMetricReader || sdkMetrics;
const getNodeAutoInstrumentations = autoInstrumentations.getNodeAutoInstrumentations || (() => []);
const otelApi = __importStar(require("@opentelemetry/api"));
const propagation = otelApi.propagation || { inject: () => { }, extract: () => api_1.context.active() };
const config_js_1 = require("../config.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'otel-tracer' });
class IntelGraphTracer {
    config;
    sdk = null;
    tracer;
    initialized = false;
    constructor(config) {
        this.config = config;
        this.tracer = api_1.trace.getTracer(this.config.serviceName, this.config.serviceVersion);
    }
    async initialize() {
        if (this.initialized) {
            logger.warn('Tracer already initialized');
            return;
        }
        try {
            // Create resource with service metadata
            const resource = new Resource({
                [SEMRESATTRS_SERVICE_NAME]: this.config.serviceName,
                [SEMRESATTRS_SERVICE_VERSION]: this.config.serviceVersion,
                [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: this.config.environment,
                [SEMRESATTRS_SERVICE_NAMESPACE]: 'intelgraph',
            });
            // Configure Exporters
            // Priority: OTLP > Jaeger
            let traceExporter;
            if (this.config.otlpTracesEndpoint) {
                traceExporter = new OTLPTraceExporter({
                    url: this.config.otlpTracesEndpoint,
                    headers: this.config.otlpHeaders,
                });
                logger.info(`OTLP Trace exporter configured: ${this.config.otlpTracesEndpoint}`);
            }
            else if (this.config.jaegerEndpoint) {
                traceExporter = new exporter_jaeger_1.JaegerExporter({
                    endpoint: this.config.jaegerEndpoint,
                });
                logger.info(`Jaeger exporter configured: ${this.config.jaegerEndpoint}`);
            }
            let metricReader;
            if (this.config.otlpMetricsEndpoint) {
                metricReader = new PeriodicExportingMetricReader({
                    exporter: new OTLPMetricExporter({
                        url: this.config.otlpMetricsEndpoint,
                        headers: this.config.otlpHeaders,
                    }),
                    exportIntervalMillis: 15000,
                });
                logger.info(`OTLP Metric exporter configured: ${this.config.otlpMetricsEndpoint}`);
            }
            // Initialize OpenTelemetry SDK
            this.sdk = new NodeSDK({
                resource,
                traceExporter,
                metricReader,
                instrumentations: this.config.enableAutoInstrumentation !== false
                    ? [
                        getNodeAutoInstrumentations({
                            '@opentelemetry/instrumentation-fs': {
                                enabled: false, // Disable fs instrumentation (too noisy)
                            },
                            '@opentelemetry/instrumentation-http': {
                                enabled: true,
                                requestHook: (span, request) => {
                                    // Add custom HTTP span attributes
                                    span.setAttribute('http.client_ip', request.socket?.remoteAddress || 'unknown');
                                },
                            },
                            '@opentelemetry/instrumentation-express': {
                                enabled: true,
                            },
                            '@opentelemetry/instrumentation-graphql': {
                                enabled: true,
                            },
                        }),
                    ]
                    : [],
            });
            await this.sdk.start();
            this.initialized = true;
            logger.info('OpenTelemetry tracing initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize tracing:', error);
            // Don't throw - allow service to start without tracing
        }
    }
    async shutdown() {
        if (this.sdk) {
            await this.sdk.shutdown();
            this.initialized = false;
            logger.info('OpenTelemetry tracing shut down');
        }
    }
    // Start a new span
    startSpan(name, options) {
        const spanOptions = {
            kind: options?.kind || api_1.SpanKind.INTERNAL,
            attributes: options?.attributes || {},
        };
        if (options?.parent) {
            return this.tracer.startSpan(name, spanOptions, typeof options.parent === 'object' && 'spanContext' in options.parent
                ? api_1.trace.setSpan(api_1.context.active(), options.parent)
                : options.parent);
        }
        return this.tracer.startSpan(name, spanOptions);
    }
    // Execute function within a span context
    async withSpan(name, fn, options) {
        const span = this.startSpan(name, options);
        try {
            const result = await api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => fn(span));
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
    // Get current active span
    getCurrentSpan() {
        return api_1.trace.getActiveSpan();
    }
    // Add event to current span
    addEvent(name, attributes) {
        const span = this.getCurrentSpan();
        if (span) {
            span.addEvent(name, attributes);
        }
    }
    // Set attribute on current span
    setAttribute(key, value) {
        const span = this.getCurrentSpan();
        if (span) {
            span.setAttribute(key, value);
        }
    }
    // Record exception in current span
    recordException(error) {
        const span = this.getCurrentSpan();
        if (span) {
            span.recordException(error);
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: error.message,
            });
        }
    }
    // Extract trace context from headers
    extractContext(headers) {
        return propagation.extract(api_1.context.active(), headers);
    }
    // Inject trace context into headers
    injectContext(headers) {
        propagation.inject(api_1.context.active(), headers);
    }
    // Get trace ID for logging correlation
    getTraceId() {
        const span = this.getCurrentSpan();
        if (span) {
            return span.spanContext().traceId;
        }
        return '';
    }
    // Get span ID for logging correlation
    getSpanId() {
        const span = this.getCurrentSpan();
        if (span) {
            return span.spanContext().spanId;
        }
        return '';
    }
    // Database query tracing helper
    async traceDbQuery(database, operation, query, fn) {
        return this.withSpan(`db.${database}.${operation}`, async (span) => {
            span.setAttributes({
                'db.system': database,
                'db.operation': operation,
                'db.statement': query.length > 500 ? query.substring(0, 500) + '...' : query,
            });
            return fn();
        }, { kind: api_1.SpanKind.CLIENT });
    }
    // Cache operation tracing helper
    async traceCacheOperation(operation, key, fn) {
        return this.withSpan(`cache.${operation}`, async (span) => {
            span.setAttributes({
                'cache.operation': operation,
                'cache.key': key,
            });
            const result = await fn();
            span.setAttribute('cache.hit', result !== null && result !== undefined);
            return result;
        }, { kind: api_1.SpanKind.CLIENT });
    }
    // Service method tracing helper
    async traceServiceMethod(serviceName, methodName, fn, parameters) {
        return this.withSpan(`${serviceName}.${methodName}`, async (span) => {
            span.setAttributes({
                'service.name': serviceName,
                'service.method': methodName,
                ...(parameters && { 'service.parameters': JSON.stringify(parameters) }),
            });
            return fn();
        }, { kind: api_1.SpanKind.INTERNAL });
    }
    isInitialized() {
        return this.initialized;
    }
}
exports.IntelGraphTracer = IntelGraphTracer;
// Singleton instance
let tracerInstance = null;
function initializeTracing(config) {
    if (tracerInstance) {
        return tracerInstance;
    }
    const defaultConfig = {
        serviceName: 'intelgraph-server',
        serviceVersion: config_js_1.cfg.APP_VERSION || '1.0.0',
        environment: config_js_1.cfg.NODE_ENV || 'development',
        jaegerEndpoint: process.env.JAEGER_ENDPOINT,
        otlpTracesEndpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
        otlpMetricsEndpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
        otlpHeaders: process.env.OTEL_EXPORTER_OTLP_HEADERS ?
            process.env.OTEL_EXPORTER_OTLP_HEADERS.split(',').reduce((acc, curr) => {
                const idx = curr.indexOf('=');
                if (idx !== -1) {
                    const key = curr.substring(0, idx).trim();
                    const value = curr.substring(idx + 1).trim();
                    if (key)
                        acc[key] = value;
                }
                return acc;
            }, {}) : undefined,
        enableAutoInstrumentation: process.env.OTEL_AUTO_INSTRUMENT !== 'false',
        sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
    };
    tracerInstance = new IntelGraphTracer({ ...defaultConfig, ...config });
    return tracerInstance;
}
function getTracer() {
    if (!tracerInstance) {
        // Auto-initialize with defaults if not initialized
        return initializeTracing();
    }
    return tracerInstance;
}
// Decorator for automatic method tracing - ensures critical path visibility
function traced(operationName) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const traceName = operationName || `${target.constructor.name}.${propertyKey}`;
        descriptor.value = async function (...args) {
            const tracer = getTracer();
            return tracer.withSpan(traceName, async () => {
                return originalMethod.apply(this, args);
            });
        };
        return descriptor;
    };
}
// Forced update for review context

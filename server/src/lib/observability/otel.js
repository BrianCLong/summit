"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otelService = void 0;
// @ts-nocheck
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const tracer_js_1 = require("../../observability/tracer.js");
const logger = pino_1.default({ name: 'observability-otel' });
class OpenTelemetryService {
    static instance;
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
    static getInstance(config) {
        if (!OpenTelemetryService.instance) {
            OpenTelemetryService.instance = new OpenTelemetryService(config);
        }
        return OpenTelemetryService.instance;
    }
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
            logger.info(`OpenTelemetry initialized via core tracer. Service: ${this.config.serviceName}, Env: ${this.config.environment}`);
        }
        catch (error) {
            logger.error(`Failed to initialize OpenTelemetry: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async shutdown() {
        const tracer = (0, tracer_js_1.getTracer)();
        await tracer.shutdown();
        logger.info('OpenTelemetry SDK shutdown');
    }
    startSpan(name, attributes = {}, kind = api_1.SpanKind.INTERNAL) {
        const tracer = (0, tracer_js_1.getTracer)();
        return tracer.startSpan(name, {
            kind,
            attributes: {
                'service.name': this.config.serviceName,
                'deployment.environment': this.config.environment,
                ...attributes,
            },
        });
    }
    wrap(name, fn, attributes = {}) {
        const span = this.startSpan(name, attributes);
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), async () => {
            try {
                const result = await fn(span);
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (err) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: err instanceof Error ? err.message : String(err),
                });
                span.recordException(err instanceof Error ? err : new Error(String(err)));
                throw err;
            }
            finally {
                span.end();
            }
        });
    }
    createNoOpSpan() {
        return {
            setStatus: () => { },
            setAttributes: () => { },
            addEvent: () => { },
            recordException: () => { },
            end: () => { },
            isRecording: () => false,
        };
    }
    getTracer() {
        return api_1.trace.getTracer(this.config.serviceName, this.config.serviceVersion);
    }
}
exports.otelService = OpenTelemetryService.getInstance();

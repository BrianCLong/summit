"use strict";
// @ts-nocheck
/**
 * OpenTelemetry Telemetry Configuration
 *
 * Enterprise-grade observability for the Audit Black Box Service.
 * Provides distributed tracing, metrics, and logging integration.
 *
 * Features:
 * - Auto-instrumentation for HTTP, PostgreSQL, Redis
 * - Custom spans for audit operations
 * - Metrics collection (counters, histograms, gauges)
 * - Baggage propagation for audit context
 * - Export to OTLP, Jaeger, Prometheus
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryManager = void 0;
exports.initializeTelemetry = initializeTelemetry;
exports.getTelemetry = getTelemetry;
exports.shutdownTelemetry = shutdownTelemetry;
const api_1 = require("@opentelemetry/api");
const api_2 = require("@opentelemetry/api");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_trace_otlp_grpc_1 = require("@opentelemetry/exporter-trace-otlp-grpc");
const exporter_metrics_otlp_grpc_1 = require("@opentelemetry/exporter-metrics-otlp-grpc");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
const instrumentation_pg_1 = require("@opentelemetry/instrumentation-pg");
const instrumentation_redis_4_1 = require("@opentelemetry/instrumentation-redis-4");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    serviceName: 'audit-blackbox-service',
    serviceVersion: '1.0.0',
    environment: 'development',
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
    samplingRatio: 1.0,
    enableConsoleExport: process.env.NODE_ENV === 'development',
    enableAutoInstrumentation: true,
    batchSize: 512,
    exportIntervalMs: 5000,
};
/**
 * Telemetry Manager
 */
class TelemetryManager {
    config;
    sdk = null;
    tracer = null;
    meter = null;
    // Metrics
    eventIngestCounter = null;
    eventIngestLatency = null;
    chainLengthGauge = null;
    verificationCounter = null;
    verificationLatency = null;
    errorCounter = null;
    activeEventsGauge = null;
    redactionCounter = null;
    searchLatency = null;
    exportLatency = null;
    backpressureGauge = null;
    // Observable callbacks
    chainLengthCallback = null;
    backpressureCallback = null;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Initialize the telemetry system
     */
    async initialize() {
        // Set up diagnostic logging
        if (this.config.enableConsoleExport) {
            api_1.diag.setLogger(new api_1.DiagConsoleLogger(), api_1.DiagLogLevel.INFO);
        }
        // Create resource
        const resource = new resources_1.Resource({
            [semantic_conventions_1.ATTR_SERVICE_NAME]: this.config.serviceName,
            [semantic_conventions_1.ATTR_SERVICE_VERSION]: this.config.serviceVersion,
            [semantic_conventions_1.ATTR_DEPLOYMENT_ENVIRONMENT]: this.config.environment,
            'service.namespace': 'audit',
            'service.instance.id': process.env.HOSTNAME || `${this.config.serviceName}-${process.pid}`,
        });
        // Set up exporters
        const traceExporter = new exporter_trace_otlp_grpc_1.OTLPTraceExporter({
            url: this.config.otlpEndpoint,
        });
        const metricExporter = new exporter_metrics_otlp_grpc_1.OTLPMetricExporter({
            url: this.config.otlpEndpoint,
        });
        // Prometheus exporter for scraping
        const prometheusExporter = new exporter_prometheus_1.PrometheusExporter({
            port: this.config.prometheusPort,
            startServer: true,
        });
        // Create SDK
        this.sdk = new sdk_node_1.NodeSDK({
            resource,
            traceExporter,
            spanProcessors: [
                this.config.environment === 'development'
                    ? new sdk_trace_base_1.SimpleSpanProcessor(traceExporter)
                    : new sdk_trace_base_1.BatchSpanProcessor(traceExporter, {
                        maxQueueSize: this.config.batchSize,
                        scheduledDelayMillis: this.config.exportIntervalMs,
                    }),
            ],
            instrumentations: this.config.enableAutoInstrumentation
                ? [
                    new instrumentation_http_1.HttpInstrumentation({
                        requestHook: (span, request) => {
                            span.setAttribute('http.request.id', request.headers['x-request-id'] || '');
                        },
                    }),
                    new instrumentation_express_1.ExpressInstrumentation(),
                    new instrumentation_pg_1.PgInstrumentation({
                        enhancedDatabaseReporting: true,
                    }),
                    new instrumentation_redis_4_1.RedisInstrumentation(),
                ]
                : [],
        });
        // Start SDK
        await this.sdk.start();
        // Get tracer and meter
        this.tracer = api_1.trace.getTracer(this.config.serviceName, this.config.serviceVersion);
        this.meter = api_2.metrics.getMeter(this.config.serviceName, this.config.serviceVersion);
        // Initialize metrics
        this.initializeMetrics();
        console.log(`Telemetry initialized for ${this.config.serviceName}`);
    }
    /**
     * Initialize custom metrics
     */
    initializeMetrics() {
        if (!this.meter)
            return;
        // Event ingestion metrics
        this.eventIngestCounter = this.meter.createCounter('audit_events_ingested_total', {
            description: 'Total number of audit events ingested',
            unit: '1',
        });
        this.eventIngestLatency = this.meter.createHistogram('audit_event_ingest_latency_ms', {
            description: 'Latency of audit event ingestion in milliseconds',
            unit: 'ms',
        });
        // Chain metrics
        this.chainLengthGauge = this.meter.createObservableGauge('audit_chain_length', {
            description: 'Current length of the audit hash chain',
            unit: '1',
        });
        if (this.chainLengthCallback) {
            this.chainLengthGauge.addCallback((result) => {
                result.observe(this.chainLengthCallback?.() || 0, {
                    tenant: 'default',
                });
            });
        }
        // Verification metrics
        this.verificationCounter = this.meter.createCounter('audit_verifications_total', {
            description: 'Total number of audit chain verifications',
            unit: '1',
        });
        this.verificationLatency = this.meter.createHistogram('audit_verification_latency_ms', {
            description: 'Latency of audit chain verification in milliseconds',
            unit: 'ms',
        });
        // Error metrics
        this.errorCounter = this.meter.createCounter('audit_errors_total', {
            description: 'Total number of audit service errors',
            unit: '1',
        });
        // Active events gauge
        this.activeEventsGauge = this.meter.createUpDownCounter('audit_events_in_buffer', {
            description: 'Number of events currently in the buffer',
            unit: '1',
        });
        // Redaction metrics
        this.redactionCounter = this.meter.createCounter('audit_redactions_total', {
            description: 'Total number of audit event redactions',
            unit: '1',
        });
        // Search and export latency
        this.searchLatency = this.meter.createHistogram('audit_search_latency_ms', {
            description: 'Latency of audit event searches in milliseconds',
            unit: 'ms',
        });
        this.exportLatency = this.meter.createHistogram('audit_export_latency_ms', {
            description: 'Latency of audit report exports in milliseconds',
            unit: 'ms',
        });
        // Backpressure gauge
        this.backpressureGauge = this.meter.createObservableGauge('audit_backpressure_level', {
            description: 'Current backpressure level (0-1)',
            unit: '1',
        });
        if (this.backpressureCallback) {
            this.backpressureGauge.addCallback((result) => {
                result.observe(this.backpressureCallback?.() || 0);
            });
        }
    }
    /**
     * Get the tracer instance
     */
    getTracer() {
        if (!this.tracer) {
            throw new Error('Telemetry not initialized');
        }
        return this.tracer;
    }
    /**
     * Get the meter instance
     */
    getMeter() {
        if (!this.meter) {
            throw new Error('Telemetry not initialized');
        }
        return this.meter;
    }
    /**
     * Start a new span for an audit operation
     */
    startAuditSpan(name, attributes, kind = api_1.SpanKind.INTERNAL) {
        const tracer = this.getTracer();
        return tracer.startSpan(name, {
            kind,
            attributes: attributes,
        });
    }
    /**
     * Create a span context for audit event tracing
     */
    withAuditContext(name, attributes, fn) {
        const span = this.startAuditSpan(name, attributes);
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), async () => {
            try {
                const result = await fn(span);
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
        });
    }
    /**
     * Record event ingestion
     */
    recordEventIngested(eventType, isCritical, tenantId, latencyMs) {
        this.eventIngestCounter?.add(1, {
            event_type: eventType,
            is_critical: isCritical.toString(),
            tenant_id: tenantId,
        });
        this.eventIngestLatency?.record(latencyMs, {
            event_type: eventType,
            is_critical: isCritical.toString(),
        });
    }
    /**
     * Record verification
     */
    recordVerification(success, scope, latencyMs, eventCount) {
        this.verificationCounter?.add(1, {
            success: success.toString(),
            scope,
        });
        this.verificationLatency?.record(latencyMs, {
            scope,
            event_count_bucket: this.getBucket(eventCount),
        });
    }
    /**
     * Record error
     */
    recordError(errorType, operation, tenantId) {
        this.errorCounter?.add(1, {
            error_type: errorType,
            operation,
            tenant_id: tenantId || 'unknown',
        });
    }
    /**
     * Record buffer change
     */
    recordBufferChange(delta) {
        this.activeEventsGauge?.add(delta);
    }
    /**
     * Record redaction
     */
    recordRedaction(reason, tenantId) {
        this.redactionCounter?.add(1, {
            reason,
            tenant_id: tenantId,
        });
    }
    /**
     * Record search operation
     */
    recordSearch(latencyMs, resultCount, hasFilters) {
        this.searchLatency?.record(latencyMs, {
            result_count_bucket: this.getBucket(resultCount),
            has_filters: hasFilters.toString(),
        });
    }
    /**
     * Record export operation
     */
    recordExport(format, latencyMs, eventCount) {
        this.exportLatency?.record(latencyMs, {
            format,
            event_count_bucket: this.getBucket(eventCount),
        });
    }
    /**
     * Set chain length callback
     */
    setChainLengthCallback(callback) {
        this.chainLengthCallback = callback;
    }
    /**
     * Set backpressure callback
     */
    setBackpressureCallback(callback) {
        this.backpressureCallback = callback;
    }
    /**
     * Create baggage with audit context
     */
    createAuditBaggage(correlationId, tenantId, sessionId) {
        return api_1.propagation.createBaggage({
            'audit.correlation_id': { value: correlationId },
            'audit.tenant_id': { value: tenantId },
            'audit.session_id': { value: sessionId },
        });
    }
    /**
     * Get bucket label for histogram
     */
    getBucket(value) {
        if (value === 0)
            return '0';
        if (value <= 10)
            return '1-10';
        if (value <= 100)
            return '11-100';
        if (value <= 1000)
            return '101-1000';
        if (value <= 10000)
            return '1001-10000';
        return '10000+';
    }
    /**
     * Shutdown telemetry
     */
    async shutdown() {
        if (this.sdk) {
            await this.sdk.shutdown();
            console.log('Telemetry shutdown complete');
        }
    }
}
exports.TelemetryManager = TelemetryManager;
/**
 * Global telemetry instance
 */
let globalTelemetry = null;
/**
 * Initialize global telemetry
 */
async function initializeTelemetry(config = {}) {
    if (!globalTelemetry) {
        globalTelemetry = new TelemetryManager(config);
        await globalTelemetry.initialize();
    }
    return globalTelemetry;
}
/**
 * Get global telemetry instance
 */
function getTelemetry() {
    if (!globalTelemetry) {
        throw new Error('Telemetry not initialized. Call initializeTelemetry first.');
    }
    return globalTelemetry;
}
/**
 * Shutdown global telemetry
 */
async function shutdownTelemetry() {
    if (globalTelemetry) {
        await globalTelemetry.shutdown();
        globalTelemetry = null;
    }
}

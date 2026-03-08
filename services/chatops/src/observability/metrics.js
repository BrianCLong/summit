"use strict";
// @ts-nocheck
/**
 * ChatOps Observability & Metrics Layer
 *
 * Provides comprehensive observability for the ChatOps service:
 * - OpenTelemetry integration (traces, metrics, logs)
 * - Custom business metrics
 * - SLI/SLO tracking
 * - Alert integration
 * - Health checks
 *
 * Metrics categories:
 * - Session metrics (active, created, expired)
 * - Message processing (latency, throughput)
 * - Model usage (tokens, cost estimation)
 * - Risk classification distribution
 * - Approval workflow timings
 * - Guardrail triggering rates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityService = void 0;
exports.Traced = Traced;
exports.Metered = Metered;
exports.createObservabilityService = createObservabilityService;
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const api_1 = require("@opentelemetry/api");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
// =============================================================================
// OBSERVABILITY SERVICE
// =============================================================================
class ObservabilityService {
    config;
    tracer;
    meterProvider;
    tracerProvider;
    // Metric instruments
    sessionGauge;
    messageCounter;
    messageLatencyHistogram;
    tokenCounter;
    riskCounter;
    approvalGauge;
    guardrailCounter;
    errorCounter;
    // In-memory aggregations for SLO calculations
    latencies = [];
    errorCount = 0;
    totalRequests = 0;
    constructor(config) {
        this.config = {
            prometheusPort: 9464,
            enableTracing: true,
            enableMetrics: true,
            sampleRate: 1.0,
            ...config,
        };
        this.tracer = api_1.trace.getTracer(config.serviceName, config.serviceVersion);
        this.setupInstrumentation();
    }
    // ===========================================================================
    // SETUP
    // ===========================================================================
    setupInstrumentation() {
        const resource = new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
            [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        });
        // Setup tracing
        if (this.config.enableTracing) {
            this.tracerProvider = new sdk_trace_node_1.NodeTracerProvider({ resource });
            if (this.config.otlpEndpoint) {
                const exporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
                    url: this.config.otlpEndpoint,
                });
                this.tracerProvider.addSpanProcessor(new sdk_trace_base_1.BatchSpanProcessor(exporter));
            }
            this.tracerProvider.register();
        }
        // Setup metrics
        if (this.config.enableMetrics) {
            const prometheusExporter = new exporter_prometheus_1.PrometheusExporter({
                port: this.config.prometheusPort,
            });
            this.meterProvider = new sdk_metrics_1.MeterProvider({
                resource,
                readers: [
                    new sdk_metrics_1.PeriodicExportingMetricReader({
                        exporter: prometheusExporter,
                        exportIntervalMillis: 15000,
                    }),
                ],
            });
            this.setupMetricInstruments();
        }
    }
    setupMetricInstruments() {
        if (!this.meterProvider)
            return;
        const meter = this.meterProvider.getMeter(this.config.serviceName);
        // Session metrics
        this.sessionGauge = meter.createObservableGauge('chatops_sessions', {
            description: 'Number of active ChatOps sessions',
        });
        // Message processing metrics
        this.messageCounter = meter.createCounter('chatops_messages_total', {
            description: 'Total messages processed',
        });
        this.messageLatencyHistogram = meter.createHistogram('chatops_message_latency_ms', {
            description: 'Message processing latency in milliseconds',
            boundaries: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
        });
        // Token usage metrics
        this.tokenCounter = meter.createCounter('chatops_tokens_total', {
            description: 'Total tokens used',
        });
        // Risk classification metrics
        this.riskCounter = meter.createCounter('chatops_risk_classifications_total', {
            description: 'Risk classifications by level',
        });
        // Approval metrics
        this.approvalGauge = meter.createObservableGauge('chatops_approvals_pending', {
            description: 'Number of pending approvals',
        });
        // Guardrail metrics
        this.guardrailCounter = meter.createCounter('chatops_guardrail_triggers_total', {
            description: 'Guardrail trigger events',
        });
        // Error metrics
        this.errorCounter = meter.createCounter('chatops_errors_total', {
            description: 'Total errors by type',
        });
    }
    // ===========================================================================
    // TRACING
    // ===========================================================================
    /**
     * Start a new span for an operation
     */
    startSpan(name, options) {
        const spanOptions = {
            kind: options?.kind || api_1.SpanKind.INTERNAL,
            attributes: options?.attributes,
        };
        if (options?.parentSpan) {
            const ctx = api_1.trace.setSpan(api_1.context.active(), options.parentSpan);
            return this.tracer.startSpan(name, spanOptions, ctx);
        }
        return this.tracer.startSpan(name, spanOptions);
    }
    /**
     * Wrap an async function with a span
     */
    async withSpan(name, fn, options) {
        const span = this.startSpan(name, options);
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
    }
    /**
     * Add an event to the current span
     */
    addSpanEvent(span, name, attributes) {
        span.addEvent(name, attributes);
    }
    // ===========================================================================
    // METRICS RECORDING
    // ===========================================================================
    /**
     * Record a message processed
     */
    recordMessage(attributes) {
        this.messageCounter?.add(1, {
            platform: attributes.platform,
            intent: attributes.intent || 'unknown',
            success: String(attributes.success),
        });
        this.messageLatencyHistogram?.record(attributes.latencyMs, {
            platform: attributes.platform,
        });
        // Track for SLO calculations
        this.latencies.push(attributes.latencyMs);
        this.totalRequests++;
        if (!attributes.success)
            this.errorCount++;
        // Keep rolling window of last 10000 requests
        if (this.latencies.length > 10000) {
            this.latencies = this.latencies.slice(-10000);
        }
    }
    /**
     * Record token usage
     */
    recordTokens(attributes) {
        const totalTokens = attributes.inputTokens + attributes.outputTokens;
        this.tokenCounter?.add(totalTokens, {
            model: attributes.model,
            type: 'total',
            operation: attributes.operation,
        });
        this.tokenCounter?.add(attributes.inputTokens, {
            model: attributes.model,
            type: 'input',
            operation: attributes.operation,
        });
        this.tokenCounter?.add(attributes.outputTokens, {
            model: attributes.model,
            type: 'output',
            operation: attributes.operation,
        });
    }
    /**
     * Record risk classification
     */
    recordRiskClassification(attributes) {
        this.riskCounter?.add(1, {
            level: attributes.level,
            tool_id: attributes.toolId,
            operation: attributes.operation,
        });
    }
    /**
     * Record guardrail trigger
     */
    recordGuardrailTrigger(attributes) {
        this.guardrailCounter?.add(1, {
            category: attributes.category,
            action: attributes.action,
        });
    }
    /**
     * Record an error
     */
    recordError(attributes) {
        this.errorCounter?.add(1, {
            type: attributes.type,
            code: attributes.code || 'unknown',
            component: attributes.component,
        });
    }
    // ===========================================================================
    // SLO TRACKING
    // ===========================================================================
    /**
     * Get current SLO status
     */
    getSLOStatus() {
        const slos = [];
        // Availability SLO (99.9%)
        const errorRate = this.totalRequests > 0
            ? this.errorCount / this.totalRequests
            : 0;
        const availability = 1 - errorRate;
        slos.push({
            name: 'Availability',
            target: 0.999,
            current: availability,
            status: availability >= 0.999 ? 'healthy' : availability >= 0.995 ? 'warning' : 'critical',
            windowHours: 24,
        });
        // Latency SLO (P95 < 500ms)
        if (this.latencies.length > 0) {
            const sorted = [...this.latencies].sort((a, b) => a - b);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p95 = sorted[p95Index];
            slos.push({
                name: 'Latency P95',
                target: 500,
                current: p95,
                status: p95 <= 500 ? 'healthy' : p95 <= 1000 ? 'warning' : 'critical',
                windowHours: 1,
            });
            // P99 < 2000ms
            const p99Index = Math.floor(sorted.length * 0.99);
            const p99 = sorted[p99Index];
            slos.push({
                name: 'Latency P99',
                target: 2000,
                current: p99,
                status: p99 <= 2000 ? 'healthy' : p99 <= 5000 ? 'warning' : 'critical',
                windowHours: 1,
            });
        }
        return slos;
    }
    // ===========================================================================
    // HEALTH CHECKS
    // ===========================================================================
    /**
     * Comprehensive health check
     */
    async getHealthStatus() {
        const checks = [];
        // Service check
        checks.push({
            name: 'service',
            status: 'pass',
            message: 'Service is running',
        });
        // SLO checks
        const slos = this.getSLOStatus();
        for (const slo of slos) {
            checks.push({
                name: `slo_${slo.name.toLowerCase().replace(/\s+/g, '_')}`,
                status: slo.status === 'healthy' ? 'pass' : slo.status === 'warning' ? 'warn' : 'fail',
                message: `${slo.name}: ${slo.current.toFixed(3)} (target: ${slo.target})`,
            });
        }
        // Determine overall status
        const failCount = checks.filter(c => c.status === 'fail').length;
        const warnCount = checks.filter(c => c.status === 'warn').length;
        let status = 'healthy';
        if (failCount > 0)
            status = 'unhealthy';
        else if (warnCount > 0)
            status = 'degraded';
        return { status, checks, slos };
    }
    // ===========================================================================
    // DASHBOARDS DATA
    // ===========================================================================
    /**
     * Get aggregated metrics for dashboard
     */
    getAggregatedMetrics() {
        // In production, these would query Prometheus/metric stores
        // Here we provide the structure
        return {
            sessions: {
                active: 0,
                created: 0,
                expired: 0,
                byPlatform: {},
                byTenant: {},
            },
            messages: {
                totalProcessed: this.totalRequests,
                avgLatencyMs: this.latencies.length > 0
                    ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
                    : 0,
                p95LatencyMs: 0,
                p99LatencyMs: 0,
                errorRate: this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0,
                byIntent: {},
            },
            model: {
                totalRequests: 0,
                totalTokens: 0,
                inputTokens: 0,
                outputTokens: 0,
                estimatedCostUsd: 0,
                avgLatencyMs: 0,
                byModel: {},
            },
            risk: {
                byLevel: {},
                approvalsPending: 0,
                approvalsGranted: 0,
                approvalsDenied: 0,
                avgApprovalTimeMs: 0,
            },
            guardrails: {
                totalChecks: 0,
                blockedAttempts: 0,
                byCategory: {},
                falsePositiveRate: 0,
            },
        };
    }
    // ===========================================================================
    // CLEANUP
    // ===========================================================================
    async shutdown() {
        if (this.tracerProvider) {
            await this.tracerProvider.shutdown();
        }
        if (this.meterProvider) {
            await this.meterProvider.shutdown();
        }
    }
}
exports.ObservabilityService = ObservabilityService;
// =============================================================================
// DECORATORS
// =============================================================================
/**
 * Decorator for automatic span creation
 */
function Traced(operationName) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const name = operationName || `${target.constructor.name}.${propertyKey}`;
        descriptor.value = async function (...args) {
            const observability = this.observability;
            if (!observability) {
                return originalMethod.apply(this, args);
            }
            return observability.withSpan(name, async (span) => {
                return originalMethod.apply(this, args);
            });
        };
        return descriptor;
    };
}
/**
 * Decorator for automatic metric recording
 */
function Metered(metricName, attributes) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const observability = this.observability;
            const startTime = Date.now();
            try {
                const result = await originalMethod.apply(this, args);
                if (observability) {
                    observability.recordMessage({
                        platform: attributes?.platform || 'unknown',
                        intent: attributes?.intent,
                        success: true,
                        latencyMs: Date.now() - startTime,
                    });
                }
                return result;
            }
            catch (error) {
                if (observability) {
                    observability.recordMessage({
                        platform: attributes?.platform || 'unknown',
                        intent: attributes?.intent,
                        success: false,
                        latencyMs: Date.now() - startTime,
                    });
                    observability.recordError({
                        type: error instanceof Error ? error.constructor.name : 'UnknownError',
                        component: metricName,
                    });
                }
                throw error;
            }
        };
        return descriptor;
    };
}
// =============================================================================
// FACTORY
// =============================================================================
function createObservabilityService(config) {
    return new ObservabilityService(config);
}

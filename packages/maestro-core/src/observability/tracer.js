"use strict";
// @ts-nocheck
/**
 * Maestro Observability - Distributed Tracing and Metrics
 * Provides end-to-end visibility across workflow execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroTracer = void 0;
exports.initializeTracing = initializeTracing;
exports.getTracer = getTracer;
exports.traced = traced;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const api_1 = require("@opentelemetry/api");
const events_1 = require("events");
class MaestroTracer extends events_1.EventEmitter {
    config;
    sdk;
    tracer;
    meter;
    // Metrics
    workflowRunsTotal;
    workflowDuration;
    stepExecutionsTotal;
    stepDuration;
    activeRunsValue = 0;
    costTotal;
    errorRate;
    constructor(config) {
        super();
        this.config = config;
        this.initializeSDK();
        this.initializeTracer();
        this.initializeMetrics();
    }
    initializeSDK() {
        // Create resource
        const resource = new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
            [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAMESPACE]: 'maestro',
        });
        // Configure exporters
        const exporters = [];
        if (this.config.jaegerEndpoint) {
            exporters.push(new exporter_jaeger_1.JaegerExporter({
                endpoint: this.config.jaegerEndpoint,
            }));
        }
        const prometheusExporter = new exporter_prometheus_1.PrometheusExporter({
            port: this.config.prometheusPort || 9090,
        });
        // Initialize SDK
        this.sdk = new sdk_node_1.NodeSDK({
            resource,
            traceExporter: exporters.length > 0 ? exporters[0] : undefined,
            metricReader: prometheusExporter,
            instrumentations: this.config.enableAutoInstrumentation !== false
                ? [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()]
                : [],
        });
    }
    initializeTracer() {
        this.tracer = api_1.trace.getTracer(this.config.serviceName, this.config.serviceVersion);
    }
    initializeMetrics() {
        this.meter = api_1.metrics.getMeter(this.config.serviceName, this.config.serviceVersion);
        // Workflow metrics
        this.workflowRunsTotal = this.meter.createCounter('maestro_workflow_runs_total', {
            description: 'Total number of workflow runs',
        });
        this.workflowDuration = this.meter.createHistogram('maestro_workflow_duration_seconds', {
            description: 'Workflow execution duration in seconds',
            unit: 's',
        });
        // Step metrics
        this.stepExecutionsTotal = this.meter.createCounter('maestro_step_executions_total', {
            description: 'Total number of step executions',
        });
        this.stepDuration = this.meter.createHistogram('maestro_step_duration_seconds', {
            description: 'Step execution duration in seconds',
            unit: 's',
        });
        // System metrics
        this.meter.createObservableGauge('maestro_active_runs', {
            description: 'Number of currently active workflow runs',
        }, (observableResult) => {
            observableResult.observe(this.activeRunsValue);
        });
        this.costTotal = this.meter.createCounter('maestro_cost_usd_total', {
            description: 'Total cost in USD',
            unit: 'USD',
        });
        this.errorRate = this.meter.createCounter('maestro_errors_total', {
            description: 'Total number of errors',
        });
    }
    async start() {
        await this.sdk.start();
        console.log('Maestro tracing initialized');
    }
    async shutdown() {
        await this.sdk.shutdown();
    }
    // Workflow tracing
    startSpan(operationName, options) {
        return this.tracer.startSpan(operationName, options);
    }
    startWorkflowSpan(runId, workflowName, attributes = {}) {
        const span = this.tracer.startSpan(`workflow:${workflowName}`, {
            kind: api_1.SpanKind.SERVER,
            attributes: {
                'maestro.run_id': runId,
                'maestro.workflow.name': workflowName,
                'maestro.workflow.version': attributes.version || '1.0.0',
                'maestro.tenant_id': attributes.tenant_id,
                'maestro.environment': attributes.environment,
                ...attributes,
            },
        });
        // Record workflow start
        this.workflowRunsTotal.add(1, {
            workflow_name: workflowName,
            environment: attributes.environment || 'unknown',
            tenant_id: attributes.tenant_id || 'unknown',
        });
        return span;
    }
    finishWorkflowSpan(span, status, duration, metadata = {}) {
        // Set span status
        if (status === 'completed') {
            span.setStatus({ code: api_1.SpanStatusCode.OK });
        }
        else {
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: metadata.error || `Workflow ${status}`,
            });
        }
        // Add metadata
        span.setAttributes({
            'maestro.workflow.status': status,
            'maestro.workflow.duration_ms': duration,
            'maestro.workflow.total_steps': metadata.total_steps || 0,
            'maestro.workflow.completed_steps': metadata.completed_steps || 0,
            'maestro.workflow.failed_steps': metadata.failed_steps || 0,
            'maestro.workflow.total_cost_usd': metadata.total_cost || 0,
        });
        span.end();
        // Record metrics
        this.workflowDuration.record(duration / 1000, {
            workflow_name: span.getAttribute('maestro.workflow.name'),
            status,
            environment: span.getAttribute('maestro.environment'),
        });
        if (metadata.total_cost) {
            this.costTotal.add(metadata.total_cost, {
                workflow_name: span.getAttribute('maestro.workflow.name'),
                tenant_id: span.getAttribute('maestro.tenant_id'),
            });
        }
        if (status !== 'completed') {
            this.errorRate.add(1, {
                error_type: status,
                workflow_name: span.getAttribute('maestro.workflow.name'),
            });
        }
    }
    // Step tracing
    startStepSpan(parentSpan, stepId, stepName, plugin, attributes = {}) {
        const span = this.tracer.startSpan(`step:${stepName}`, {
            parent: parentSpan,
            kind: api_1.SpanKind.INTERNAL,
            attributes: {
                'maestro.step.id': stepId,
                'maestro.step.name': stepName,
                'maestro.step.plugin': plugin,
                'maestro.step.attempt': attributes.attempt || 1,
                ...attributes,
            },
        });
        // Record step start
        this.stepExecutionsTotal.add(1, {
            step_plugin: plugin,
            step_name: stepName,
        });
        return span;
    }
    finishStepSpan(span, status, duration, metadata = {}) {
        // Set span status
        if (status === 'succeeded') {
            span.setStatus({ code: api_1.SpanStatusCode.OK });
        }
        else {
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: metadata.error || 'Step failed',
            });
        }
        // Add metadata
        span.setAttributes({
            'maestro.step.status': status,
            'maestro.step.duration_ms': duration,
            'maestro.step.cost_usd': metadata.cost_usd || 0,
            'maestro.step.output_size': metadata.output_size || 0,
        });
        // Add plugin-specific attributes
        if (metadata.model) {
            span.setAttribute('maestro.ai.model', metadata.model);
        }
        if (metadata.url) {
            span.setAttribute('maestro.http.url', metadata.url);
        }
        if (metadata.status_code) {
            span.setAttribute('maestro.http.status_code', metadata.status_code);
        }
        span.end();
        // Record metrics
        this.stepDuration.record(duration / 1000, {
            step_plugin: span.getAttribute('maestro.step.plugin'),
            status,
            step_name: span.getAttribute('maestro.step.name'),
        });
        if (metadata.cost_usd) {
            this.costTotal.add(metadata.cost_usd, {
                plugin: span.getAttribute('maestro.step.plugin'),
            });
        }
        if (status === 'failed') {
            this.errorRate.add(1, {
                error_type: 'step_failure',
                plugin: span.getAttribute('maestro.step.plugin'),
            });
        }
    }
    // Plugin-specific tracing helpers
    traceAIRequest(parentSpan, provider, model, operation, attributes = {}) {
        return this.tracer.startSpan(`ai:${provider}:${operation}`, {
            parent: parentSpan,
            kind: api_1.SpanKind.CLIENT,
            attributes: {
                'ai.provider': provider,
                'ai.model': model,
                'ai.operation': operation,
                'ai.prompt_tokens': attributes.prompt_tokens,
                'ai.completion_tokens': attributes.completion_tokens,
                'ai.total_tokens': attributes.total_tokens,
                ...attributes,
            },
        });
    }
    traceHttpRequest(parentSpan, method, url, attributes = {}) {
        return this.tracer.startSpan(`http:${method}`, {
            parent: parentSpan,
            kind: api_1.SpanKind.CLIENT,
            attributes: {
                'http.method': method,
                'http.url': url,
                'http.user_agent': attributes.user_agent,
                ...attributes,
            },
        });
    }
    // Context management
    withSpan(span, fn) {
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), fn);
    }
    getCurrentSpan() {
        return api_1.trace.getActiveSpan();
    }
    // Metrics helpers
    updateActiveRuns(count) {
        this.activeRunsValue = count;
    }
    recordError(errorType, attributes = {}) {
        this.errorRate.add(1, {
            error_type: errorType,
            ...attributes,
        });
    }
    // Baggage and propagation
    injectTraceContext(headers) {
        api_1.propagation.inject(api_1.context.active(), headers);
    }
    extractTraceContext(headers) {
        return api_1.propagation.extract(api_1.context.active(), headers);
    }
    // Custom events
    addEvent(name, attributes = {}) {
        const span = this.getCurrentSpan();
        if (span) {
            span.addEvent(name, {
                timestamp: Date.now(),
                ...attributes,
            });
        }
        // Also emit as EventEmitter event for local handling
        this.emit('trace-event', { name, attributes, timestamp: Date.now() });
    }
    // Health check
    isHealthy() {
        try {
            // Basic health check - ensure tracer is working
            const testSpan = this.tracer.startSpan('health-check');
            testSpan.end();
            return true;
        }
        catch (error) {
            console.error('Tracing health check failed:', error);
            return false;
        }
    }
}
exports.MaestroTracer = MaestroTracer;
// Singleton instance
let tracerInstance = null;
function initializeTracing(config) {
    if (tracerInstance) {
        return tracerInstance;
    }
    tracerInstance = new MaestroTracer(config);
    return tracerInstance;
}
function getTracer() {
    if (!tracerInstance) {
        throw new Error('Tracing not initialized. Call initializeTracing first.');
    }
    return tracerInstance;
}
// Decorator for automatic tracing
function traced(operationName) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const tracerInstance = getTracer();
            const span = tracerInstance.startSpan(operationName || `${target.constructor.name}.${propertyKey}`);
            try {
                const result = await tracerInstance.withSpan(span, () => originalMethod.apply(this, args));
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error.message,
                });
                throw error;
            }
            finally {
                span.end();
            }
        };
        return descriptor;
    };
}

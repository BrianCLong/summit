"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryClient = void 0;
exports.createTelemetryClient = createTelemetryClient;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
/**
 * TelemetryClient - Synchronous writer to JSONL with optional Prometheus/OTel export
 *
 * Provides unified trace collection for eval runs with support for:
 * - JSONL file output
 * - Prometheus metrics endpoint (stub)
 * - OpenTelemetry export (stub)
 */
class TelemetryClient {
    config;
    traces = [];
    writeStream;
    flushTimer;
    metricsBuffer = new Map();
    constructor(config = {}) {
        this.config = {
            outputPath: config.outputPath ?? './eval-traces.jsonl',
            format: config.format ?? 'jsonl',
            flushIntervalMs: config.flushIntervalMs ?? 5000,
            enableMetrics: config.enableMetrics ?? true,
            enableTracing: config.enableTracing ?? true,
            prometheusPort: config.prometheusPort,
            otlpEndpoint: config.otlpEndpoint,
        };
        this.initialize();
    }
    initialize() {
        // Ensure output directory exists
        const dir = (0, node_path_1.dirname)(this.config.outputPath);
        (0, node_fs_1.mkdirSync)(dir, { recursive: true });
        // Open write stream for JSONL
        if (this.config.format === 'jsonl') {
            this.writeStream = (0, node_fs_1.createWriteStream)(this.config.outputPath, {
                flags: 'a',
                encoding: 'utf8',
            });
        }
        // Set up periodic flush
        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.config.flushIntervalMs);
    }
    /**
     * Record a trace
     */
    recordTrace(trace) {
        this.traces.push(trace);
        // Write to JSONL immediately
        if (this.writeStream && this.config.format === 'jsonl') {
            this.writeStream.write(JSON.stringify(trace) + '\n');
        }
        // Update metrics buffer
        if (trace.summary) {
            this.incrementMetric('traces_total', 1);
            this.incrementMetric('traces_success', trace.summary.success ? 1 : 0);
            this.incrementMetric('tokens_total', trace.summary.totalTokens);
            this.incrementMetric('cost_usd_total', trace.summary.totalCostUsd);
            this.incrementMetric('tool_calls_total', trace.summary.toolCallCount);
            this.incrementMetric('errors_total', trace.summary.errorCount);
            this.incrementMetric('safety_violations_total', trace.summary.safetyViolations);
        }
    }
    /**
     * Record a single metric
     */
    recordMetric(name, value, labels) {
        const key = labels
            ? `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
            : name;
        this.metricsBuffer.set(key, value);
    }
    /**
     * Increment a metric
     */
    incrementMetric(name, delta) {
        const current = this.metricsBuffer.get(name) ?? 0;
        this.metricsBuffer.set(name, current + delta);
    }
    /**
     * Get current metrics snapshot
     */
    getMetrics() {
        return new Map(this.metricsBuffer);
    }
    /**
     * Flush pending writes
     */
    flush() {
        // For JSONL, the stream handles flushing
        // This is where we'd push to Prometheus/OTel
        if (this.config.prometheusPort) {
            this.exportToPrometheus();
        }
        if (this.config.otlpEndpoint) {
            this.exportToOTLP();
        }
    }
    /**
     * Export to Prometheus (stub - implement with prom-client in production)
     */
    exportToPrometheus() {
        // Stub: In production, use prom-client to expose metrics
        // const register = new Registry();
        // const gauge = new Gauge({ name: 'eval_traces_total', help: '...' });
        console.log('[Telemetry] Prometheus export stub - port:', this.config.prometheusPort);
    }
    /**
     * Export to OpenTelemetry (stub - implement with @opentelemetry/sdk-trace-node)
     */
    exportToOTLP() {
        // Stub: In production, use OpenTelemetry SDK
        // const exporter = new OTLPTraceExporter({ url: this.config.otlpEndpoint });
        console.log('[Telemetry] OTLP export stub - endpoint:', this.config.otlpEndpoint);
    }
    /**
     * Generate a telemetry export bundle
     */
    export() {
        const metrics = this.calculateAggregateMetrics();
        return {
            traces: [...this.traces],
            metrics,
            timestamp: new Date().toISOString(),
            metadata: {
                outputPath: this.config.outputPath,
                traceCount: this.traces.length,
            },
        };
    }
    /**
     * Calculate aggregate metrics from all traces
     */
    calculateAggregateMetrics() {
        const successCount = this.traces.filter((t) => t.summary?.success).length;
        const totalDurationMs = this.traces.reduce((sum, t) => sum + (t.summary?.totalDurationMs ?? 0), 0);
        const totalTokens = this.traces.reduce((sum, t) => sum + (t.summary?.totalTokens ?? 0), 0);
        const totalCostUsd = this.traces.reduce((sum, t) => sum + (t.summary?.totalCostUsd ?? 0), 0);
        const totalToolCalls = this.traces.reduce((sum, t) => sum + (t.summary?.toolCallCount ?? 0), 0);
        const totalErrors = this.traces.reduce((sum, t) => sum + (t.summary?.errorCount ?? 0), 0);
        const totalSafetyViolations = this.traces.reduce((sum, t) => sum + (t.summary?.safetyViolations ?? 0), 0);
        // Calculate latency percentiles
        const durations = this.traces
            .map((t) => t.summary?.totalDurationMs ?? 0)
            .sort((a, b) => a - b);
        const p50 = durations[Math.floor(durations.length * 0.5)] ?? 0;
        const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;
        const p99 = durations[Math.floor(durations.length * 0.99)] ?? 0;
        const avg = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;
        return {
            taskSuccessRate: this.traces.length > 0 ? successCount / this.traces.length : 0,
            taskCompletionTime: totalDurationMs,
            totalTokens,
            inputTokens: 0, // Would need to aggregate from events
            outputTokens: 0,
            totalCostUsd,
            costPerSuccessfulTask: successCount > 0 ? totalCostUsd / successCount : 0,
            p50LatencyMs: p50,
            p95LatencyMs: p95,
            p99LatencyMs: p99,
            avgLatencyMs: avg,
            toolCallCount: totalToolCalls,
            toolSuccessRate: totalToolCalls > 0 ? 1 - totalErrors / totalToolCalls : 1,
            avgToolLatencyMs: totalToolCalls > 0 ? totalDurationMs / totalToolCalls : 0,
            safetyViolationCount: totalSafetyViolations,
            safetyViolationRate: this.traces.length > 0
                ? totalSafetyViolations / this.traces.length
                : 0,
            jailbreakAttempts: 0, // Would need specific tracking
            jailbreakSuccesses: 0,
            routingDecisionCount: 0, // Would aggregate from events
            routingAccuracy: 0,
            costSavingsVsBaseline: 0,
        };
    }
    /**
     * Close the client and clean up resources
     */
    async close() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flush();
        if (this.writeStream) {
            await new Promise((resolve, reject) => {
                this.writeStream.end((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
    }
}
exports.TelemetryClient = TelemetryClient;
/**
 * Create a default telemetry client for quick setup
 */
function createTelemetryClient(outputPath) {
    return new TelemetryClient({
        outputPath: outputPath ?? './experiments/traces.jsonl',
        format: 'jsonl',
        enableMetrics: true,
        enableTracing: true,
    });
}

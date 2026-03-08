"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetry = exports.MaestroTelemetry = void 0;
// @ts-nocheck
const api_1 = require("@opentelemetry/api");
/**
 * Maestro Telemetry Helper
 * Wraps OpenTelemetry APIs to provide a consistent interface for Maestro components.
 */
class MaestroTelemetry {
    static _instance;
    tracer = api_1.trace.getTracer('maestro-orchestrator');
    meter = api_1.metrics.getMeter('maestro-orchestrator');
    // Cache for instruments to avoid recreation overhead
    counters = new Map();
    histograms = new Map();
    constructor() { }
    static getInstance() {
        if (!MaestroTelemetry._instance) {
            MaestroTelemetry._instance = new MaestroTelemetry();
        }
        return MaestroTelemetry._instance;
    }
    /**
     * Wraps a function execution in a span.
     */
    async trace(name, attributes, fn) {
        return this.tracer.startActiveSpan(name, { attributes }, async (span) => {
            try {
                const result = await fn();
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (err) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: err instanceof Error ? err.message : String(err),
                });
                span.recordException(err);
                throw err;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Records a counter metric.
     */
    recordCounter(name, value, attributes = {}) {
        let counter = this.counters.get(name);
        if (!counter) {
            counter = this.meter.createCounter(name);
            this.counters.set(name, counter);
        }
        counter.add(value, attributes);
    }
    /**
     * Records a histogram metric (e.g. latency).
     */
    recordHistogram(name, value, attributes = {}) {
        let histogram = this.histograms.get(name);
        if (!histogram) {
            histogram = this.meter.createHistogram(name);
            this.histograms.set(name, histogram);
        }
        histogram.record(value, attributes);
    }
}
exports.MaestroTelemetry = MaestroTelemetry;
exports.telemetry = MaestroTelemetry.getInstance();

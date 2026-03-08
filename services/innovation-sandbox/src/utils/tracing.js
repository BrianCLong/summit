"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traced = traced;
exports.createSpan = createSpan;
exports.getCurrentSpan = getCurrentSpan;
exports.addSpanAttributes = addSpanAttributes;
exports.recordEvent = recordEvent;
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer('innovation-sandbox', '1.0.0');
/**
 * Wrap an async function with OpenTelemetry tracing
 */
function traced(name, fn, attributes) {
    return async (...args) => {
        return tracer.startActiveSpan(name, async (span) => {
            try {
                if (attributes) {
                    span.setAttributes(attributes);
                }
                const result = await fn(...args);
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
    };
}
/**
 * Create a child span for detailed tracing
 */
function createSpan(name) {
    return tracer.startSpan(name);
}
/**
 * Get the current active span
 */
function getCurrentSpan() {
    return api_1.trace.getSpan(api_1.context.active());
}
/**
 * Add attributes to current span
 */
function addSpanAttributes(attributes) {
    const span = getCurrentSpan();
    if (span) {
        span.setAttributes(attributes);
    }
}
/**
 * Record an event on the current span
 */
function recordEvent(name, attributes) {
    const span = getCurrentSpan();
    if (span) {
        span.addEvent(name, attributes);
    }
}

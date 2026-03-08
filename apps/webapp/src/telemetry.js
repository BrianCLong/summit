"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportWebVitals = reportWebVitals;
exports.trackGoldenPathStep = trackGoldenPathStep;
exports.trackError = trackError;
const web_vitals_1 = require("web-vitals");
const tracing_1 = require("./tracing");
const api_1 = require("@opentelemetry/api");
const API_BASE = '/api/monitoring';
function sendMetric(metric) {
    const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
    });
    if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(`${API_BASE}/web-vitals`, blob);
    }
    else {
        fetch(`${API_BASE}/web-vitals`, {
            body,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
        }).catch(e => console.error('Failed to send web vital', e));
    }
}
function reportWebVitals() {
    (0, web_vitals_1.onCLS)(sendMetric);
    (0, web_vitals_1.onINP)(sendMetric);
    (0, web_vitals_1.onLCP)(sendMetric);
    (0, web_vitals_1.onFCP)(sendMetric);
    (0, web_vitals_1.onTTFB)(sendMetric);
}
function trackGoldenPathStep(step, status = 'success') {
    const event = {
        event: 'golden_path_step',
        labels: {
            step,
            status,
            tenantId: 'unknown', // Could be enriched if we had user context here
        },
    };
    fetch(`${API_BASE}/telemetry/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    }).catch((err) => console.error('Failed to report telemetry', err));
    tracing_1.tracer.startActiveSpan('golden_path_step', (span) => {
        span.setAttribute('app.step', step);
        span.setAttribute('app.status', status);
        span.setStatus({ code: status === 'success' ? api_1.SpanStatusCode.OK : api_1.SpanStatusCode.ERROR });
        span.end();
    });
}
function trackError(error, component) {
    const event = {
        event: 'ui_error_boundary',
        labels: {
            component,
            message: error.message,
            stack: error.stack,
            tenantId: 'unknown',
        },
    };
    fetch(`${API_BASE}/telemetry/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    }).catch((err) => console.error('Failed to report error telemetry', err));
    tracing_1.tracer.startActiveSpan('ui_error_boundary', (span) => {
        span.setAttribute('app.component', component);
        span.recordException(error);
        span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: error.message });
        span.end();
    });
}

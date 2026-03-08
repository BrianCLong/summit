"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordTelemetryEvent = recordTelemetryEvent;
const audit_1 = require("./audit");
const metrics_1 = require("./metrics");
async function recordTelemetryEvent(event, jobId, startedAt) {
    const context = (0, metrics_1.getTelemetryContext)();
    const durationMs = startedAt ? Date.now() - new Date(startedAt).getTime() : undefined;
    const payload = {
        event,
        labels: { jobId },
        payload: durationMs ? { durationMs } : undefined,
        context,
    };
    try {
        (0, audit_1.recordAudit)(event, { jobId, durationMs });
        await fetch('/api/monitoring/telemetry/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-correlation-id': context.sessionId },
            body: JSON.stringify(payload),
        });
    }
    catch (err) {
        console.warn('Failed to record telemetry', err);
    }
}

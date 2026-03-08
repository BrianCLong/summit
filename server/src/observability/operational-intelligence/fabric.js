"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityFabric = void 0;
const DEFAULT_WINDOW_MS = 5 * 60 * 1000;
const MAX_BUFFER = 500;
function percentile(values, p) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper)
        return sorted[lower];
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
function clampWindow(signals, windowMs) {
    const now = Date.now();
    const threshold = now - windowMs;
    return signals.filter((signal) => signal.timestamp >= threshold);
}
class ObservabilityFabric {
    buffer = [];
    windowMs;
    constructor(windowMs = DEFAULT_WINDOW_MS) {
        this.windowMs = windowMs;
    }
    ingest(signal) {
        this.buffer.push(signal);
        if (this.buffer.length > MAX_BUFFER) {
            this.buffer.shift();
        }
        this.buffer = clampWindow(this.buffer, this.windowMs);
        const correlationId = signal.correlationId ?? signal.traceId;
        if (!correlationId)
            return undefined;
        return this.buildGroup(correlationId);
    }
    buildGroup(correlationId) {
        const correlated = this.buffer.filter((item) => item.correlationId === correlationId || item.traceId === correlationId);
        const services = new Set();
        const traceIds = new Set();
        let windowStart = Number.POSITIVE_INFINITY;
        let windowEnd = 0;
        for (const item of correlated) {
            services.add(item.service);
            if (item.traceId)
                traceIds.add(item.traceId);
            windowStart = Math.min(windowStart, item.timestamp);
            windowEnd = Math.max(windowEnd, item.timestamp);
        }
        return {
            correlationId,
            services,
            traceIds,
            windowStart: Number.isFinite(windowStart) ? windowStart : Date.now(),
            windowEnd,
            signals: correlated,
        };
    }
    getCorrelatedGroups() {
        const ids = new Set();
        const groups = [];
        for (const item of this.buffer) {
            const id = item.correlationId ?? item.traceId;
            if (!id || ids.has(id))
                continue;
            ids.add(id);
            groups.push(this.buildGroup(id));
        }
        return groups;
    }
    getHealthSnapshot() {
        const scoped = clampWindow(this.buffer, this.windowMs);
        const errorLogs = scoped.filter((signal) => signal.kind === 'log' && signal.severity === 'error');
        const traces = scoped.filter((signal) => signal.kind === 'trace');
        const latencies = traces.map((trace) => trace.durationMs).filter((duration) => typeof duration === 'number');
        const services = Array.from(scoped.reduce((acc, signal) => acc.add(signal.service), new Set()));
        const serviceHealth = {};
        for (const service of services) {
            const serviceSignals = scoped.filter((signal) => signal.service === service);
            const serviceErrors = serviceSignals.filter((signal) => signal.kind === 'log' && signal.severity === 'error').length;
            const serviceTraces = serviceSignals.filter((signal) => signal.kind === 'trace');
            const serviceLatencies = serviceTraces.map((trace) => trace.durationMs).filter((duration) => typeof duration === 'number');
            serviceHealth[service] = {
                errorRate: serviceSignals.length ? serviceErrors / serviceSignals.length : 0,
                latencyP95: percentile(serviceLatencies, 0.95),
            };
        }
        return {
            from: scoped[0]?.timestamp ?? Date.now(),
            to: scoped[scoped.length - 1]?.timestamp ?? Date.now(),
            errorRate: scoped.length ? errorLogs.length / scoped.length : 0,
            latencyP95: percentile(latencies, 0.95),
            throughput: scoped.length / (this.windowMs / 1000),
            signalsAnalyzed: scoped.length,
            serviceHealth,
        };
    }
}
exports.ObservabilityFabric = ObservabilityFabric;

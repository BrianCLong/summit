"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionObservability = void 0;
class ExtensionObservability {
    metrics = new Map();
    recordActivation(extensionName, durationMs) {
        const metrics = this.ensureMetrics(extensionName);
        metrics.activations += 1;
        metrics.averageActivationMs =
            (metrics.averageActivationMs * (metrics.activations - 1) + durationMs) /
                metrics.activations;
    }
    recordFailure(extensionName, error) {
        const metrics = this.ensureMetrics(extensionName);
        metrics.failures += 1;
        this.recordTrace(extensionName, 'activation', 0, false, error);
    }
    recordTrace(extensionName, name, durationMs, success, error) {
        const metrics = this.ensureMetrics(extensionName);
        metrics.traces.push({ name, durationMs, success, error });
    }
    recordLog(extensionName, level, message, ...args) {
        const metrics = this.ensureMetrics(extensionName);
        metrics.logs.push({ level, message, timestamp: Date.now(), args });
    }
    getMetrics(extensionName) {
        return this.ensureMetrics(extensionName);
    }
    ensureMetrics(extensionName) {
        const existing = this.metrics.get(extensionName);
        if (existing)
            return existing;
        const metrics = {
            activations: 0,
            failures: 0,
            averageActivationMs: 0,
            logs: [],
            traces: [],
        };
        this.metrics.set(extensionName, metrics);
        return metrics;
    }
}
exports.ExtensionObservability = ExtensionObservability;

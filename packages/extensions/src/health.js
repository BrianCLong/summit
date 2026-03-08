"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionHealthMonitor = void 0;
class ExtensionHealthMonitor {
    registry;
    observability;
    failures = new Map();
    rule;
    constructor(registry, observability, rule) {
        this.registry = registry;
        this.observability = observability;
        this.rule = rule || { maxFailures: 3, windowMs: 5 * 60 * 1000 };
    }
    recordFailure(extensionName) {
        const now = Date.now();
        const entries = this.failures.get(extensionName) || [];
        entries.push(now);
        this.failures.set(extensionName, entries.filter((ts) => now - ts <= this.rule.windowMs));
        if (this.failures.get(extensionName).length >= this.rule.maxFailures) {
            this.registry.disable(extensionName);
            this.observability.recordTrace(extensionName, 'kill-switch', 0, false, 'auto-disabled due to failures');
        }
    }
}
exports.ExtensionHealthMonitor = ExtensionHealthMonitor;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackCollector = void 0;
/**
 * FeedbackCollector - Aggregates multi-source feedback for the evolution engine.
 * Sources: Human simulation, Environment (CI/CD), Meta-metrics.
 */
class FeedbackCollector {
    metrics;
    constructor() {
        this.metrics = new Map();
    }
    recordMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name)?.push(value);
    }
    getAverage(name) {
        const values = this.metrics.get(name) || [];
        if (values.length === 0)
            return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    getSummary() {
        const summary = {};
        for (const key of this.metrics.keys()) {
            summary[key] = this.getAverage(key);
        }
        return summary;
    }
}
exports.FeedbackCollector = FeedbackCollector;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VelocityTracker = void 0;
class VelocityTracker {
    metrics = [];
    /**
     * Ingests a new metric point.
     */
    addMetric(metric) {
        this.metrics.push(metric);
    }
    /**
     * Returns the average velocity (PRs/day) over the tracked period.
     */
    getAverageVelocity() {
        if (this.metrics.length === 0)
            return 0;
        const totalPRs = this.metrics.reduce((acc, m) => acc + m.prCount, 0);
        return totalPRs / this.metrics.length;
    }
    /**
     * Returns the reduction in context switches compared to a baseline.
     * @param baselineSwitches Baseline context switches per day.
     */
    getContextSwitchReduction(baselineSwitches) {
        if (this.metrics.length === 0)
            return 0;
        const currentAvg = this.metrics.reduce((acc, m) => acc + m.contextSwitches, 0) / this.metrics.length;
        return ((baselineSwitches - currentAvg) / baselineSwitches) * 100;
    }
    getMetrics() {
        return this.metrics;
    }
}
exports.VelocityTracker = VelocityTracker;

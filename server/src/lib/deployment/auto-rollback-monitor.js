"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoRollbackMonitor = void 0;
const metrics_js_1 = require("../../monitoring/metrics.js");
class AutoRollbackMonitor {
    rollbackEngine;
    prober;
    config;
    failureCounter = 0;
    serviceName;
    constructor(serviceName, rollbackEngine, prober, config) {
        this.serviceName = serviceName;
        this.rollbackEngine = rollbackEngine;
        this.prober = prober;
        this.config = config;
    }
    /**
     * Checks health and triggers rollback if necessary.
     * intended to be called periodically.
     */
    async checkAndTrigger() {
        const statuses = await this.prober.probeAll();
        // Simple logic: if ALL regions are unhealthy or high latency, we might have a bad deploy.
        // Or if the "primary" region (first one) is bad.
        // Let's assume we care about global health.
        const unhealthyCount = statuses.filter((s) => !s.isHealthy).length;
        const highLatencyCount = statuses.filter((s) => s.isHealthy && s.latencyMs > this.config.latencyThresholdMs).length;
        const totalIssues = unhealthyCount + highLatencyCount;
        const totalRegions = statuses.length;
        // If more than 50% of regions are having issues, increment counter
        if (totalRegions > 0 && (totalIssues / totalRegions) > 0.5) {
            this.failureCounter++;
            console.log(`[AutoRollback] Health check failed (${this.failureCounter}/${this.config.consecutiveFailures}). Issues: ${totalIssues}/${totalRegions}`);
        }
        else {
            this.failureCounter = 0;
        }
        if (this.failureCounter >= this.config.consecutiveFailures) {
            console.warn(`[AutoRollback] Threshold reached. Triggering rollback for ${this.serviceName}.`);
            // Update Prometheus metrics
            metrics_js_1.rollbackEventsTotal.inc({ service: this.serviceName, reason: 'health_check_failed' });
            await this.rollbackEngine.performRollback({
                serviceName: this.serviceName,
                reason: `Automatic Rollback: Health check failed for ${this.failureCounter} consecutive checks.`,
                migrationSteps: 0, // Default, maybe configurable
            });
            this.failureCounter = 0; // Reset after trigger
            return true;
        }
        return false;
    }
}
exports.AutoRollbackMonitor = AutoRollbackMonitor;

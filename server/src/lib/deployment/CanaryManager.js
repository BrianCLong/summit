"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canaryManager = exports.CanaryManager = void 0;
class CanaryManager {
    config;
    status;
    constructor() {
        // Default policy: 10% slice
        this.config = {
            percentage: 10,
            monitoringDurationMinutes: 30,
            metrics: {
                errorRateThreshold: 0.01,
                latencyP95Threshold: 300,
            },
        };
        this.status = {
            active: false,
            currentPercentage: 0,
            health: 'healthy',
            metrics: {
                errorRate: 0,
                latencyP95: 0,
            },
        };
    }
    startCanary() {
        this.status.active = true;
        this.status.startTime = new Date();
        this.status.currentPercentage = this.config.percentage;
        console.log(`[Canary] Started at ${this.status.currentPercentage}% traffic.`);
    }
    updateMetrics(errorRate, latencyP95) {
        this.status.metrics = { errorRate, latencyP95 };
        this.evaluateHealth();
    }
    evaluateHealth() {
        if (this.status.metrics.errorRate > this.config.metrics.errorRateThreshold ||
            this.status.metrics.latencyP95 > this.config.metrics.latencyP95Threshold) {
            this.status.health = 'unhealthy';
            this.triggerRollback();
        }
        else {
            this.status.health = 'healthy';
        }
    }
    triggerRollback() {
        if (this.status.active) {
            console.warn('[Canary] Health check failed. Triggering auto-rollback.');
            this.status.active = false;
            this.status.currentPercentage = 0;
            // In a real system, this would call the deployment orchestrator (Maestro)
        }
    }
    promoteToProd() {
        if (this.status.health === 'healthy') {
            console.log('[Canary] Promoting to 100% traffic.');
            this.status.currentPercentage = 100;
            this.status.active = false; // No longer a canary, it's prod
        }
        else {
            throw new Error('Cannot promote unhealthy canary');
        }
    }
}
exports.CanaryManager = CanaryManager;
exports.canaryManager = new CanaryManager();

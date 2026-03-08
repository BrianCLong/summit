"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automatedCanaryService = exports.AutomatedCanaryService = void 0;
const logger_js_1 = require("../../config/logger.js");
/**
 * Service for sophisticated Canary Analysis.
 * Simulates ML-driven anomaly detection by comparing canary metrics
 * against historical baselines and current production metrics.
 */
class AutomatedCanaryService {
    static instance;
    // Historical baseline (simulated)
    baseline = {
        errorRate: 0.005, // 0.5%
        latencyP95: 150, // 150ms
    };
    constructor() { }
    static getInstance() {
        if (!AutomatedCanaryService.instance) {
            AutomatedCanaryService.instance = new AutomatedCanaryService();
        }
        return AutomatedCanaryService.instance;
    }
    /**
     * Evaluates canary health using "ML-driven" logic.
     * Compares current metrics against baseline and production.
     */
    async analyze(canaryMetrics, productionMetrics) {
        logger_js_1.logger.info({ canaryMetrics, productionMetrics }, 'ACA: Starting automated analysis');
        const metrics = {
            errorRateAnomalous: this.isAnomalous(canaryMetrics.errorRate, productionMetrics.errorRate, 0.01),
            latencyAnomalous: this.isAnomalous(canaryMetrics.latencyP95, productionMetrics.latencyP95, 50),
            throughputDrop: canaryMetrics.throughput < (productionMetrics.throughput * 0.8) && canaryMetrics.activeConnections > 0
        };
        let score = 100;
        const reasons = [];
        if (metrics.errorRateAnomalous) {
            score -= 40;
            reasons.push('Error rate significantly higher than production');
        }
        if (metrics.latencyAnomalous) {
            score -= 30;
            reasons.push('P95 latency degradation detected');
        }
        if (metrics.throughputDrop) {
            score -= 20;
            reasons.push('Throughput drop relative to connection count');
        }
        let decision = 'CONTINUE';
        if (score < 60) {
            decision = 'ROLLBACK';
        }
        else if (score >= 90) {
            decision = 'PROMOTE';
        }
        const result = {
            score,
            decision,
            reason: reasons.length > 0 ? reasons.join('; ') : 'All metrics within acceptable bounds',
            metrics
        };
        logger_js_1.logger.info(result, 'ACA: Analysis complete');
        return result;
    }
    /**
     * Simulated anomaly detection logic (Z-score like)
     */
    isAnomalous(value, baseline, threshold) {
        // If value is more than 'threshold' units above baseline, mark as anomalous
        return value > (baseline + threshold);
    }
}
exports.AutomatedCanaryService = AutomatedCanaryService;
exports.automatedCanaryService = AutomatedCanaryService.getInstance();

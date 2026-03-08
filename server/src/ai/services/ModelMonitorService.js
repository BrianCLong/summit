"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelMonitorService = exports.ModelMonitorService = void 0;
const logger_js_1 = require("../../config/logger.js");
const ModelLifecycleService_js_1 = require("./ModelLifecycleService.js");
/**
 * Service for Automated Bias & Drift Detection (Task #102).
 */
class ModelMonitorService {
    static instance;
    DRIFT_THRESHOLD = 0.1; // 10% drop in performance
    BIAS_THRESHOLD = 0.2; // Max bias score allowed
    constructor() { }
    static getInstance() {
        if (!ModelMonitorService.instance) {
            ModelMonitorService.instance = new ModelMonitorService();
        }
        return ModelMonitorService.instance;
    }
    /**
     * Evaluates a model's current performance against its baseline to detect drift.
     */
    async checkDrift(modelId, currentMetrics) {
        // 1. Fetch model metadata
        // For demo, we simulate fetching from DB. In reality, use modelLifecycleService.
        const baselineAccuracy = 0.95;
        const accuracyDrop = baselineAccuracy - currentMetrics.accuracy;
        if (accuracyDrop > this.DRIFT_THRESHOLD) {
            const reason = `Drift detected: Accuracy dropped by ${(accuracyDrop * 100).toFixed(2)}% (Threshold: ${this.DRIFT_THRESHOLD * 100}%)`;
            await ModelLifecycleService_js_1.modelLifecycleService.triggerRetraining(modelId, reason);
            return;
        }
        if (currentMetrics.biasScore > this.BIAS_THRESHOLD) {
            const reason = `Bias detected: Bias score ${currentMetrics.biasScore} exceeds threshold ${this.BIAS_THRESHOLD}`;
            await ModelLifecycleService_js_1.modelLifecycleService.triggerRetraining(modelId, reason);
            return;
        }
        logger_js_1.logger.info({ modelId }, 'Model health check passed: No significant drift or bias detected.');
    }
}
exports.ModelMonitorService = ModelMonitorService;
exports.modelMonitorService = ModelMonitorService.getInstance();

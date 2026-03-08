"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelGraphMetrics = void 0;
/**
 * Metrics Collection for IntelGraph Maestro
 * Wraps monitoring/metrics.js to provide backward compatibility and a clean interface.
 */
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const metrics_js_1 = require("../monitoring/metrics.js");
/**
 * IntelGraph Metrics Manager
 */
class IntelGraphMetrics {
    static instance;
    constructor() {
        // Metrics initialization handled in monitoring/metrics.ts
        logger_js_1.default.info('IntelGraphMetrics initialized (backed by prom-client).');
    }
    static getInstance() {
        if (!IntelGraphMetrics.instance) {
            IntelGraphMetrics.instance = new IntelGraphMetrics();
        }
        return IntelGraphMetrics.instance;
    }
    // Public API Methods
    recordOrchestrationRequest(method, endpoint, status) {
        metrics_js_1.maestroOrchestrationRequests.inc({ method, endpoint, status });
    }
    recordOrchestrationDuration(duration, endpoint) {
        metrics_js_1.maestroOrchestrationDuration.observe({ endpoint }, duration);
    }
    recordOrchestrationError(error, endpoint) {
        metrics_js_1.maestroOrchestrationErrors.inc({ error_type: error, endpoint });
    }
    recordAIModelRequest(model, operation, status, cost = 0) {
        metrics_js_1.maestroAiModelRequests.inc({ model, operation, status });
        if (cost > 0) {
            metrics_js_1.maestroAiModelCosts.observe({ model, operation }, cost);
        }
    }
    recordAIModelDuration(duration, model, operation) {
        metrics_js_1.maestroAiModelDuration.observe({ model, operation }, duration);
    }
    updateThompsonSamplingReward(model, rewardRate) {
        metrics_js_1.maestroThompsonSamplingRewards.set({ model }, rewardRate);
    }
    recordGraphOperation(operation, status, duration) {
        metrics_js_1.maestroGraphOperations.inc({ operation, status });
        metrics_js_1.maestroGraphQueryDuration.observe({ operation }, duration);
    }
    updateGraphEntityCount(count, entityType) {
        metrics_js_1.maestroGraphEntities.set({ entity_type: entityType || 'all' }, count);
    }
    recordPremiumRoutingDecision(decision, modelTier, cost) {
        metrics_js_1.maestroPremiumRoutingDecisions.inc({ decision, model_tier: modelTier });
        if (decision === 'downgrade') {
            metrics_js_1.maestroPremiumCostSavings.inc({ model_tier: modelTier }, cost);
        }
    }
    updatePremiumBudgetUtilization(percentage) {
        metrics_js_1.maestroPremiumBudgetUtilization.set(percentage);
    }
    recordSecurityEvent(eventType, severity, userId) {
        metrics_js_1.maestroSecurityEvents.inc({
            event_type: eventType,
            severity,
            user_id: userId || 'anonymous',
        });
    }
    recordComplianceDecision(decision, policy, reason) {
        metrics_js_1.maestroComplianceGateDecisions.inc({
            decision,
            policy,
            reason: reason || 'none',
        });
    }
    recordAuthenticationAttempt(method, status, userId) {
        metrics_js_1.maestroAuthenticationAttempts.inc({
            auth_method: method,
            status,
            user_id: userId || 'anonymous',
        });
    }
    recordInvestigationCreated(type, userId) {
        metrics_js_1.maestroInvestigationsCreated.inc({
            investigation_type: type,
            user_id: userId,
        });
    }
    updateActiveDataSources(count, sourceType) {
        metrics_js_1.maestroDataSourcesActive.set({ source_type: sourceType || 'all' }, count);
    }
    recordWebScrapingRequest(status, domain) {
        metrics_js_1.maestroWebScrapingRequests.inc({
            status,
            domain: domain || 'unknown',
        });
    }
    updateActiveConnections(delta, connectionType = 'http') {
        if (delta > 0) {
            metrics_js_1.maestroActiveConnections.inc({ type: connectionType }, delta);
        }
        else {
            metrics_js_1.maestroActiveConnections.dec({ type: connectionType }, Math.abs(delta));
        }
    }
    updateActiveSessions(delta, sessionType = 'user') {
        if (delta > 0) {
            metrics_js_1.maestroActiveSessions.inc({ type: sessionType }, delta);
        }
        else {
            metrics_js_1.maestroActiveSessions.dec({ type: sessionType }, Math.abs(delta));
        }
    }
    async shutdown() {
        /* no-op */
    }
}
exports.IntelGraphMetrics = IntelGraphMetrics;
const metricsInstance = IntelGraphMetrics.getInstance();
process.on('SIGTERM', async () => {
    await metricsInstance.shutdown();
});
exports.default = metricsInstance;

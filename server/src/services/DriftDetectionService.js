"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.driftDetectionService = exports.DriftDetectionService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const crypto_1 = __importDefault(require("crypto"));
const logger_js_1 = require("../config/logger.js");
const alerting_service_js_1 = require("../lib/telemetry/alerting-service.js");
class DriftDetectionService {
    static instance;
    knownFileHashes = new Map();
    baselineAgentMetrics = new Map();
    monitoringInterval = null;
    constructor() {
        this.baselineAgentMetrics.set('planner', { successRate: 0.95, errorRate: 0.05 });
    }
    static getInstance() {
        if (!DriftDetectionService.instance) {
            DriftDetectionService.instance = new DriftDetectionService();
        }
        return DriftDetectionService.instance;
    }
    startMonitoring(intervalMs = 3600000) {
        if (this.monitoringInterval)
            return;
        logger_js_1.logger.info('Starting Drift Detection Monitoring');
        // Initial check
        this.runChecks();
        this.monitoringInterval = setInterval(() => {
            this.runChecks();
        }, intervalMs);
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    async runChecks() {
        // Critical paths to monitor
        const criticalPaths = [
            'server/src/maestro/governance-service.js',
            'server/src/services/AuthService.js' // Assuming existence or common path
        ];
        // Filter paths that actually exist to avoid noise in this MVP
        const existingPaths = [];
        for (const p of criticalPaths) {
            try {
                await promises_1.default.access(p);
                existingPaths.push(p);
            }
            catch {
                // Ignore missing files for now
            }
        }
        await this.checkCodeDrift(existingPaths);
        await this.checkPolicyDrift();
    }
    async checkCodeDrift(criticalPaths) {
        let drifted = false;
        for (const filePath of criticalPaths) {
            try {
                const content = await promises_1.default.readFile(filePath);
                const hash = crypto_1.default.createHash('sha256').update(content).digest('hex');
                if (this.knownFileHashes.has(filePath)) {
                    const knownHash = this.knownFileHashes.get(filePath);
                    if (knownHash !== hash) {
                        logger_js_1.logger.error({ filePath, knownHash, currentHash: hash }, 'CODE DRIFT DETECTED');
                        alerting_service_js_1.alertingService.sendAlert(`Code drift detected in ${filePath}`);
                        drifted = true;
                    }
                }
                else {
                    this.knownFileHashes.set(filePath, hash);
                }
            }
            catch (err) {
                logger_js_1.logger.warn({ filePath, error: err }, 'Failed to check code drift for file');
            }
        }
        return drifted;
    }
    async checkPolicyDrift() {
        // Placeholder for policy drift logic
    }
    checkBehavioralDrift(agentId, currentMetrics) {
        const baseline = this.baselineAgentMetrics.get(agentId);
        if (!baseline)
            return;
        if (currentMetrics.successRate < baseline.successRate * 0.9) {
            logger_js_1.logger.warn({ agentId, current: currentMetrics.successRate, baseline: baseline.successRate }, 'BEHAVIORAL DRIFT: Success Rate Drop');
            alerting_service_js_1.alertingService.sendAlert(`Agent ${agentId} success rate dropped below baseline`);
        }
        if (currentMetrics.errorRate > baseline.errorRate * 1.5) {
            logger_js_1.logger.warn({ agentId, current: currentMetrics.errorRate, baseline: baseline.errorRate }, 'BEHAVIORAL DRIFT: Error Rate Spike');
            alerting_service_js_1.alertingService.sendAlert(`Agent ${agentId} error rate spiked above baseline`);
        }
    }
}
exports.DriftDetectionService = DriftDetectionService;
exports.driftDetectionService = DriftDetectionService.getInstance();

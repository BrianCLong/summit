"use strict";
/**
 * Integrity Shield - Core Engine
 * Detects when predictions become unreliable and triggers self-healing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrityShield = void 0;
exports.createIntegrityShield = createIntegrityShield;
const DriftDetector_js_1 = require("./algorithms/DriftDetector.js");
const BiasAnalyzer_js_1 = require("./algorithms/BiasAnalyzer.js");
const AdversarialDetector_js_1 = require("./algorithms/AdversarialDetector.js");
const SelfHealer_js_1 = require("./algorithms/SelfHealer.js");
const IntegrityReport_js_1 = require("./models/IntegrityReport.js");
class IntegrityShield {
    driftDetector;
    biasAnalyzer;
    adversarialDetector;
    selfHealer;
    config;
    predictionHistory = [];
    reports = [];
    status;
    constructor(config) {
        this.config = {
            driftThreshold: 0.15,
            biasThreshold: 0.1,
            adversarialSensitivity: 0.8,
            autoHealEnabled: true,
            checkIntervalMs: 60000,
            ...config,
        };
        this.driftDetector = new DriftDetector_js_1.DriftDetector(this.config.driftThreshold);
        this.biasAnalyzer = new BiasAnalyzer_js_1.BiasAnalyzer(this.config.biasThreshold);
        this.adversarialDetector = new AdversarialDetector_js_1.AdversarialDetector(this.config.adversarialSensitivity);
        this.selfHealer = new SelfHealer_js_1.SelfHealer();
        this.status = {
            healthy: true,
            driftDetected: false,
            biasDetected: false,
            adversarialDetected: false,
            lastCheck: new Date(),
            activeAlerts: 0,
        };
    }
    async checkPrediction(prediction) {
        this.predictionHistory.push(prediction);
        // Run all detectors in parallel
        const [driftResult, biasResult, adversarialResult] = await Promise.all([
            this.driftDetector.detect(prediction, this.predictionHistory),
            this.biasAnalyzer.analyze(prediction, this.predictionHistory),
            this.adversarialDetector.detect(prediction),
        ]);
        // Calculate overall reliability
        const reliabilityScore = this.calculateReliability(driftResult, biasResult, adversarialResult);
        // Create report
        const report = IntegrityReport_js_1.IntegrityReportFactory.create({
            predictionId: prediction.id,
            modelId: prediction.modelId,
            reliabilityScore,
            driftMetrics: driftResult.metrics,
            biasIndicators: biasResult.indicators,
            adversarialSignals: adversarialResult.signals,
            timestamp: new Date(),
        });
        this.reports.push(report);
        this.updateStatus(report);
        // Trigger self-healing if needed
        if (this.config.autoHealEnabled && reliabilityScore < 0.5) {
            await this.triggerSelfHeal(report);
        }
        return report;
    }
    calculateReliability(drift, bias, adversarial) {
        const driftPenalty = drift.detected ? drift.severity * 0.4 : 0;
        const biasPenalty = bias.detected ? bias.severity * 0.3 : 0;
        const adversarialPenalty = adversarial.detected ? adversarial.confidence * 0.3 : 0;
        return Math.max(0, 1 - driftPenalty - biasPenalty - adversarialPenalty);
    }
    updateStatus(report) {
        this.status = {
            healthy: report.reliabilityScore >= 0.7,
            driftDetected: report.driftMetrics.some((m) => m.severity > this.config.driftThreshold),
            biasDetected: report.biasIndicators.length > 0,
            adversarialDetected: report.adversarialSignals.length > 0,
            lastCheck: new Date(),
            activeAlerts: this.countActiveAlerts(),
        };
    }
    countActiveAlerts() {
        const recentReports = this.reports.filter((r) => Date.now() - r.timestamp.getTime() < 3600000);
        return recentReports.filter((r) => r.reliabilityScore < 0.7).length;
    }
    async triggerSelfHeal(report) {
        const actions = await this.selfHealer.heal(report);
        return actions;
    }
    getStatus() {
        return { ...this.status };
    }
    getRecentReports(count = 10) {
        return this.reports.slice(-count);
    }
    getReliabilityTrend(windowSize = 100) {
        return this.reports
            .slice(-windowSize)
            .map((r) => r.reliabilityScore);
    }
    async runFullCheck() {
        // Comprehensive check across all recent predictions
        const recentPredictions = this.predictionHistory.slice(-100);
        const aggregatedDrift = await this.driftDetector.detectAggregate(recentPredictions);
        const aggregatedBias = await this.biasAnalyzer.analyzeAggregate(recentPredictions);
        const report = IntegrityReport_js_1.IntegrityReportFactory.create({
            predictionId: 'aggregate',
            modelId: 'all',
            reliabilityScore: this.calculateReliability(aggregatedDrift, aggregatedBias, { detected: false, confidence: 0, signals: [] }),
            driftMetrics: aggregatedDrift.metrics,
            biasIndicators: aggregatedBias.indicators,
            adversarialSignals: [],
            timestamp: new Date(),
        });
        this.reports.push(report);
        return report;
    }
    clearHistory() {
        this.predictionHistory = [];
        this.reports = [];
    }
}
exports.IntegrityShield = IntegrityShield;
function createIntegrityShield(config) {
    return new IntegrityShield(config);
}

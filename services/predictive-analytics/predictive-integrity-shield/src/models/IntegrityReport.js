"use strict";
/**
 * Integrity Report Model
 * Comprehensive report of model integrity status
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrityReportBuilder = exports.DetectorType = exports.ActionStatus = exports.HealingActionType = exports.BiasSeverity = exports.DriftSeverity = exports.IntegrityStatus = void 0;
var IntegrityStatus;
(function (IntegrityStatus) {
    IntegrityStatus["HEALTHY"] = "HEALTHY";
    IntegrityStatus["DEGRADED"] = "DEGRADED";
    IntegrityStatus["WARNING"] = "WARNING";
    IntegrityStatus["CRITICAL"] = "CRITICAL";
    IntegrityStatus["FAILED"] = "FAILED";
})(IntegrityStatus || (exports.IntegrityStatus = IntegrityStatus = {}));
var DriftSeverity;
(function (DriftSeverity) {
    DriftSeverity["NONE"] = "NONE";
    DriftSeverity["LOW"] = "LOW";
    DriftSeverity["MODERATE"] = "MODERATE";
    DriftSeverity["HIGH"] = "HIGH";
    DriftSeverity["CRITICAL"] = "CRITICAL";
})(DriftSeverity || (exports.DriftSeverity = DriftSeverity = {}));
var BiasSeverity;
(function (BiasSeverity) {
    BiasSeverity["NONE"] = "NONE";
    BiasSeverity["LOW"] = "LOW";
    BiasSeverity["MODERATE"] = "MODERATE";
    BiasSeverity["HIGH"] = "HIGH";
    BiasSeverity["SEVERE"] = "SEVERE";
})(BiasSeverity || (exports.BiasSeverity = BiasSeverity = {}));
var HealingActionType;
(function (HealingActionType) {
    HealingActionType["RECALIBRATE"] = "RECALIBRATE";
    HealingActionType["FALLBACK_TO_ENSEMBLE"] = "FALLBACK_TO_ENSEMBLE";
    HealingActionType["TRIGGER_RETRAINING"] = "TRIGGER_RETRAINING";
    HealingActionType["ADJUST_THRESHOLDS"] = "ADJUST_THRESHOLDS";
    HealingActionType["BLOCK_PREDICTIONS"] = "BLOCK_PREDICTIONS";
    HealingActionType["ALERT_TEAM"] = "ALERT_TEAM";
    HealingActionType["AUTO_SCALE"] = "AUTO_SCALE";
    HealingActionType["RESET_BASELINE"] = "RESET_BASELINE";
})(HealingActionType || (exports.HealingActionType = HealingActionType = {}));
var ActionStatus;
(function (ActionStatus) {
    ActionStatus["PENDING"] = "PENDING";
    ActionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ActionStatus["COMPLETED"] = "COMPLETED";
    ActionStatus["FAILED"] = "FAILED";
    ActionStatus["SKIPPED"] = "SKIPPED";
})(ActionStatus || (exports.ActionStatus = ActionStatus = {}));
var DetectorType;
(function (DetectorType) {
    DetectorType["DRIFT"] = "DRIFT";
    DetectorType["ADVERSARIAL"] = "ADVERSARIAL";
    DetectorType["BIAS"] = "BIAS";
    DetectorType["UNCERTAINTY"] = "UNCERTAINTY";
    DetectorType["PERFORMANCE"] = "PERFORMANCE";
})(DetectorType || (exports.DetectorType = DetectorType = {}));
class IntegrityReportBuilder {
    report = {};
    constructor(modelId) {
        this.report = {
            id: this.generateId(),
            timestamp: new Date(),
            modelId,
            healingActions: [],
            recommendations: [],
            alerts: [],
            checksPerformed: [],
            processingTime: 0,
            dataQuality: 1.0,
        };
    }
    withDriftMetrics(driftMetrics) {
        this.report.driftMetrics = driftMetrics;
        this.report.checksPerformed?.push('drift');
        return this;
    }
    withAdversarialSignals(adversarialSignals) {
        this.report.adversarialSignals = adversarialSignals;
        this.report.checksPerformed?.push('adversarial');
        return this;
    }
    withBiasIndicators(biasIndicators) {
        this.report.biasIndicators = biasIndicators;
        this.report.checksPerformed?.push('bias');
        return this;
    }
    withPerformanceMetrics(performanceMetrics) {
        this.report.performanceMetrics = performanceMetrics;
        this.report.checksPerformed?.push('performance');
        return this;
    }
    addHealingAction(action) {
        this.report.healingActions?.push(action);
        return this;
    }
    addRecommendation(recommendation) {
        this.report.recommendations?.push(recommendation);
        return this;
    }
    addAlert(alert) {
        this.report.alerts?.push(alert);
        return this;
    }
    withReliabilityScore(score) {
        this.report.reliabilityScore = score;
        return this;
    }
    withStatus(status) {
        this.report.status = status;
        return this;
    }
    withProcessingTime(time) {
        this.report.processingTime = time;
        return this;
    }
    build() {
        // Calculate reliability score if not set
        if (this.report.reliabilityScore === undefined) {
            this.report.reliabilityScore = this.calculateReliabilityScore();
        }
        // Determine status if not set
        if (!this.report.status) {
            this.report.status = this.determineStatus();
        }
        return this.report;
    }
    calculateReliabilityScore() {
        const weights = {
            drift: 0.3,
            adversarial: 0.3,
            bias: 0.2,
            performance: 0.2,
        };
        let score = 1.0;
        if (this.report.driftMetrics) {
            const driftScore = 1 - Math.min(this.report.driftMetrics.psi / 0.5, 1);
            score -= weights.drift * (1 - driftScore);
        }
        if (this.report.adversarialSignals) {
            score -= weights.adversarial * (1 - this.report.adversarialSignals.adversarialScore);
        }
        if (this.report.biasIndicators) {
            const biasScore = Math.min(this.report.biasIndicators.demographicParity, this.report.biasIndicators.equalOpportunity);
            score -= weights.bias * (1 - biasScore);
        }
        if (this.report.performanceMetrics) {
            const perfScore = 1 - Math.abs(this.report.performanceMetrics.performanceDrift);
            score -= weights.performance * (1 - perfScore);
        }
        return Math.max(0, Math.min(1, score));
    }
    determineStatus() {
        const score = this.report.reliabilityScore || 0;
        if (score >= 0.9)
            return IntegrityStatus.HEALTHY;
        if (score >= 0.7)
            return IntegrityStatus.DEGRADED;
        if (score >= 0.5)
            return IntegrityStatus.WARNING;
        if (score >= 0.3)
            return IntegrityStatus.CRITICAL;
        return IntegrityStatus.FAILED;
    }
    generateId() {
        return `integrity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.IntegrityReportBuilder = IntegrityReportBuilder;

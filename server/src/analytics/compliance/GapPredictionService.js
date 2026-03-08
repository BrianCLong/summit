"use strict";
/**
 * Gap Prediction Service
 *
 * Predicts emerging compliance gaps before they become critical issues.
 * Uses pattern analysis and trend detection to identify risks proactively.
 *
 * SOC 2 Controls: CC3.1 (Risk Assessment), CC3.2 (Risk Identification)
 *
 * @module analytics/compliance/GapPredictionService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GapPredictionService = void 0;
exports.getGapPredictionService = getGapPredictionService;
const uuid_1 = require("uuid");
const events_1 = require("events");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'gap-prediction-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'GapPredictionService',
    };
}
function calculateSeverity(confidenceScore, impactScore) {
    const combined = (confidenceScore * 0.4) + (impactScore * 0.6);
    if (combined >= 0.8)
        return 'critical';
    if (combined >= 0.6)
        return 'high';
    if (combined >= 0.4)
        return 'medium';
    return 'low';
}
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    minConfidence: 0.5,
    predictionHorizonDays: 30,
    evidenceQualityThreshold: 60,
    reviewAgeWarningDays: 60,
    predictionExpirationDays: 14,
};
// ============================================================================
// Trend Analyzer
// ============================================================================
class TrendAnalyzer {
    /**
     * Analyze trend in metric history
     */
    analyzeTrend(values) {
        if (values.length < 3) {
            return { trend: 'stable', slope: 0 };
        }
        // Simple linear regression
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (values[i] - yMean);
            denominator += Math.pow(i - xMean, 2);
        }
        const slope = denominator !== 0 ? numerator / denominator : 0;
        // Normalize slope relative to mean
        const normalizedSlope = yMean !== 0 ? slope / yMean : slope;
        let trend;
        if (normalizedSlope < -0.02) {
            trend = 'worsening';
        }
        else if (normalizedSlope > 0.02) {
            trend = 'improving';
        }
        else {
            trend = 'stable';
        }
        return { trend, slope: normalizedSlope };
    }
    /**
     * Detect anomalies in time series
     */
    detectAnomalies(values) {
        if (values.length < 5)
            return [];
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const anomalyIndices = [];
        for (let i = 0; i < values.length; i++) {
            const zScore = stdDev !== 0 ? Math.abs((values[i] - mean) / stdDev) : 0;
            if (zScore > 2) {
                anomalyIndices.push(i);
            }
        }
        return anomalyIndices;
    }
    /**
     * Predict future value based on trend
     */
    predictFutureValue(values, daysAhead) {
        if (values.length === 0)
            return 0;
        if (values.length === 1)
            return values[0];
        const { slope } = this.analyzeTrend(values);
        const lastValue = values[values.length - 1];
        // Project based on slope (assuming one data point per day)
        return lastValue + (slope * lastValue * daysAhead);
    }
}
// ============================================================================
// Pattern Matcher
// ============================================================================
class PatternMatcher {
    knownPatterns = new Map();
    constructor() {
        // Initialize with common gap patterns
        this.knownPatterns.set('evidence_decay', {
            patternType: 'Evidence Quality Degradation',
            occurrences: 0,
            averageDaysToGap: 45,
            typicalCauses: [
                'Staff turnover',
                'Process changes without documentation update',
                'Automated collection failure',
            ],
        });
        this.knownPatterns.set('review_lapse', {
            patternType: 'Review Schedule Lapse',
            occurrences: 0,
            averageDaysToGap: 30,
            typicalCauses: [
                'Resource constraints',
                'Priority changes',
                'Calendar conflicts',
            ],
        });
        this.knownPatterns.set('control_drift', {
            patternType: 'Control Implementation Drift',
            occurrences: 0,
            averageDaysToGap: 60,
            typicalCauses: [
                'System updates',
                'Configuration changes',
                'New feature deployments',
            ],
            seasonality: 'quarterly',
        });
    }
    /**
     * Match current indicators to known patterns
     */
    matchPattern(indicators) {
        // Check for evidence decay pattern
        const qualityIndicator = indicators.find(i => i.type === 'evidence_quality');
        if (qualityIndicator && qualityIndicator.trend === 'worsening') {
            return this.knownPatterns.get('evidence_decay');
        }
        // Check for review lapse pattern
        const reviewIndicator = indicators.find(i => i.type === 'review_age');
        if (reviewIndicator && reviewIndicator.currentValue > reviewIndicator.thresholdValue) {
            return this.knownPatterns.get('review_lapse');
        }
        // Check for control drift pattern
        const statusIndicator = indicators.find(i => i.type === 'status_change');
        if (statusIndicator && statusIndicator.trend === 'worsening') {
            return this.knownPatterns.get('control_drift');
        }
        return undefined;
    }
    /**
     * Record pattern occurrence for learning
     */
    recordOccurrence(patternType) {
        const pattern = this.knownPatterns.get(patternType);
        if (pattern) {
            pattern.occurrences++;
        }
    }
}
// ============================================================================
// Impact Calculator
// ============================================================================
class ImpactCalculator {
    /**
     * Calculate potential impact of a gap
     */
    calculate(control, allControls, indicators) {
        // Find related controls (same category)
        const relatedControls = allControls
            .filter(c => c.category === control.category && c.controlId !== control.controlId)
            .map(c => c.controlId);
        // Calculate compliance score impact
        const controlWeight = 100 / allControls.length;
        const complianceScoreImpact = controlWeight * (control.status === 'implemented' ? 1 :
            control.status === 'partial' ? 0.5 : 0);
        // Calculate audit risk increase
        const worstIndicator = indicators.reduce((max, ind) => ind.trend === 'worsening' ? (ind.weight > max ? ind.weight : max) : max, 0);
        const auditRiskIncrease = worstIndicator * 30;
        // Determine remediation effort
        let estimatedRemediationEffort;
        if (control.status === 'not_implemented') {
            estimatedRemediationEffort = 'major';
        }
        else if (control.status === 'partial') {
            estimatedRemediationEffort = 'significant';
        }
        else if (control.evidenceQuality < 50) {
            estimatedRemediationEffort = 'moderate';
        }
        else {
            estimatedRemediationEffort = 'minimal';
        }
        // Determine business impact
        let businessImpact;
        const criticalCategories = ['access_control', 'security', 'data_protection'];
        if (criticalCategories.some(cat => control.category.toLowerCase().includes(cat))) {
            businessImpact = auditRiskIncrease > 20 ? 'critical' : 'high';
        }
        else {
            businessImpact = auditRiskIncrease > 15 ? 'medium' : 'low';
        }
        return {
            affectedControls: [control.controlId, ...relatedControls],
            complianceScoreImpact,
            auditRiskIncrease,
            estimatedRemediationEffort,
            businessImpact,
        };
    }
}
// ============================================================================
// Gap Prediction Service
// ============================================================================
class GapPredictionService extends events_1.EventEmitter {
    config;
    trendAnalyzer;
    patternMatcher;
    impactCalculator;
    metricHistory = new Map();
    predictions = new Map();
    stats;
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.trendAnalyzer = new TrendAnalyzer();
        this.patternMatcher = new PatternMatcher();
        this.impactCalculator = new ImpactCalculator();
        this.stats = {
            totalPredictions: 0,
            confirmedPredictions: 0,
            falsePositives: 0,
            byCategory: {
                control_degradation: 0,
                evidence_decay: 0,
                policy_drift: 0,
                coverage_gap: 0,
                procedural_gap: 0,
                technical_gap: 0,
                resource_gap: 0,
            },
            averageConfidence: 0,
            averageDaysAdvanceWarning: 0,
            lastPredictionAt: null,
        };
        logger_js_1.default.info({ config: this.config }, 'GapPredictionService initialized');
    }
    /**
     * Record control metrics for trend analysis
     */
    recordMetrics(tenantId, control) {
        const key = `${tenantId}:${control.controlId}`;
        const history = this.metricHistory.get(key) || {
            controlId: control.controlId,
            tenantId,
            metrics: [],
        };
        history.metrics.push({
            timestamp: new Date(),
            evidenceQuality: control.evidenceQuality,
            evidenceCount: control.evidenceCount,
            status: control.status,
            exceptions: control.exceptions,
            reviewAge: Math.floor((Date.now() - control.lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)),
        });
        // Keep last 90 days of metrics
        const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
        history.metrics = history.metrics.filter(m => m.timestamp.getTime() > cutoff);
        this.metricHistory.set(key, history);
    }
    /**
     * Predict gaps for a control
     */
    async predictGaps(tenantId, framework, control, allControls) {
        const key = `${tenantId}:${control.controlId}`;
        const history = this.metricHistory.get(key);
        if (!history || history.metrics.length < 5) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'GapPredictionService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Insufficient history'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Extract indicators
        const indicators = this.extractIndicators(history, control);
        // Calculate confidence
        const confidenceScore = this.calculateConfidence(indicators);
        if (confidenceScore < this.config.minConfidence) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'GapPredictionService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Low confidence'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Determine gap category
        const category = this.determineCategory(indicators);
        // Match historical pattern
        const historicalPattern = this.patternMatcher.matchPattern(indicators);
        // Calculate impact
        const impact = this.impactCalculator.calculate(control, allControls, indicators);
        // Calculate days until likely
        const daysUntilLikely = this.estimateDaysUntilGap(indicators, historicalPattern);
        // Calculate severity
        const impactScore = (impact.auditRiskIncrease / 100 +
            (impact.businessImpact === 'critical' ? 1 : impact.businessImpact === 'high' ? 0.7 : 0.4)) / 2;
        const predictedSeverity = calculateSeverity(confidenceScore, impactScore);
        // Generate preventive actions
        const preventiveActions = this.generatePreventiveActions(control, category, indicators, daysUntilLikely);
        const prediction = {
            id: `gap-${(0, uuid_1.v4)()}`,
            tenantId,
            framework,
            controlId: control.controlId,
            controlName: control.controlName,
            category,
            status: 'predicted',
            predictedSeverity,
            confidenceScore,
            daysUntilLikely,
            indicators,
            historicalPattern,
            predictedImpact: impact,
            suggestedPreventiveActions: preventiveActions,
            predictedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.config.predictionExpirationDays * 24 * 60 * 60 * 1000).toISOString(),
            governanceVerdict: createVerdict(predictedSeverity === 'critical' ? data_envelope_js_1.GovernanceResult.FLAG :
                predictedSeverity === 'high' ? data_envelope_js_1.GovernanceResult.REVIEW_REQUIRED :
                    data_envelope_js_1.GovernanceResult.ALLOW, `Gap predicted in ${daysUntilLikely} days: ${category}`),
        };
        // Store prediction
        const tenantPredictions = this.predictions.get(tenantId) || [];
        tenantPredictions.push(prediction);
        this.predictions.set(tenantId, tenantPredictions);
        // Update stats
        this.updateStats(prediction);
        // Emit event for high-risk predictions
        if (predictedSeverity === 'critical' || predictedSeverity === 'high') {
            this.emit('gap:predicted', prediction);
        }
        logger_js_1.default.info({
            predictionId: prediction.id,
            tenantId,
            controlId: control.controlId,
            category,
            severity: predictedSeverity,
            daysUntilLikely,
            confidence: confidenceScore,
        }, 'Gap predicted');
        return (0, data_envelope_js_1.createDataEnvelope)(prediction, {
            source: 'GapPredictionService',
            governanceVerdict: prediction.governanceVerdict,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Predict gaps for all controls
     */
    async predictAllGaps(tenantId, framework, controls) {
        const predictions = [];
        for (const control of controls) {
            const result = await this.predictGaps(tenantId, framework, control, controls);
            if (result.data) {
                predictions.push(result.data);
            }
        }
        // Sort by severity and days until likely
        predictions.sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const severityDiff = severityOrder[a.predictedSeverity] - severityOrder[b.predictedSeverity];
            if (severityDiff !== 0)
                return severityDiff;
            return a.daysUntilLikely - b.daysUntilLikely;
        });
        return (0, data_envelope_js_1.createDataEnvelope)(predictions, {
            source: 'GapPredictionService',
            governanceVerdict: createVerdict(predictions.some(p => p.predictedSeverity === 'critical')
                ? data_envelope_js_1.GovernanceResult.FLAG
                : data_envelope_js_1.GovernanceResult.ALLOW, `Predicted ${predictions.length} potential gaps`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get predictions for a tenant
     */
    getPredictions(tenantId, status) {
        let predictions = this.predictions.get(tenantId) || [];
        // Filter out expired predictions
        const now = Date.now();
        predictions = predictions.filter(p => new Date(p.expiresAt).getTime() > now);
        if (status) {
            predictions = predictions.filter(p => p.status === status);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(predictions, {
            source: 'GapPredictionService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Predictions retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Confirm or dismiss a prediction
     */
    updatePredictionStatus(tenantId, predictionId, status) {
        const predictions = this.predictions.get(tenantId) || [];
        const prediction = predictions.find(p => p.id === predictionId);
        if (!prediction) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'GapPredictionService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Prediction not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        prediction.status = status;
        if (status === 'confirmed') {
            this.stats.confirmedPredictions++;
            this.patternMatcher.recordOccurrence(prediction.category);
        }
        logger_js_1.default.info({ predictionId, tenantId, status }, 'Prediction status updated');
        return (0, data_envelope_js_1.createDataEnvelope)(prediction, {
            source: 'GapPredictionService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Status updated'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get prediction statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'GapPredictionService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Clear tenant data
     */
    clearTenant(tenantId) {
        // Clear predictions
        this.predictions.delete(tenantId);
        // Clear metric history
        for (const key of this.metricHistory.keys()) {
            if (key.startsWith(`${tenantId}:`)) {
                this.metricHistory.delete(key);
            }
        }
        logger_js_1.default.info({ tenantId }, 'Tenant data cleared from gap prediction service');
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    extractIndicators(history, control) {
        const indicators = [];
        const metrics = history.metrics;
        // Evidence quality trend
        const qualityValues = metrics.map(m => m.evidenceQuality);
        const qualityTrend = this.trendAnalyzer.analyzeTrend(qualityValues);
        indicators.push({
            type: 'evidence_quality',
            description: 'Evidence quality score over time',
            currentValue: control.evidenceQuality,
            thresholdValue: this.config.evidenceQualityThreshold,
            trend: qualityTrend.trend,
            weight: 0.35,
        });
        // Evidence count trend
        const countValues = metrics.map(m => m.evidenceCount);
        const countTrend = this.trendAnalyzer.analyzeTrend(countValues);
        indicators.push({
            type: 'evidence_count',
            description: 'Number of evidence items',
            currentValue: control.evidenceCount,
            thresholdValue: 3, // Minimum expected
            trend: countTrend.trend,
            weight: 0.2,
        });
        // Review age
        const reviewAge = Math.floor((Date.now() - control.lastReviewDate.getTime()) / (1000 * 60 * 60 * 24));
        indicators.push({
            type: 'review_age',
            description: 'Days since last review',
            currentValue: reviewAge,
            thresholdValue: this.config.reviewAgeWarningDays,
            trend: reviewAge > this.config.reviewAgeWarningDays ? 'worsening' : 'stable',
            weight: 0.25,
        });
        // Exception count
        if (control.exceptions > 0) {
            indicators.push({
                type: 'exceptions',
                description: 'Active exceptions',
                currentValue: control.exceptions,
                thresholdValue: 0,
                trend: 'worsening',
                weight: 0.2,
            });
        }
        return indicators;
    }
    calculateConfidence(indicators) {
        let totalWeight = 0;
        let weightedScore = 0;
        for (const indicator of indicators) {
            let indicatorScore = 0;
            // Score based on trend
            if (indicator.trend === 'worsening') {
                indicatorScore = 0.8;
            }
            else if (indicator.trend === 'stable') {
                indicatorScore = 0.3;
            }
            // Increase score if threshold is breached
            if (indicator.type === 'review_age' || indicator.type === 'exceptions') {
                if (indicator.currentValue > indicator.thresholdValue) {
                    indicatorScore += 0.2;
                }
            }
            else {
                if (indicator.currentValue < indicator.thresholdValue) {
                    indicatorScore += 0.2;
                }
            }
            weightedScore += indicatorScore * indicator.weight;
            totalWeight += indicator.weight;
        }
        return totalWeight > 0 ? weightedScore / totalWeight : 0;
    }
    determineCategory(indicators) {
        const qualityIndicator = indicators.find(i => i.type === 'evidence_quality');
        const reviewIndicator = indicators.find(i => i.type === 'review_age');
        const exceptionsIndicator = indicators.find(i => i.type === 'exceptions');
        if (qualityIndicator && qualityIndicator.trend === 'worsening') {
            return 'evidence_decay';
        }
        if (reviewIndicator && reviewIndicator.currentValue > reviewIndicator.thresholdValue) {
            return 'procedural_gap';
        }
        if (exceptionsIndicator && exceptionsIndicator.currentValue > 0) {
            return 'control_degradation';
        }
        return 'control_degradation';
    }
    estimateDaysUntilGap(indicators, pattern) {
        // If we have a historical pattern, use its average
        if (pattern) {
            return pattern.averageDaysToGap;
        }
        // Otherwise, estimate based on indicator trends
        let worstDays = this.config.predictionHorizonDays;
        for (const indicator of indicators) {
            if (indicator.trend === 'worsening') {
                // Estimate based on current value and threshold
                const ratio = indicator.type === 'review_age' || indicator.type === 'exceptions'
                    ? indicator.thresholdValue / Math.max(1, indicator.currentValue)
                    : indicator.currentValue / Math.max(1, indicator.thresholdValue);
                const estimatedDays = Math.floor(ratio * 30);
                worstDays = Math.min(worstDays, estimatedDays);
            }
        }
        return Math.max(1, worstDays);
    }
    generatePreventiveActions(control, category, indicators, daysUntilLikely) {
        const actions = [];
        let priority = 1;
        // Category-specific actions
        if (category === 'evidence_decay') {
            actions.push({
                priority: priority++,
                action: 'Review and refresh evidence',
                description: `Update evidence for ${control.controlName} to improve quality scores`,
                deadline: new Date(Date.now() + Math.min(7, daysUntilLikely) * 24 * 60 * 60 * 1000).toISOString(),
                estimatedEffort: 'moderate',
                expectedRiskReduction: 40,
                automated: false,
            });
        }
        // Review age action
        const reviewIndicator = indicators.find(i => i.type === 'review_age');
        if (reviewIndicator && reviewIndicator.currentValue > this.config.reviewAgeWarningDays / 2) {
            actions.push({
                priority: priority++,
                action: 'Schedule control review',
                description: `Control hasn't been reviewed in ${reviewIndicator.currentValue} days`,
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                estimatedEffort: 'minimal',
                expectedRiskReduction: 25,
                automated: true,
            });
        }
        // Exceptions action
        if (control.exceptions > 0) {
            actions.push({
                priority: priority++,
                action: 'Review active exceptions',
                description: `${control.exceptions} exception(s) need review or remediation`,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                estimatedEffort: 'moderate',
                expectedRiskReduction: 30,
                automated: false,
            });
        }
        // Evidence quality action
        if (control.evidenceQuality < 70) {
            actions.push({
                priority: priority++,
                action: 'Improve evidence quality',
                description: 'Add more detailed documentation and automated evidence collection',
                deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
                estimatedEffort: 'significant',
                expectedRiskReduction: 35,
                automated: false,
            });
        }
        return actions;
    }
    updateStats(prediction) {
        this.stats.totalPredictions++;
        this.stats.byCategory[prediction.category]++;
        this.stats.lastPredictionAt = prediction.predictedAt;
        // Update averages
        const n = this.stats.totalPredictions;
        this.stats.averageConfidence =
            ((this.stats.averageConfidence * (n - 1)) + prediction.confidenceScore) / n;
        this.stats.averageDaysAdvanceWarning =
            ((this.stats.averageDaysAdvanceWarning * (n - 1)) + prediction.daysUntilLikely) / n;
    }
}
exports.GapPredictionService = GapPredictionService;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getGapPredictionService(config) {
    if (!instance) {
        instance = new GapPredictionService(config);
    }
    return instance;
}
exports.default = GapPredictionService;

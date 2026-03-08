"use strict";
/**
 * Compliance Prediction Engine
 *
 * ML-powered compliance prediction and audit outcome forecasting.
 * Predicts compliance risks, audit readiness, and certification outcomes.
 *
 * SOC 2 Controls: CC3.1 (Risk Assessment), CC4.1 (Monitoring)
 *
 * @module analytics/compliance/CompliancePredictionEngine
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompliancePredictionEngine = void 0;
exports.getCompliancePredictionEngine = getCompliancePredictionEngine;
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
        policyId: 'compliance-prediction-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'CompliancePredictionEngine',
    };
}
function calculateRiskLevel(score) {
    if (score >= 80)
        return 'critical';
    if (score >= 60)
        return 'high';
    if (score >= 40)
        return 'medium';
    return 'low';
}
function calculateConfidence(score) {
    if (score >= 0.8)
        return 'high';
    if (score >= 0.6)
        return 'medium';
    return 'low';
}
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    modelVersion: '1.0.0',
    minConfidence: 0.6,
    historicalWeight: 0.3,
    currentStateWeight: 0.7,
    useBenchmarks: true,
    defaultHorizonDays: 30,
};
// ============================================================================
// Feature Extractor
// ============================================================================
class ComplianceFeatureExtractor {
    /**
     * Extract features from compliance state for prediction
     */
    extractFeatures(state) {
        const features = [];
        // Control state features
        const implemented = state.controlStates.filter(c => c.status === 'implemented').length;
        const partial = state.controlStates.filter(c => c.status === 'partial').length;
        const notImplemented = state.controlStates.filter(c => c.status === 'not_implemented').length;
        const total = state.controlStates.length || 1;
        features.push(implemented / total); // Implementation rate
        features.push(partial / total); // Partial implementation rate
        features.push(notImplemented / total); // Non-implementation rate
        // Evidence quality features
        const avgQuality = state.controlStates.reduce((sum, c) => sum + c.evidenceQuality, 0) / total;
        features.push(avgQuality / 100); // Normalized evidence quality
        features.push(state.evidenceMetrics.automatedEvidencePercentage / 100);
        features.push(state.evidenceMetrics.coveragePercentage / 100);
        features.push(Math.min(1, state.evidenceMetrics.staleEvidenceCount / 10)); // Normalized stale count
        // Gap features
        const criticalGaps = state.currentGaps.filter(g => g.severity === 'critical').length;
        const highGaps = state.currentGaps.filter(g => g.severity === 'high').length;
        features.push(Math.min(1, criticalGaps / 5)); // Normalized critical gaps
        features.push(Math.min(1, highGaps / 10)); // Normalized high gaps
        // Historical audit features
        if (state.historicalAudits.length > 0) {
            const lastAudit = state.historicalAudits[state.historicalAudits.length - 1];
            features.push(lastAudit.outcome === 'pass' ? 1 : lastAudit.outcome === 'pass_with_findings' ? 0.5 : 0);
            features.push(Math.min(1, lastAudit.findingsCount / 20)); // Normalized findings
            features.push(Math.min(1, lastAudit.criticalFindings / 5)); // Normalized critical
        }
        else {
            features.push(0.5, 0.5, 0.5); // No history - neutral values
        }
        // Time-based features
        const daysSinceAssessment = Math.floor((Date.now() - state.lastAssessmentDate.getTime()) / (1000 * 60 * 60 * 24));
        features.push(Math.min(1, daysSinceAssessment / 90)); // Normalized days since assessment
        return features;
    }
    /**
     * Extract control-level features
     */
    extractControlFeatures(control) {
        return [
            control.status === 'implemented' ? 1 : control.status === 'partial' ? 0.5 : 0,
            control.evidenceQuality / 100,
            Math.min(1, control.evidenceCount / 10),
            control.exceptions > 0 ? 0.5 : 1,
            control.remediationInProgress ? 0.7 : 1,
            Math.min(1, (Date.now() - control.lastReviewDate.getTime()) / (90 * 24 * 60 * 60 * 1000)),
        ];
    }
}
// ============================================================================
// Prediction Model (Simplified ML)
// ============================================================================
class CompliancePredictionModel {
    weights;
    bias;
    version;
    constructor(version) {
        this.version = version;
        // Pre-trained weights (in production, load from model file)
        this.weights = [
            0.3, // Implementation rate
            0.15, // Partial rate
            -0.4, // Non-implementation rate
            0.25, // Evidence quality
            0.15, // Automated evidence
            0.2, // Coverage
            -0.15, // Stale evidence
            -0.35, // Critical gaps
            -0.25, // High gaps
            0.2, // Last audit outcome
            -0.15, // Findings count
            -0.25, // Critical findings
            -0.1, // Days since assessment
        ];
        this.bias = 0.65; // Base pass probability
    }
    /**
     * Predict audit outcome
     */
    predict(features) {
        // Simple linear model (in production, use neural network or XGBoost)
        let score = this.bias;
        for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
            score += features[i] * this.weights[i];
        }
        // Sigmoid activation
        const passLikelihood = 1 / (1 + Math.exp(-score * 3));
        // Calculate confidence based on feature quality
        const featureVariance = features.reduce((sum, f) => sum + Math.pow(f - 0.5, 2), 0) / features.length;
        const confidence = Math.min(0.95, 0.5 + featureVariance);
        return { passLikelihood, confidence };
    }
    /**
     * Predict control risk
     */
    predictControlRisk(features) {
        // Invert features for risk (lower values = higher risk)
        let riskScore = 0;
        riskScore += (1 - features[0]) * 40; // Status
        riskScore += (1 - features[1]) * 30; // Evidence quality
        riskScore += (1 - features[2]) * 15; // Evidence count
        riskScore += (1 - features[3]) * 10; // Exceptions
        riskScore += features[5] * 5; // Days since review
        return Math.min(100, Math.max(0, riskScore));
    }
    getVersion() {
        return this.version;
    }
}
// ============================================================================
// Risk Analyzer
// ============================================================================
class ComplianceRiskAnalyzer {
    /**
     * Analyze risk factors from compliance state
     */
    analyzeRisks(state) {
        const risks = [];
        // Control coverage risks
        const notImplemented = state.controlStates.filter(c => c.status === 'not_implemented');
        if (notImplemented.length > 0) {
            risks.push({
                category: 'Control Coverage',
                description: `${notImplemented.length} control(s) not implemented`,
                impact: notImplemented.length > 5 ? 'critical' : 'high',
                likelihood: 0.9,
                mitigationAvailable: true,
            });
        }
        // Evidence quality risks
        const lowQualityEvidence = state.controlStates.filter(c => c.evidenceQuality < 50);
        if (lowQualityEvidence.length > 0) {
            risks.push({
                category: 'Evidence Quality',
                description: `${lowQualityEvidence.length} control(s) have low evidence quality`,
                impact: 'high',
                likelihood: 0.7,
                mitigationAvailable: true,
            });
        }
        // Stale evidence risks
        if (state.evidenceMetrics.staleEvidenceCount > 5) {
            risks.push({
                category: 'Evidence Freshness',
                description: `${state.evidenceMetrics.staleEvidenceCount} pieces of stale evidence`,
                impact: 'medium',
                likelihood: 0.8,
                mitigationAvailable: true,
            });
        }
        // Gap-related risks
        const criticalGaps = state.currentGaps.filter(g => g.severity === 'critical');
        if (criticalGaps.length > 0) {
            risks.push({
                category: 'Open Gaps',
                description: `${criticalGaps.length} critical gap(s) remain unresolved`,
                impact: 'critical',
                likelihood: 0.95,
                mitigationAvailable: criticalGaps.some(g => g.remediationStatus === 'in_progress'),
            });
        }
        // Historical audit risks
        if (state.historicalAudits.length > 0) {
            const lastAudit = state.historicalAudits[state.historicalAudits.length - 1];
            if (lastAudit.outcome === 'fail') {
                risks.push({
                    category: 'Audit History',
                    description: 'Previous audit resulted in failure',
                    impact: 'high',
                    likelihood: 0.6,
                    mitigationAvailable: true,
                });
            }
        }
        // Automation coverage risks
        if (state.evidenceMetrics.automatedEvidencePercentage < 30) {
            risks.push({
                category: 'Automation',
                description: 'Low automation coverage increases manual effort and error risk',
                impact: 'medium',
                likelihood: 0.5,
                mitigationAvailable: true,
            });
        }
        return risks;
    }
    /**
     * Analyze control-level risks
     */
    analyzeControlRisks(state, model, featureExtractor) {
        const controlRisks = [];
        for (const control of state.controlStates) {
            const features = featureExtractor.extractControlFeatures(control);
            const riskScore = model.predictControlRisk(features);
            if (riskScore >= 30) { // Only report significant risks
                const concerns = [];
                const remediations = [];
                if (control.status !== 'implemented') {
                    concerns.push(`Control status: ${control.status}`);
                    remediations.push('Complete control implementation');
                }
                if (control.evidenceQuality < 70) {
                    concerns.push(`Low evidence quality (${control.evidenceQuality}%)`);
                    remediations.push('Improve evidence documentation');
                }
                if (control.exceptions > 0) {
                    concerns.push(`${control.exceptions} active exception(s)`);
                    remediations.push('Review and address exceptions');
                }
                controlRisks.push({
                    controlId: control.controlId,
                    controlName: control.controlName,
                    riskScore,
                    riskLevel: calculateRiskLevel(riskScore),
                    primaryConcerns: concerns,
                    suggestedRemediations: remediations,
                });
            }
        }
        // Sort by risk score descending
        return controlRisks.sort((a, b) => b.riskScore - a.riskScore);
    }
}
// ============================================================================
// Recommendation Generator
// ============================================================================
class RecommendationGenerator {
    /**
     * Generate recommended actions based on risks
     */
    generate(risks, controlRisks, state) {
        const actions = [];
        let priority = 1;
        // Address critical gaps first
        const criticalGaps = state.currentGaps.filter(g => g.severity === 'critical');
        for (const gap of criticalGaps) {
            actions.push({
                priority: priority++,
                action: `Remediate critical gap: ${gap.controlName}`,
                description: gap.gapDescription,
                estimatedEffort: 'significant',
                estimatedImpact: 30,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
        }
        // Address high-risk controls
        const highRiskControls = controlRisks.filter(c => c.riskLevel === 'critical' || c.riskLevel === 'high');
        for (const control of highRiskControls.slice(0, 5)) {
            actions.push({
                priority: priority++,
                action: `Address risk in ${control.controlName}`,
                description: control.primaryConcerns.join('; '),
                estimatedEffort: 'moderate',
                estimatedImpact: Math.min(25, control.riskScore / 3),
            });
        }
        // Improve evidence quality
        if (state.evidenceMetrics.averageQuality < 70) {
            actions.push({
                priority: priority++,
                action: 'Improve evidence quality',
                description: 'Review and enhance documentation for controls with low evidence scores',
                estimatedEffort: 'moderate',
                estimatedImpact: 15,
            });
        }
        // Increase automation
        if (state.evidenceMetrics.automatedEvidencePercentage < 50) {
            actions.push({
                priority: priority++,
                action: 'Increase evidence automation',
                description: 'Implement automated evidence collection for routine controls',
                estimatedEffort: 'significant',
                estimatedImpact: 20,
            });
        }
        // Address stale evidence
        if (state.evidenceMetrics.staleEvidenceCount > 3) {
            actions.push({
                priority: priority++,
                action: 'Refresh stale evidence',
                description: `Update ${state.evidenceMetrics.staleEvidenceCount} stale evidence items`,
                estimatedEffort: 'minimal',
                estimatedImpact: 10,
            });
        }
        return actions;
    }
}
// ============================================================================
// Compliance Prediction Engine
// ============================================================================
class CompliancePredictionEngine extends events_1.EventEmitter {
    config;
    model;
    featureExtractor;
    riskAnalyzer;
    recommendationGenerator;
    predictions = new Map();
    stats;
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.model = new CompliancePredictionModel(this.config.modelVersion);
        this.featureExtractor = new ComplianceFeatureExtractor();
        this.riskAnalyzer = new ComplianceRiskAnalyzer();
        this.recommendationGenerator = new RecommendationGenerator();
        this.stats = {
            totalPredictions: 0,
            byFramework: {},
            byOutcome: {
                pass: 0,
                pass_with_findings: 0,
                fail: 0,
            },
            averageConfidence: 0,
            accuracyRate: 0,
            lastPredictionAt: null,
        };
        logger_js_1.default.info({ config: this.config }, 'CompliancePredictionEngine initialized');
    }
    /**
     * Predict audit outcome for a compliance state
     */
    async predictAuditOutcome(state, horizonDays) {
        const horizon = horizonDays || this.config.defaultHorizonDays;
        // Extract features
        const features = this.featureExtractor.extractFeatures(state);
        // Get model prediction
        const { passLikelihood, confidence } = this.model.predict(features);
        // Analyze risks
        const riskFactors = this.riskAnalyzer.analyzeRisks(state);
        const controlRisks = this.riskAnalyzer.analyzeControlRisks(state, this.model, this.featureExtractor);
        // Determine predicted outcome
        let predictedOutcome;
        if (passLikelihood >= 0.8) {
            predictedOutcome = 'pass';
        }
        else if (passLikelihood >= 0.5) {
            predictedOutcome = 'pass_with_findings';
        }
        else {
            predictedOutcome = 'fail';
        }
        // Calculate risk score
        const riskScore = Math.round((1 - passLikelihood) * 100);
        // Generate recommendations
        const recommendedActions = this.recommendationGenerator.generate(riskFactors, controlRisks, state);
        const prediction = {
            id: (0, uuid_1.v4)(),
            tenantId: state.tenantId,
            framework: state.framework,
            predictedAt: new Date().toISOString(),
            predictionHorizon: `${horizon} days`,
            predictedOutcome,
            confidence: calculateConfidence(confidence),
            confidenceScore: confidence,
            passLikelihood,
            riskScore,
            keyRiskFactors: riskFactors,
            controlAtRisk: controlRisks.slice(0, 10), // Top 10
            recommendedActions,
            modelVersion: this.model.getVersion(),
            governanceVerdict: createVerdict(predictedOutcome === 'fail' ? data_envelope_js_1.GovernanceResult.FLAG :
                predictedOutcome === 'pass_with_findings' ? data_envelope_js_1.GovernanceResult.REVIEW_REQUIRED :
                    data_envelope_js_1.GovernanceResult.ALLOW, `Audit prediction: ${predictedOutcome} (${(passLikelihood * 100).toFixed(1)}% likelihood)`),
        };
        // Store prediction
        const tenantPredictions = this.predictions.get(state.tenantId) || [];
        tenantPredictions.push(prediction);
        this.predictions.set(state.tenantId, tenantPredictions.slice(-100));
        // Update stats
        this.updateStats(prediction);
        // Emit event for high-risk predictions
        if (predictedOutcome === 'fail') {
            this.emit('prediction:high-risk', prediction);
        }
        logger_js_1.default.info({
            predictionId: prediction.id,
            tenantId: state.tenantId,
            framework: state.framework,
            predictedOutcome,
            passLikelihood,
            riskScore,
        }, 'Audit prediction generated');
        return (0, data_envelope_js_1.createDataEnvelope)(prediction, {
            source: 'CompliancePredictionEngine',
            governanceVerdict: prediction.governanceVerdict,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Analyze compliance trends
     */
    async analyzeTrends(tenantId, framework, historicalStates) {
        if (historicalStates.length === 0) {
            return (0, data_envelope_js_1.createDataEnvelope)({
                tenantId,
                framework,
                period: { start: new Date(), end: new Date() },
                dataPoints: [],
                overallTrend: 'stable',
                projectedScore: 0,
                projectedDate: new Date(),
            }, {
                source: 'CompliancePredictionEngine',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'No historical data'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Sort by assessment date
        const sorted = [...historicalStates].sort((a, b) => a.lastAssessmentDate.getTime() - b.lastAssessmentDate.getTime());
        // Generate data points
        const dataPoints = sorted.map(state => {
            const implemented = state.controlStates.filter(c => c.status === 'implemented').length;
            const total = state.controlStates.length || 1;
            return {
                date: state.lastAssessmentDate,
                complianceScore: (implemented / total) * 100,
                controlsCompliant: implemented,
                controlsTotal: total,
                gapsOpen: state.currentGaps.length,
                evidenceQuality: state.evidenceMetrics.averageQuality,
            };
        });
        // Calculate trend
        const firstScore = dataPoints[0].complianceScore;
        const lastScore = dataPoints[dataPoints.length - 1].complianceScore;
        const scoreDiff = lastScore - firstScore;
        let overallTrend;
        if (scoreDiff > 5) {
            overallTrend = 'improving';
        }
        else if (scoreDiff < -5) {
            overallTrend = 'declining';
        }
        else {
            overallTrend = 'stable';
        }
        // Simple linear projection
        const avgChange = dataPoints.length > 1
            ? scoreDiff / (dataPoints.length - 1)
            : 0;
        const projectedScore = Math.min(100, Math.max(0, lastScore + avgChange * 3));
        const projectedDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
        const trend = {
            tenantId,
            framework,
            period: {
                start: sorted[0].lastAssessmentDate,
                end: sorted[sorted.length - 1].lastAssessmentDate,
            },
            dataPoints,
            overallTrend,
            projectedScore,
            projectedDate,
        };
        return (0, data_envelope_js_1.createDataEnvelope)(trend, {
            source: 'CompliancePredictionEngine',
            governanceVerdict: createVerdict(overallTrend === 'declining' ? data_envelope_js_1.GovernanceResult.FLAG : data_envelope_js_1.GovernanceResult.ALLOW, `Compliance trend: ${overallTrend}`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get predictions for a tenant
     */
    getPredictions(tenantId, framework) {
        let predictions = this.predictions.get(tenantId) || [];
        if (framework) {
            predictions = predictions.filter(p => p.framework === framework);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(predictions, {
            source: 'CompliancePredictionEngine',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Predictions retrieved'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Get prediction statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'CompliancePredictionEngine',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Record actual audit outcome for accuracy tracking
     */
    recordActualOutcome(tenantId, predictionId, actualOutcome) {
        const predictions = this.predictions.get(tenantId) || [];
        const prediction = predictions.find(p => p.id === predictionId);
        if (prediction) {
            const wasCorrect = prediction.predictedOutcome === actualOutcome;
            // Update accuracy rate
            const totalWithOutcome = this.stats.totalPredictions;
            const currentAccuracy = this.stats.accuracyRate;
            this.stats.accuracyRate =
                ((currentAccuracy * totalWithOutcome) + (wasCorrect ? 1 : 0)) / (totalWithOutcome + 1);
            logger_js_1.default.info({
                predictionId,
                tenantId,
                predictedOutcome: prediction.predictedOutcome,
                actualOutcome,
                wasCorrect,
                newAccuracyRate: this.stats.accuracyRate,
            }, 'Actual audit outcome recorded');
        }
    }
    /**
     * Clear tenant data
     */
    clearTenant(tenantId) {
        this.predictions.delete(tenantId);
        logger_js_1.default.info({ tenantId }, 'Tenant data cleared from prediction engine');
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    updateStats(prediction) {
        this.stats.totalPredictions++;
        this.stats.byFramework[prediction.framework] =
            (this.stats.byFramework[prediction.framework] || 0) + 1;
        this.stats.byOutcome[prediction.predictedOutcome]++;
        this.stats.lastPredictionAt = prediction.predictedAt;
        // Update average confidence
        const n = this.stats.totalPredictions;
        this.stats.averageConfidence =
            ((this.stats.averageConfidence * (n - 1)) + prediction.confidenceScore) / n;
    }
}
exports.CompliancePredictionEngine = CompliancePredictionEngine;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getCompliancePredictionEngine(config) {
    if (!instance) {
        instance = new CompliancePredictionEngine(config);
    }
    return instance;
}
exports.default = CompliancePredictionEngine;

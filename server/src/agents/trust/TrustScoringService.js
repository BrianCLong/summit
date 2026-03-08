"use strict";
/**
 * Trust Scoring Service
 *
 * Computes and manages trust scores for agents and predictive models.
 * Implements the Trust Model with:
 * - Non-authoritative advisory scores
 * - Transparent, explainable calculations
 * - Time-based decay
 * - Full audit trail
 *
 * SOC 2 Controls: CC7.2 (Monitoring), CC7.3 (Anomaly detection)
 *
 * @module agents/trust/TrustScoringService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustScoringService = void 0;
exports.getTrustScoringService = getTrustScoringService;
const events_1 = require("events");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const types_js_1 = require("./types.js");
const DEFAULT_CONFIG = {
    enableDecay: true,
    decayConfig: types_js_1.DEFAULT_DECAY_CONFIG,
    componentWeights: types_js_1.DEFAULT_COMPONENT_WEIGHTS,
    agentWeights: types_js_1.DEFAULT_AGENT_TRUST_WEIGHTS,
    modelWeights: types_js_1.DEFAULT_MODEL_TRUST_WEIGHTS,
    cacheTTL: 300000, // 5 minutes
    minDataPoints: 10,
};
// ============================================================================
// Trust Scoring Service
// ============================================================================
class TrustScoringService extends events_1.EventEmitter {
    config;
    scoreCache;
    updateEvents;
    // Mock data stores (in real implementation, these would query actual audit logs)
    historicalData;
    complianceData;
    auditData;
    consistencyData;
    lastActivityTime;
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.scoreCache = new Map();
        this.updateEvents = [];
        // Initialize mock data stores
        this.historicalData = new Map();
        this.complianceData = new Map();
        this.auditData = new Map();
        this.consistencyData = new Map();
        this.lastActivityTime = new Map();
        logger_js_1.default.info('[TrustScoringService] Initialized');
    }
    // ==========================================================================
    // Main Trust Score Calculation
    // ==========================================================================
    /**
     * Calculate trust score for an agent or model.
     */
    async calculateTrustScore(request) {
        logger_js_1.default.info(`[TrustScoringService] Calculating trust score for ${request.subjectId}`, {
            subjectType: request.subjectType,
        });
        // Check cache
        const cached = this.checkCache(request.subjectId);
        if (cached) {
            logger_js_1.default.info(`[TrustScoringService] Cache hit for ${request.subjectId}`);
            return {
                subjectId: request.subjectId,
                subjectType: request.subjectType,
                score: cached,
                timestamp: new Date().toISOString(),
            };
        }
        // Gather historical data
        const historicalAccuracy = this.getHistoricalAccuracy(request.subjectId);
        const compliance = this.getComplianceData(request.subjectId);
        const audit = this.getAuditData(request.subjectId);
        const consistency = this.getConsistencyData(request.subjectId);
        // Calculate component scores
        const components = this.calculateComponents(historicalAccuracy, compliance, audit, consistency, request.subjectType);
        // Calculate overall score
        const weights = request.subjectType === 'agent' ? this.config.agentWeights : this.config.modelWeights;
        const overallScore = this.calculateOverallScore(components, weights);
        // Apply decay
        const decayFactor = this.config.enableDecay
            ? this.calculateDecayFactor(request.subjectId)
            : 1.0;
        const decayedScore = overallScore * decayFactor;
        // Build breakdown
        const breakdown = {
            overallScore: decayedScore,
            band: (0, types_js_1.getTrustScoreBand)(decayedScore),
            components: {
                historicalAccuracy: components.historicalAccuracy,
                constraintCompliance: components.constraintCompliance,
                auditOutcomes: components.auditOutcomes,
                consistency: components.consistency,
            },
            dataPoints: {
                totalPredictions: historicalAccuracy.totalPredictions,
                totalTasks: historicalAccuracy.totalTasks,
                violations: compliance.violations,
                audits: audit.totalAudits,
            },
            lastUpdated: new Date().toISOString(),
            decayFactor,
        };
        // Cache result
        this.cacheScore(request.subjectId, breakdown);
        // Build response
        let score = breakdown;
        if (request.includeUncertainty) {
            score = this.addUncertainty(breakdown, historicalAccuracy.totalPredictions || historicalAccuracy.totalTasks);
        }
        const explanation = request.includeExplanation
            ? this.generateExplanation(breakdown, request.subjectType)
            : undefined;
        return {
            subjectId: request.subjectId,
            subjectType: request.subjectType,
            score,
            explanation,
            timestamp: new Date().toISOString(),
        };
    }
    // ==========================================================================
    // Component Calculation
    // ==========================================================================
    calculateComponents(historical, compliance, audit, consistency, subjectType) {
        // Base components (common to all)
        const baseComponents = {
            historicalAccuracy: this.calculateHistoricalAccuracyScore(historical),
            constraintCompliance: this.calculateComplianceScore(compliance),
            auditOutcomes: this.calculateAuditScore(audit),
            consistency: this.calculateConsistencyScore(consistency),
        };
        if (subjectType === 'agent') {
            // Add agent-specific components
            return {
                ...baseComponents,
                capabilityAdherence: this.calculateCapabilityAdherence(compliance),
                negotiationBehavior: this.calculateNegotiationBehavior(),
                resourceDiscipline: this.calculateResourceDiscipline(compliance),
            };
        }
        else {
            // Add model-specific components
            return {
                ...baseComponents,
                calibration: this.calculateCalibration(historical),
                biasMetrics: this.calculateBiasMetrics(),
                explainabilityQuality: this.calculateExplainabilityQuality(),
            };
        }
    }
    // --------------------------------------------------------------------------
    // Historical Accuracy (40% weight)
    // --------------------------------------------------------------------------
    calculateHistoricalAccuracyScore(data) {
        if (data.totalPredictions === 0 && data.totalTasks === 0) {
            return 0.5; // Neutral score for new agents/models
        }
        // Weight recent accuracy more heavily
        const recentWeight = 0.7;
        const olderWeight = 0.3;
        const score = data.recentAccuracy * recentWeight + data.olderAccuracy * olderWeight;
        return Math.max(0, Math.min(1, score));
    }
    // --------------------------------------------------------------------------
    // Constraint Compliance (30% weight)
    // --------------------------------------------------------------------------
    calculateComplianceScore(data) {
        if (data.totalPolicyChecks === 0) {
            return 0.5; // Neutral score for no activity
        }
        const baseScore = 1 - data.violations / data.totalPolicyChecks;
        // Penalize recent violations more heavily
        const recentPenalty = Math.min(0.5, data.recentViolations * 0.1);
        return Math.max(0, Math.min(1, baseScore - recentPenalty));
    }
    // --------------------------------------------------------------------------
    // Audit Outcomes (20% weight)
    // --------------------------------------------------------------------------
    calculateAuditScore(data) {
        if (data.totalAudits === 0) {
            return 0.5; // Neutral score for no audits
        }
        const passRate = data.passedAudits / data.totalAudits;
        // Penalize findings
        const criticalPenalty = data.criticalFindings * 0.2;
        const mediumPenalty = data.mediumFindings * 0.1;
        return Math.max(0, Math.min(1, passRate - criticalPenalty - mediumPenalty));
    }
    // --------------------------------------------------------------------------
    // Consistency (10% weight)
    // --------------------------------------------------------------------------
    calculateConsistencyScore(data) {
        if (data.accuracyByWeek.length < 3) {
            return 0.5; // Not enough data
        }
        const stdDev = (0, types_js_1.calculateStandardDeviation)(data.accuracyByWeek);
        // High variance → low consistency
        if (stdDev > 0.3)
            return 0;
        const consistencyScore = 1 - stdDev / 0.3;
        return Math.max(0, Math.min(1, consistencyScore));
    }
    // --------------------------------------------------------------------------
    // Agent-Specific Components
    // --------------------------------------------------------------------------
    calculateCapabilityAdherence(data) {
        if (data.totalPolicyChecks === 0)
            return 0.5;
        return 1 - data.unauthorizedAttempts / data.totalPolicyChecks;
    }
    calculateNegotiationBehavior() {
        // Simplified: would analyze negotiation history
        return 0.85;
    }
    calculateResourceDiscipline(data) {
        if (data.totalPolicyChecks === 0)
            return 0.5;
        return 1 - data.resourceBreaches / data.totalPolicyChecks;
    }
    // --------------------------------------------------------------------------
    // Model-Specific Components
    // --------------------------------------------------------------------------
    calculateCalibration(data) {
        // Simplified: would analyze predicted confidence vs. actual accuracy
        return 0.8;
    }
    calculateBiasMetrics() {
        // Simplified: would analyze false positive/negative rates
        return 0.85;
    }
    calculateExplainabilityQuality() {
        // Simplified: would analyze explanation correlation with outcomes
        return 0.75;
    }
    // ==========================================================================
    // Overall Score Calculation
    // ==========================================================================
    calculateOverallScore(components, weights) {
        let score = 0;
        // Base components
        score += components.historicalAccuracy * weights.historicalAccuracy;
        score += components.constraintCompliance * weights.constraintCompliance;
        score += components.auditOutcomes * weights.auditOutcomes;
        score += components.consistency * weights.consistency;
        // Agent-specific
        if ('capabilityAdherence' in components && 'capabilityAdherence' in weights) {
            score += components.capabilityAdherence * weights.capabilityAdherence;
            score += components.negotiationBehavior * weights.negotiationBehavior;
            score += components.resourceDiscipline * weights.resourceDiscipline;
        }
        // Model-specific
        if ('calibration' in components && 'calibration' in weights) {
            score += components.calibration * weights.calibration;
            score += components.biasMetrics * weights.biasMetrics;
            score += components.explainabilityQuality * weights.explainabilityQuality;
        }
        return Math.max(0, Math.min(1, score));
    }
    // ==========================================================================
    // Decay Calculation
    // ==========================================================================
    calculateDecayFactor(subjectId) {
        const lastActivity = this.lastActivityTime.get(subjectId);
        if (!lastActivity)
            return 1.0; // No decay if no activity recorded
        const daysSinceActivity = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);
        // Find applicable decay interval
        const intervals = this.config.decayConfig.intervals.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
        for (const interval of intervals) {
            if (daysSinceActivity >= interval.daysSinceActivity) {
                return interval.decayFactor;
            }
        }
        return 1.0; // No decay
    }
    // ==========================================================================
    // Uncertainty Calculation
    // ==========================================================================
    addUncertainty(breakdown, sampleSize) {
        // Calculate 95% confidence interval using normal approximation
        const z = 1.96; // 95% CI
        const p = breakdown.overallScore;
        const n = Math.max(1, sampleSize);
        const standardError = Math.sqrt((p * (1 - p)) / n);
        const marginOfError = z * standardError;
        return {
            ...breakdown,
            confidenceInterval: {
                lower: Math.max(0, p - marginOfError),
                upper: Math.min(1, p + marginOfError),
            },
            sampleSize,
        };
    }
    // ==========================================================================
    // Explanation Generation
    // ==========================================================================
    generateExplanation(breakdown, subjectType) {
        const { overallScore, band, components, dataPoints } = breakdown;
        let explanation = `Trust score: ${overallScore.toFixed(2)} (${band.replace('_', ' ')}). `;
        if (subjectType === 'agent') {
            explanation += `This agent has completed ${dataPoints.totalTasks || 0} tasks `;
        }
        else {
            explanation += `This model has made ${dataPoints.totalPredictions || 0} predictions `;
        }
        const accuracyPercent = (components.historicalAccuracy * 100).toFixed(0);
        explanation += `with ${accuracyPercent}% accuracy, `;
        if (dataPoints.violations === 0) {
            explanation += 'zero policy violations, ';
        }
        else {
            explanation += `${dataPoints.violations} policy violation(s), `;
        }
        if (dataPoints.audits > 0) {
            explanation += `and passed ${dataPoints.audits} audit(s). `;
        }
        if (band === 'very_high' || band === 'high') {
            explanation += 'Recent performance is consistent with historical averages.';
        }
        else if (band === 'low' || band === 'very_low') {
            explanation += 'Recommend manual review before relying on outputs.';
        }
        return explanation;
    }
    // ==========================================================================
    // Data Management (Mock Implementations)
    // ==========================================================================
    getHistoricalAccuracy(subjectId) {
        return (this.historicalData.get(subjectId) || {
            totalPredictions: 0,
            correctPredictions: 0,
            totalTasks: 0,
            successfulTasks: 0,
            recentAccuracy: 0.5,
            olderAccuracy: 0.5,
        });
    }
    getComplianceData(subjectId) {
        return (this.complianceData.get(subjectId) || {
            totalPolicyChecks: 0,
            violations: 0,
            recentViolations: 0,
            resourceBreaches: 0,
            unauthorizedAttempts: 0,
        });
    }
    getAuditData(subjectId) {
        return (this.auditData.get(subjectId) || {
            totalAudits: 0,
            passedAudits: 0,
            criticalFindings: 0,
            mediumFindings: 0,
        });
    }
    getConsistencyData(subjectId) {
        return (this.consistencyData.get(subjectId) || {
            accuracyByWeek: [],
            behavioralVariance: 0,
        });
    }
    // ==========================================================================
    // Data Injection (For Testing/Demo)
    // ==========================================================================
    injectHistoricalData(subjectId, data) {
        this.historicalData.set(subjectId, data);
        this.lastActivityTime.set(subjectId, Date.now());
    }
    injectComplianceData(subjectId, data) {
        this.complianceData.set(subjectId, data);
    }
    injectAuditData(subjectId, data) {
        this.auditData.set(subjectId, data);
    }
    injectConsistencyData(subjectId, data) {
        this.consistencyData.set(subjectId, data);
    }
    // ==========================================================================
    // Cache Management
    // ==========================================================================
    checkCache(subjectId) {
        const cached = this.scoreCache.get(subjectId);
        if (!cached)
            return null;
        if (Date.now() > cached.expiresAt) {
            this.scoreCache.delete(subjectId);
            return null;
        }
        return cached.score;
    }
    cacheScore(subjectId, score) {
        const expiresAt = Date.now() + this.config.cacheTTL;
        this.scoreCache.set(subjectId, { score, expiresAt });
    }
    clearCache() {
        this.scoreCache.clear();
    }
    // ==========================================================================
    // Update Tracking
    // ==========================================================================
    recordUpdate(event) {
        this.updateEvents.push(event);
        this.emit('trust_score_updated', event);
        logger_js_1.default.info('[TrustScoringService] Trust score updated', event);
    }
    getUpdateEvents() {
        return [...this.updateEvents];
    }
    clearUpdateEvents() {
        this.updateEvents = [];
    }
}
exports.TrustScoringService = TrustScoringService;
// ============================================================================
// Factory
// ============================================================================
let serviceInstance = null;
function getTrustScoringService(config) {
    if (!serviceInstance) {
        serviceInstance = new TrustScoringService(config);
    }
    return serviceInstance;
}

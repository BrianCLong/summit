"use strict";
/**
 * Election Integrity Service
 *
 * Unified service providing:
 * 1. Real-time election threat detection and monitoring
 * 2. Predictive mass behavior modeling
 * 3. Intervention opportunity identification
 * 4. Cross-domain threat correlation
 *
 * This service integrates:
 * - @intelgraph/election-disruption-detection
 * - @intelgraph/mass-behavior-dynamics
 * - @intelgraph/disinformation-detection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const election_disruption_detection_1 = require("@intelgraph/election-disruption-detection");
const mass_behavior_dynamics_1 = require("@intelgraph/mass-behavior-dynamics");
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
// Initialize engines
const disruptionEngine = new election_disruption_detection_1.ElectionDisruptionEngine({
    fusion: { weights: {}, correlationThreshold: 0.7 },
    attribution: { minConfidence: 0.5, methods: ['MULTI_INT_FUSION'] },
    adversarial: { enabled: true, detectionThreshold: 0.8 },
});
const behaviorEngine = new mass_behavior_dynamics_1.MassBehaviorEngine({
    population: {},
    contagion: {},
    phaseDetection: {},
    narrative: {},
    simulation: {},
});
// ============================================================================
// API ENDPOINTS
// ============================================================================
/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'election-integrity' });
});
/**
 * Analyze election threats
 *
 * POST /api/v1/threats/analyze
 */
app.post('/api/v1/threats/analyze', async (req, res) => {
    try {
        const { signals, context } = req.body;
        const assessment = await disruptionEngine.analyzeSignals(signals, context);
        res.json(assessment);
    }
    catch (error) {
        res.status(500).json({ error: 'Analysis failed', details: String(error) });
    }
});
/**
 * Analyze population dynamics
 *
 * POST /api/v1/behavior/dynamics
 */
app.post('/api/v1/behavior/dynamics', async (req, res) => {
    try {
        const { populationState, externalShocks } = req.body;
        const analysis = await behaviorEngine.analyzePopulationDynamics(populationState, externalShocks);
        res.json(analysis);
    }
    catch (error) {
        res.status(500).json({ error: 'Analysis failed', details: String(error) });
    }
});
/**
 * Assess cascade risk for a narrative
 *
 * POST /api/v1/behavior/cascade-risk
 */
app.post('/api/v1/behavior/cascade-risk', async (req, res) => {
    try {
        const { narrative, populationState } = req.body;
        const risk = await behaviorEngine.assessCascadeRisk(narrative, populationState);
        res.json(risk);
    }
    catch (error) {
        res.status(500).json({ error: 'Assessment failed', details: String(error) });
    }
});
/**
 * Find intervention points
 *
 * POST /api/v1/behavior/interventions
 */
app.post('/api/v1/behavior/interventions', async (req, res) => {
    try {
        const { populationState, objective } = req.body;
        const interventions = await behaviorEngine.findInterventionPoints(populationState, objective);
        res.json(interventions);
    }
    catch (error) {
        res.status(500).json({ error: 'Analysis failed', details: String(error) });
    }
});
/**
 * Integrated election integrity assessment
 *
 * Combines threat detection with behavioral predictions
 *
 * POST /api/v1/integrity/assess
 */
app.post('/api/v1/integrity/assess', async (req, res) => {
    try {
        const { signals, electionContext, populationState, externalShocks, } = req.body;
        // Run both analyses in parallel
        const [threatAssessment, behaviorAnalysis] = await Promise.all([
            disruptionEngine.analyzeSignals(signals, electionContext),
            behaviorEngine.analyzePopulationDynamics(populationState, externalShocks),
        ]);
        // Cross-correlate threats with behavioral vulnerabilities
        const integratedAssessment = integrateAssessments(threatAssessment, behaviorAnalysis, electionContext);
        res.json(integratedAssessment);
    }
    catch (error) {
        res.status(500).json({ error: 'Assessment failed', details: String(error) });
    }
});
/**
 * Simulate future scenarios
 *
 * POST /api/v1/simulation/scenarios
 */
app.post('/api/v1/simulation/scenarios', async (req, res) => {
    try {
        const { initialState, scenarios, timeHorizon } = req.body;
        const results = await behaviorEngine.simulateFuture(initialState, scenarios, timeHorizon);
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ error: 'Simulation failed', details: String(error) });
    }
});
function integrateAssessments(threats, behavior, context) {
    // Cross-correlate threats with behavioral vulnerabilities
    const crossCorrelations = findCrossCorrelations(threats, behavior);
    // Identify amplification risks
    const amplificationRisks = identifyAmplificationRisks(threats, behavior);
    // Generate prioritized recommendations
    const recommendations = generatePrioritizedRecommendations(threats, behavior, crossCorrelations, context);
    // Calculate overall risk
    const overallRisk = calculateOverallRisk(threats, behavior, crossCorrelations);
    return {
        timestamp: new Date(),
        electionContext: context,
        threatAssessment: threats,
        behaviorAnalysis: behavior,
        crossCorrelations,
        amplificationRisks,
        prioritizedRecommendations: recommendations,
        overallRiskScore: overallRisk,
        confidenceLevel: Math.min(threats.confidence, 0.9),
    };
}
function findCrossCorrelations(threats, behavior) {
    const correlations = [];
    for (const threat of threats.threats) {
        for (const vulnerability of behavior.vulnerabilities) {
            // Check if threat could exploit vulnerability
            if (threatExploitsVulnerability(threat.type, vulnerability.type)) {
                correlations.push({
                    threat: threat.type,
                    vulnerability: vulnerability.type,
                    correlationStrength: threat.confidence * vulnerability.severity,
                    amplificationPotential: calculateAmplificationPotential(threat, vulnerability),
                });
            }
        }
    }
    return correlations.sort((a, b) => b.correlationStrength - a.correlationStrength);
}
function threatExploitsVulnerability(threatType, vulnType) {
    const exploitMap = {
        DISINFORMATION_CAMPAIGN: ['SEGMENT_SUSCEPTIBILITY', 'ECHO_CHAMBER_RISK', 'INSTITUTIONAL_TRUST_DEFICIT'],
        VOTER_SUPPRESSION: ['SEGMENT_SUSCEPTIBILITY'],
        FOREIGN_INTERFERENCE: ['INSTITUTIONAL_TRUST_DEFICIT', 'ECHO_CHAMBER_RISK'],
        PERCEPTION_HACK: ['INSTITUTIONAL_TRUST_DEFICIT', 'SEGMENT_SUSCEPTIBILITY'],
        LEGITIMACY_ATTACK: ['INSTITUTIONAL_TRUST_DEFICIT'],
    };
    return exploitMap[threatType]?.includes(vulnType) || false;
}
function calculateAmplificationPotential(threat, vulnerability) {
    return 0.5; // Placeholder
}
function identifyAmplificationRisks(threats, behavior) {
    const risks = [];
    // Check phase transition indicators for amplification
    for (const indicator of behavior.phaseIndicators) {
        if (indicator.distanceToTransition < 0.3) {
            for (const threat of threats.threats) {
                if (threatCouldTriggerTransition(threat.type, indicator.type)) {
                    risks.push({
                        threatType: threat.type,
                        behavioralAmplifier: indicator.type,
                        projectedImpact: (1 - indicator.distanceToTransition) * threat.confidence,
                        timeframe: indicator.timeToTransition
                            ? `${indicator.timeToTransition} time units`
                            : 'Imminent',
                    });
                }
            }
        }
    }
    return risks.sort((a, b) => b.projectedImpact - a.projectedImpact);
}
function threatCouldTriggerTransition(threatType, transitionType) {
    const triggerMap = {
        DISINFORMATION_CAMPAIGN: ['OPINION_SHIFT', 'TRUST_COLLAPSE'],
        VOTER_SUPPRESSION: ['MASS_MOBILIZATION'],
        LEGITIMACY_ATTACK: ['TRUST_COLLAPSE', 'INSTITUTIONAL_CRISIS'],
        PERCEPTION_HACK: ['TRUST_COLLAPSE', 'NARRATIVE_DOMINANCE'],
    };
    return triggerMap[threatType]?.includes(transitionType) || false;
}
function generatePrioritizedRecommendations(threats, behavior, correlations, context) {
    const recommendations = [];
    // From threat mitigations
    for (const threat of threats.threats) {
        for (const mitigation of threat.mitigationRecommendations) {
            recommendations.push({
                action: mitigation.action,
                priority: mitigation.priority * (1 + 1 / (context.daysToElection + 1)),
                addressedThreats: [threat.type],
                addressedVulnerabilities: [],
                expectedEffectiveness: mitigation.effectivenessEstimate,
                implementation: mitigation.timeframe,
            });
        }
    }
    // From behavioral intervention opportunities
    for (const opportunity of behavior.interventionOpportunities) {
        for (const action of opportunity.recommendedActions) {
            recommendations.push({
                action,
                priority: opportunity.expectedEffectiveness * 10,
                addressedThreats: [],
                addressedVulnerabilities: [opportunity.targetTransition],
                expectedEffectiveness: opportunity.expectedEffectiveness,
                implementation: opportunity.timeWindow ? `${opportunity.timeWindow} time units` : 'Ongoing',
            });
        }
    }
    // Sort by priority
    return recommendations
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 10);
}
function calculateOverallRisk(threats, behavior, correlations) {
    const threatRisk = threats.overallRiskLevel.score;
    const behaviorRisk = behavior.vulnerabilities.reduce((sum, v) => sum + v.severity, 0) / Math.max(1, behavior.vulnerabilities.length);
    const correlationAmplifier = correlations.length > 0
        ? 1 + correlations[0].amplificationPotential * 0.3
        : 1;
    return Math.min(1, (threatRisk * 0.5 + behaviorRisk * 0.5) * correlationAmplifier);
}
// Start server
const PORT = process.env.PORT || 4100;
app.listen(PORT, () => {
    console.log(`Election Integrity Service running on port ${PORT}`);
});

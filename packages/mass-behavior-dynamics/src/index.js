"use strict";
/**
 * @intelgraph/mass-behavior-dynamics
 *
 * Revolutionary Mass Behavior Dynamics Engine
 *
 * This module implements cutting-edge approaches to modeling collective human behavior:
 *
 * 1. EPIDEMIC-INSPIRED INFORMATION CONTAGION
 *    - SIR/SEIR models adapted for idea propagation
 *    - Complex contagion with threshold dynamics
 *    - Superspreader identification
 *
 * 2. AGENT-BASED SOCIAL SIMULATION
 *    - Heterogeneous agent populations with cognitive profiles
 *    - Multi-layer network interactions (online/offline/institutional)
 *    - Bounded rationality and heuristic decision-making
 *
 * 3. COLLECTIVE PHASE TRANSITIONS
 *    - Critical mass detection for social movements
 *    - Tipping point prediction using percolation theory
 *    - Cascade failure analysis in trust networks
 *
 * 4. EMERGENT NARRATIVE DYNAMICS
 *    - Meme evolution and mutation tracking
 *    - Narrative competition landscapes
 *    - Counter-narrative effectiveness modeling
 *
 * 5. PSYCHOGRAPHIC TERRAIN MAPPING
 *    - Population-level belief distributions
 *    - Vulnerability surface identification
 *    - Resilience hotspot detection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MassBehaviorEngine = void 0;
__exportStar(require("./models/index.js"), exports);
__exportStar(require("./simulation/index.js"), exports);
__exportStar(require("./contagion/index.js"), exports);
__exportStar(require("./collective/index.js"), exports);
// ============================================================================
// MASS BEHAVIOR DYNAMICS ENGINE
// ============================================================================
class MassBehaviorEngine {
    populationModel;
    contagionEngine;
    phaseDetector;
    narrativeTracker;
    simulationEngine;
    constructor(config) {
        this.populationModel = new PopulationModel(config.population);
        this.contagionEngine = new ContagionEngine(config.contagion);
        this.phaseDetector = new PhaseTransitionDetector(config.phaseDetection);
        this.narrativeTracker = new NarrativeEvolutionTracker(config.narrative);
        this.simulationEngine = new AgentBasedSimulator(config.simulation);
    }
    /**
     * Analyze current population state and predict dynamics
     */
    async analyzePopulationDynamics(currentState, externalShocks) {
        // Model current belief/behavior distribution
        const beliefDynamics = await this.populationModel.analyzeBeliefs(currentState);
        // Detect contagion patterns
        const contagionPatterns = await this.contagionEngine.detectPatterns(currentState, externalShocks);
        // Check for phase transition indicators
        const phaseIndicators = await this.phaseDetector.analyze(currentState);
        // Track narrative evolution
        const narrativeDynamics = await this.narrativeTracker.analyze(currentState.beliefDistribution.emergingNarratives);
        return {
            timestamp: new Date(),
            currentState,
            beliefDynamics,
            contagionPatterns,
            phaseIndicators,
            narrativeDynamics,
            vulnerabilities: this.identifyVulnerabilities(currentState),
            interventionOpportunities: this.identifyInterventions(phaseIndicators),
        };
    }
    /**
     * Run predictive simulation of mass behavior
     */
    async simulateFuture(initialState, scenarios, timeHorizon) {
        const results = [];
        for (const scenario of scenarios) {
            const result = await this.simulationEngine.run({
                initialState,
                scenario,
                timeHorizon,
                iterations: 1000, // Monte Carlo
            });
            results.push(result);
        }
        return results;
    }
    /**
     * Identify critical intervention points
     */
    async findInterventionPoints(state, objective) {
        // Identify network-level interventions
        const networkInterventions = this.analyzeNetworkInterventions(state.networkTopology, objective);
        // Identify narrative interventions
        const narrativeInterventions = this.analyzeNarrativeInterventions(state.beliefDistribution, objective);
        // Identify institutional interventions
        const institutionalInterventions = this.analyzeInstitutionalInterventions(state.segments, objective);
        return [...networkInterventions, ...narrativeInterventions, ...institutionalInterventions]
            .sort((a, b) => b.expectedImpact - a.expectedImpact);
    }
    /**
     * Calculate cascade risk for specific narratives
     */
    async assessCascadeRisk(narrative, state) {
        const contagionParams = this.contagionEngine.estimateParameters(narrative, state);
        const R0 = this.calculateBasicReproductionNumber(contagionParams, state.networkTopology);
        const criticalMass = this.estimateCriticalMass(narrative, state);
        return {
            narrative,
            basicReproductionNumber: R0,
            effectiveReproductionNumber: this.adjustForImmunity(R0, state),
            criticalMass,
            currentPenetration: narrative.prevalence,
            cascadeProbability: this.calculateCascadeProbability(R0, narrative.prevalence, criticalMass),
            timeToSaturation: this.estimateTimeToSaturation(narrative, state),
            vulnerableSegments: this.identifyVulnerableSegments(narrative, state.segments),
            amplificationRisk: this.assessAmplificationRisk(narrative, state),
        };
    }
    // Private helper methods
    identifyVulnerabilities(state) {
        const vulnerabilities = [];
        // High susceptibility segments
        for (const segment of state.segments) {
            if (segment.susceptibilityProfile.disinformation > 0.7) {
                vulnerabilities.push({
                    type: 'SEGMENT_SUSCEPTIBILITY',
                    target: segment.id,
                    severity: segment.susceptibilityProfile.disinformation,
                    description: `Segment ${segment.name} has high disinformation susceptibility`,
                });
            }
        }
        // Network vulnerabilities
        if (state.networkTopology.modularityScore > 0.8) {
            vulnerabilities.push({
                type: 'ECHO_CHAMBER_RISK',
                target: 'network',
                severity: state.networkTopology.modularityScore,
                description: 'High network modularity indicates echo chamber formation',
            });
        }
        // Trust erosion
        const avgTrust = this.calculateAverageTrust(state.segments);
        if (avgTrust < 0.3) {
            vulnerabilities.push({
                type: 'INSTITUTIONAL_TRUST_DEFICIT',
                target: 'institutional',
                severity: 1 - avgTrust,
                description: 'Low institutional trust creates vulnerability to alternative narratives',
            });
        }
        return vulnerabilities;
    }
    calculateAverageTrust(segments) {
        let totalTrust = 0;
        let totalPop = 0;
        for (const seg of segments) {
            const segTrust = (seg.psychographics.institutionalTrust.government +
                seg.psychographics.institutionalTrust.media +
                seg.psychographics.institutionalTrust.science) /
                3;
            totalTrust += segTrust * seg.size;
            totalPop += seg.size;
        }
        return totalPop > 0 ? totalTrust / totalPop : 0;
    }
    identifyInterventions(indicators) {
        return indicators
            .filter((i) => i.predictedOutcome?.preventionWindow)
            .map((i) => ({
            targetTransition: i.type,
            timeWindow: i.timeToTransition,
            recommendedActions: this.getRecommendedActions(i),
            expectedEffectiveness: this.estimateEffectiveness(i),
        }));
    }
    getRecommendedActions(indicator) {
        const actions = [];
        switch (indicator.type) {
            case 'MASS_MOBILIZATION':
                actions.push('Monitor key organizers', 'Prepare counter-messaging', 'Engage moderates');
                break;
            case 'TRUST_COLLAPSE':
                actions.push('Increase transparency', 'Empower trusted intermediaries', 'Address grievances');
                break;
            case 'NARRATIVE_DOMINANCE':
                actions.push('Deploy counter-narratives', 'Amplify alternative voices', 'Fact-check prominently');
                break;
        }
        return actions;
    }
    estimateEffectiveness(indicator) {
        return indicator.distanceToTransition > 0.3 ? 0.7 : 0.3;
    }
    analyzeNetworkInterventions(topology, objective) {
        return topology.bridges.map((bridge) => ({
            type: 'NETWORK',
            target: bridge.id,
            mechanism: 'Bridge node engagement',
            expectedImpact: bridge.informationFlowCapacity * 0.5,
            cost: 'MEDIUM',
            timeToEffect: 'DAYS',
        }));
    }
    analyzeNarrativeInterventions(beliefs, objective) {
        return beliefs.contestedTopics.map((topic) => ({
            type: 'NARRATIVE',
            target: topic,
            mechanism: 'Counter-narrative injection',
            expectedImpact: 0.4,
            cost: 'LOW',
            timeToEffect: 'WEEKS',
        }));
    }
    analyzeInstitutionalInterventions(segments, objective) {
        return segments
            .filter((s) => s.psychographics.institutionalTrust.government < 0.3)
            .map((segment) => ({
            type: 'INSTITUTIONAL',
            target: segment.id,
            mechanism: 'Trust-building engagement',
            expectedImpact: 0.3,
            cost: 'HIGH',
            timeToEffect: 'MONTHS',
        }));
    }
    calculateBasicReproductionNumber(params, topology) {
        return params.transmissionRate * topology.averageDegree / params.recoveryRate;
    }
    adjustForImmunity(R0, state) {
        // Adjust for population-level immunity/resistance
        return R0 * (1 - state.informationEnvironment.factCheckingPenetration * 0.3);
    }
    estimateCriticalMass(narrative, state) {
        // Threshold for cascade based on network structure
        return 1 / state.networkTopology.averageDegree;
    }
    calculateCascadeProbability(R0, currentPenetration, criticalMass) {
        if (R0 < 1) {
            return 0.1;
        }
        if (currentPenetration > criticalMass) {
            return 0.9;
        }
        return Math.min(0.9, R0 * currentPenetration / criticalMass);
    }
    estimateTimeToSaturation(narrative, state) {
        return narrative.velocity > 0 ? (1 - narrative.prevalence) / narrative.velocity : Infinity;
    }
    identifyVulnerableSegments(narrative, segments) {
        return segments
            .filter((s) => s.susceptibilityProfile.disinformation > 0.5)
            .map((s) => s.id);
    }
    assessAmplificationRisk(narrative, state) {
        return state.informationEnvironment.platformDynamics.reduce((max, p) => Math.max(max, p.algorithmicAmplification * p.viralityCoefficient), 0);
    }
}
exports.MassBehaviorEngine = MassBehaviorEngine;
// Supporting classes (stubs for implementation)
class PopulationModel {
    config;
    constructor(config) {
        this.config = config;
    }
    async analyzeBeliefs(state) {
        return { stable: true, shifts: [] };
    }
}
class ContagionEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    async detectPatterns(state, shocks) {
        return [];
    }
    estimateParameters(narrative, state) {
        return {
            transmissionRate: 0.3,
            recoveryRate: 0.1,
            immunityDecay: 0.01,
            thresholdDistribution: { mean: 0.25, variance: 0.1, skewness: 0 },
            socialReinforcement: 0.5,
            credibilityWeight: 0.7,
            homophilyBias: 0.6,
            bridgeTransmissionBonus: 1.5,
            echoChamberAmplification: 2.0,
            emotionalIntensity: 0.7,
            noveltyBonus: 0.3,
            confirmationBias: 0.6,
        };
    }
}
class PhaseTransitionDetector {
    config;
    constructor(config) {
        this.config = config;
    }
    async analyze(state) {
        return [];
    }
}
class NarrativeEvolutionTracker {
    config;
    constructor(config) {
        this.config = config;
    }
    async analyze(narratives) {
        return { dominant: null, emerging: [], declining: [] };
    }
}
class AgentBasedSimulator {
    config;
    constructor(config) {
        this.config = config;
    }
    async run(params) {
        return {
            scenario: params.scenario,
            trajectories: [],
            statistics: {},
        };
    }
}

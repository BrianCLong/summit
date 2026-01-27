/**
 * @intelgraph/mass-behavior-dynamics
 *
 * Revolutionary Mass Behavior Dynamics Engine
 */

export * from './models/index.js';
export * from './simulation/index.js';
export * from './contagion/index.js';
export * from './collective/index.js';
import { CognitiveAgentSimulator } from './models/cognitive-agent.js';

// ============================================================================
// CORE TYPE DEFINITIONS
// ============================================================================

export interface PopulationState {
  timestamp: Date;
  totalPopulation: number;
  segments: PopulationSegment[];
  networkTopology: NetworkTopology;
  beliefDistribution: BeliefDistribution;
  emotionalClimate: EmotionalClimate;
  informationEnvironment: InformationEnvironment;
}

export interface PopulationSegment {
  id: string;
  name: string;
  size: number;
  demographics: any;
  psychographics: any;
  mediaConsumption: any;
  socialPosition: any;
  susceptibilityProfile: any;
}

export interface NetworkTopology {
  nodeCount: number;
  edgeCount: number;
  averageDegree: number;
  clusteringCoefficient: number;
  averagePathLength: number;
  modularityScore: number;
  communities: any[];
  bridges: any[];
  influencers: any[];
}

export interface BeliefDistribution {
  beliefs: any[];
  polarizationIndex: number;
  consensusTopics: string[];
  contestedTopics: string[];
  emergingNarratives: Narrative[];
}

export interface Narrative {
  id: string;
  content: string;
  prevalence: number;
  velocity: number;
  sources: string[];
  variants: any[];
  counterNarratives: string[];
}

export interface EmotionalClimate {
  dominantEmotions: any[];
  anxietyLevel: number;
  angerLevel: number;
  hopefulnessLevel: number;
  collectiveTrauma: number;
  moralOutrage: number;
}

export interface InformationEnvironment {
  informationDensity: number;
  noiseLevel: number;
  disinformationSaturation: number;
  factCheckingPenetration: number;
  platformDynamics: any[];
}

export interface ExternalShock {
  type: string;
  magnitude: number;
  timing: Date;
  affectedSegments: string[];
}

export interface Scenario {
  name: string;
  events: ExternalShock[];
  interventions: any[];
}

// ============================================================================
// MASS BEHAVIOR DYNAMICS ENGINE
// ============================================================================

import { AgentBasedSimulator, SimulationResult } from './simulation/agent-based-simulator.js';

export class MassBehaviorEngine {
  private populationModel: PopulationModel;
  private contagionEngine: ContagionEngine;
  private phaseDetector: PhaseTransitionDetector;
  private narrativeTracker: NarrativeEvolutionTracker;
  private simulationEngine: AgentBasedSimulator;

  constructor(config: EngineConfiguration) {
    this.populationModel = new PopulationModel(config.population);
    this.contagionEngine = new ContagionEngine(config.contagion);
    this.phaseDetector = new PhaseTransitionDetector(config.phaseDetection);
    this.narrativeTracker = new NarrativeEvolutionTracker(config.narrative);
    this.simulationEngine = new AgentBasedSimulator(config.simulation as any);
  }

  /**
   * Analyze current population state and predict dynamics
   */
  async analyzePopulationDynamics(
    currentState: PopulationState,
    externalShocks: ExternalShock[]
  ): Promise<any> {
    const beliefDynamics = await this.populationModel.analyzeBeliefs(currentState);
    const contagionPatterns = await this.contagionEngine.detectPatterns(currentState, externalShocks);
    const phaseIndicators = await this.phaseDetector.analyze(currentState);
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
  async simulateFuture(
    initialState: PopulationState,
    scenarios: Scenario[],
    timeHorizon: number
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];

    for (const scenario of scenarios) {
      this.simulationEngine.initialize(initialState);
      const result = this.simulationEngine.run(scenario);
      results.push(result);
    }

    return results;
  }

  /**
   * Assess cascade risk for specific narratives
   */
  async assessCascadeRisk(
    narrative: Narrative,
    state: PopulationState
  ): Promise<any> {
    const contagionParams = this.contagionEngine.estimateParameters(narrative, state);
    // Adjusted R0 calculation
    const R0 = (contagionParams.transmissionRate * state.networkTopology.averageDegree) / contagionParams.recoveryRate;

    // Probability of escape/cascade is 1 - (1/R0)^I0 in simple SIR, simplified here.
    // We want a value between 0 and 1 that increases with R0 and prevalence.

    let prob = 0.0;
    if (R0 > 1) {
      // Base probability if R0 > 1
      prob = 1 - (1 / R0);
      // Scale by prevalence factor (if it's already widespread, cascade is certain)
      prob = Math.min(0.99, prob + narrative.prevalence * 10);
    } else {
      prob = 0.01 * R0; // Minimal risk
    }

    return {
      narrative,
      basicReproductionNumber: R0,
      cascadeProbability: prob,
      vulnerableSegments: state.segments.filter(s => s.susceptibilityProfile?.disinformation > 0.5).map(s => s.id)
    };
  }

  private identifyVulnerabilities(state: PopulationState): any[] {
    return [];
  }

  private identifyInterventions(phaseIndicators: any[]): any[] {
    return [];
  }
}

// Supporting classes (stubs for implementation)
class PopulationModel {
  constructor(private config: any) { }
  async analyzeBeliefs(state: PopulationState): Promise<any> {
    const simulator = new CognitiveAgentSimulator();
    // Simplified: Analyze shift for the top emerging narrative
    const primaryNarrative = state.beliefDistribution.emergingNarratives[0];
    if (!primaryNarrative) return { stable: true, shifts: [] };

    // Sample a few agents from segments to see baseline reaction
    const sampleResults = state.segments.map(s => {
      const agent: any = {
        beliefs: { beliefs: new Map() },
        cognition: s.psychographics.cognitiveProfile,
        socialIdentity: { identityStrength: 0.5 },
        informationDiet: { sources: [] },
        state: { cognitiveLoad: 0.2, currentEmotion: { arousal: 0.3 } }
      };
      return simulator.processInformation(agent, {
        topic: primaryNarrative.id,
        claim: primaryNarrative.content,
        claimStrength: 0.8,
        valence: 1,
        source: 'external',
        emotionalIntensity: 0.5
      });
    });

    const shift = sampleResults.filter(r => r.updated).length / sampleResults.length;
    return {
      stable: shift < 0.2,
      shifts: [{ narrativeId: primaryNarrative.id, potentialShift: shift }]
    };
  }
}

class ContagionEngine {
  constructor(private config: any) { }
  async detectPatterns(state: PopulationState, shocks: ExternalShock[]): Promise<any[]> {
    // Simple pattern detection: correlation between shocks and belief shifts
    return shocks.map(s => ({
      trigger: s.type,
      impactRadius: s.affectedSegments.length || state.segments.length,
      severity: s.magnitude
    }));
  }
  estimateParameters(narrative: Narrative, state: PopulationState): any {
    const avgSusceptibility = state.segments.reduce((acc, s) => acc + s.susceptibilityProfile.disinformation, 0) / state.segments.length;

    // Transmission rate scales with susceptibility and narrative velocity
    const beta = Math.min(0.9, 0.1 + (avgSusceptibility * 0.5) + (narrative.velocity * 0.2));
    const gamma = 0.1; // Baseline recovery rate

    return {
      transmissionRate: beta,
      recoveryRate: gamma,
      immunityDecay: 0.01,
      R0: beta / gamma
    };
  }
}

class PhaseTransitionDetector {
  constructor(private config: unknown) { }
  async analyze(state: PopulationState): Promise<any[]> {
    return [];
  }
}

class NarrativeEvolutionTracker {
  constructor(private config: unknown) { }
  async analyze(narratives: Narrative[]): Promise<any> {
    return { dominant: null, emerging: [], declining: [] };
  }
}

// ============================================================================
// SHARED PSYCHOGRAPHICS TYPES
// ============================================================================

export interface Psychographics {
  cognitiveProfile: CognitiveProfile;
  institutionalTrust: {
    government: number;
    media: number;
  };
  authorityTrust: number;
  moralFoundations: {
    care: number;
    loyalty: number;
    authority: number;
    fairness?: number;
    sanctity?: number;
  };
}

export interface CognitiveProfile {
  analyticalThinking: number;
  needForCognition: number;
  epistemiChastity?: number;
}

export interface MediaSource {
  id: string;
  name: string;
  trustLevel: number;
  outlets: string[];
}

// ============================================================================
// PHASE TRANSITION TYPES
// ============================================================================

export type TransitionType = 'MASS_MOBILIZATION' | 'TRUST_COLLAPSE' | 'OPINION_SHIFT';

export interface EarlyWarningSignal {
  signal: 'AUTOCORRELATION' | 'VARIANCE' | 'SKEWNESS' | 'FLICKERING';
  value: number;
  threshold: number;
  trend: number;
  significance: number;
}

export interface PhaseTransitionIndicator {
  type: TransitionType;
  probability: number;
  timeToCriticality: number;
  signals: EarlyWarningSignal[];
}

export interface EngineConfiguration {
  population: unknown;
  contagion: unknown;
  phaseDetection: unknown;
  narrative: unknown;
  simulation: unknown;
}

export { SimulationResult };

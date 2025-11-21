/**
 * Cognitive Agent Model
 *
 * Models individual agents with realistic cognitive processes:
 * - Dual-process thinking (System 1/2)
 * - Motivated reasoning
 * - Social identity processing
 * - Information evaluation heuristics
 */

import { Psychographics, CognitiveProfile, MediaSource } from '../index.js';

export interface CognitiveAgent {
  id: string;
  beliefs: BeliefSystem;
  cognition: CognitiveProfile;
  socialIdentity: SocialIdentity;
  informationDiet: InformationDiet;
  state: AgentState;
}

export interface BeliefSystem {
  beliefs: Map<string, Belief>;
  worldview: Worldview;
  updateHistory: BeliefUpdate[];
}

export interface Belief {
  proposition: string;
  confidence: number; // 0-1
  valence: number; // -1 to 1
  salience: number;
  sources: string[];
  lastUpdated: Date;
  resistance: number; // resistance to change
}

export interface Worldview {
  coreBeliefs: string[];
  schema: Map<string, string[]>;
  inconsistencyTolerance: number;
}

export interface BeliefUpdate {
  timestamp: Date;
  belief: string;
  oldConfidence: number;
  newConfidence: number;
  trigger: string;
}

export interface SocialIdentity {
  groups: GroupMembership[];
  primaryIdentity: string;
  identityStrength: number;
  outgroupAntipathy: Map<string, number>;
}

export interface GroupMembership {
  groupId: string;
  strength: number;
  normAlignment: number;
  statusWithin: number;
}

export interface InformationDiet {
  sources: MediaSource[];
  exposurePattern: ExposurePattern;
  filterBubbleDepth: number;
  crossCuttingExposure: number;
}

export interface ExposurePattern {
  dailyHours: number;
  peakTimes: number[];
  platformPreferences: Map<string, number>;
}

export interface AgentState {
  currentEmotion: EmotionalState;
  cognitiveLoad: number;
  attentionFocus: string[];
  recentExposures: InformationExposure[];
}

export interface EmotionalState {
  valence: number;
  arousal: number;
  dominance: number;
  specificEmotions: Map<string, number>;
}

export interface InformationExposure {
  content: string;
  source: string;
  timestamp: Date;
  engagement: number;
  impact: number;
}

/**
 * Cognitive Agent Simulator
 *
 * Simulates how agents process information and update beliefs
 */
export class CognitiveAgentSimulator {
  private agents: Map<string, CognitiveAgent> = new Map();

  constructor() {}

  /**
   * Simulate agent's response to new information
   */
  processInformation(
    agent: CognitiveAgent,
    information: InformationStimulus
  ): BeliefUpdateResult {
    // Step 1: Attention filter
    if (!this.passesAttentionFilter(agent, information)) {
      return { updated: false, reason: 'FILTERED_OUT' };
    }

    // Step 2: Source credibility evaluation
    const sourceCredibility = this.evaluateSourceCredibility(agent, information.source);

    // Step 3: Motivated reasoning check
    const motivatedReasoning = this.calculateMotivatedReasoning(agent, information);

    // Step 4: Social proof consideration
    const socialProof = this.calculateSocialProof(agent, information);

    // Step 5: Cognitive processing (System 1 vs 2)
    const processingDepth = this.determineProcessingDepth(agent, information);

    // Step 6: Belief update calculation
    const updateStrength = this.calculateUpdateStrength(
      sourceCredibility,
      motivatedReasoning,
      socialProof,
      processingDepth
    );

    // Step 7: Apply update
    return this.applyBeliefUpdate(agent, information, updateStrength);
  }

  private passesAttentionFilter(
    agent: CognitiveAgent,
    info: InformationStimulus
  ): boolean {
    // Salience, novelty, and relevance check
    const salience = this.calculateSalience(agent, info);
    const novelty = this.calculateNovelty(agent, info);
    const relevance = this.calculateRelevance(agent, info);

    const attentionThreshold =
      0.3 + agent.state.cognitiveLoad * 0.2;

    return salience + novelty + relevance > attentionThreshold;
  }

  private evaluateSourceCredibility(agent: CognitiveAgent, source: string): number {
    // Base credibility from information diet
    let credibility = 0.5;

    for (const s of agent.informationDiet.sources) {
      if (s.outlets.includes(source)) {
        credibility = s.trustLevel;
        break;
      }
    }

    // Adjust for in-group sources
    if (this.isIngroupSource(agent, source)) {
      credibility = Math.min(1, credibility * 1.3);
    }

    return credibility;
  }

  private calculateMotivatedReasoning(
    agent: CognitiveAgent,
    info: InformationStimulus
  ): number {
    // How much will motivated reasoning affect processing?
    const beliefThreat = this.assessBeliefThreat(agent, info);
    const identityThreat = this.assessIdentityThreat(agent, info);

    // Higher values = more defensive processing
    return (beliefThreat + identityThreat) / 2 *
      (1 - agent.cognition.epistemiChastity);
  }

  private calculateSocialProof(
    agent: CognitiveAgent,
    info: InformationStimulus
  ): number {
    // Social proof from in-group adoption
    const ingroupAdoption = info.socialSignals?.ingroupEndorsements || 0;
    const identityStrength = agent.socialIdentity.identityStrength;

    return Math.tanh(ingroupAdoption * identityStrength * 0.1);
  }

  private determineProcessingDepth(
    agent: CognitiveAgent,
    info: InformationStimulus
  ): 'SYSTEM_1' | 'SYSTEM_2' {
    const analyticalTendency = agent.cognition.analyticalThinking;
    const cognitiveLoad = agent.state.cognitiveLoad;
    const emotionalArousal = agent.state.currentEmotion.arousal;

    // System 2 more likely with high analytical tendency, low load, low arousal
    const system2Probability =
      analyticalTendency * (1 - cognitiveLoad) * (1 - emotionalArousal * 0.5);

    return Math.random() < system2Probability ? 'SYSTEM_2' : 'SYSTEM_1';
  }

  private calculateUpdateStrength(
    sourceCredibility: number,
    motivatedReasoning: number,
    socialProof: number,
    processingDepth: 'SYSTEM_1' | 'SYSTEM_2'
  ): number {
    let base = sourceCredibility * 0.4 + socialProof * 0.3;

    // Motivated reasoning reduces update for threatening info
    base *= 1 - motivatedReasoning * 0.5;

    // System 2 processing is more calibrated
    if (processingDepth === 'SYSTEM_2') {
      base = base * 0.8 + sourceCredibility * 0.2;
    }

    return Math.max(0, Math.min(1, base));
  }

  private applyBeliefUpdate(
    agent: CognitiveAgent,
    info: InformationStimulus,
    strength: number
  ): BeliefUpdateResult {
    const existingBelief = agent.beliefs.beliefs.get(info.topic);

    if (!existingBelief) {
      // New belief formation
      agent.beliefs.beliefs.set(info.topic, {
        proposition: info.claim,
        confidence: strength * info.claimStrength,
        valence: info.valence,
        salience: 0.5,
        sources: [info.source],
        lastUpdated: new Date(),
        resistance: 0.2,
      });
      return { updated: true, reason: 'NEW_BELIEF' };
    }

    // Existing belief update (Bayesian-ish)
    const oldConfidence = existingBelief.confidence;
    const resistance = existingBelief.resistance;

    // Direction of information relative to belief
    const alignmentWithBelief = info.valence * existingBelief.valence;

    let newConfidence: number;
    if (alignmentWithBelief > 0) {
      // Confirming information
      newConfidence = oldConfidence + (1 - oldConfidence) * strength * 0.3;
    } else {
      // Disconfirming information
      newConfidence = oldConfidence - oldConfidence * strength * (1 - resistance) * 0.2;
    }

    existingBelief.confidence = newConfidence;
    existingBelief.lastUpdated = new Date();

    agent.beliefs.updateHistory.push({
      timestamp: new Date(),
      belief: info.topic,
      oldConfidence,
      newConfidence,
      trigger: info.source,
    });

    return {
      updated: true,
      reason: alignmentWithBelief > 0 ? 'CONFIRMATION' : 'DISCONFIRMATION',
      delta: newConfidence - oldConfidence,
    };
  }

  private calculateSalience(agent: CognitiveAgent, info: InformationStimulus): number {
    return info.emotionalIntensity * 0.5 + (agent.state.attentionFocus.includes(info.topic) ? 0.5 : 0);
  }

  private calculateNovelty(agent: CognitiveAgent, info: InformationStimulus): number {
    const recent = agent.state.recentExposures.filter(
      (e) => e.content === info.claim
    ).length;
    return Math.max(0, 1 - recent * 0.3);
  }

  private calculateRelevance(agent: CognitiveAgent, info: InformationStimulus): number {
    return agent.beliefs.beliefs.has(info.topic) ? 0.7 : 0.3;
  }

  private isIngroupSource(agent: CognitiveAgent, source: string): boolean {
    return false; // Placeholder
  }

  private assessBeliefThreat(agent: CognitiveAgent, info: InformationStimulus): number {
    const belief = agent.beliefs.beliefs.get(info.topic);
    if (!belief) return 0;
    return belief.valence !== info.valence ? belief.confidence : 0;
  }

  private assessIdentityThreat(agent: CognitiveAgent, info: InformationStimulus): number {
    // Check if information threatens group identity
    return 0; // Placeholder
  }
}

export interface InformationStimulus {
  topic: string;
  claim: string;
  claimStrength: number;
  valence: number; // -1 to 1
  source: string;
  emotionalIntensity: number;
  socialSignals?: {
    ingroupEndorsements: number;
    outgroupEndorsements: number;
    viralityScore: number;
  };
}

export interface BeliefUpdateResult {
  updated: boolean;
  reason: string;
  delta?: number;
}

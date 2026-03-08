"use strict";
/**
 * Cognitive Agent Model
 *
 * Models individual agents with realistic cognitive processes:
 * - Dual-process thinking (System 1/2)
 * - Motivated reasoning
 * - Social identity processing
 * - Information evaluation heuristics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveAgentSimulator = void 0;
/**
 * Cognitive Agent Simulator
 *
 * Simulates how agents process information and update beliefs
 */
class CognitiveAgentSimulator {
    agents = new Map();
    constructor() { }
    /**
     * Simulate agent's response to new information
     */
    processInformation(agent, information) {
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
        const updateStrength = this.calculateUpdateStrength(sourceCredibility, motivatedReasoning, socialProof, processingDepth);
        // Step 7: Apply update
        return this.applyBeliefUpdate(agent, information, updateStrength);
    }
    passesAttentionFilter(agent, info) {
        // Salience, novelty, and relevance check
        const salience = this.calculateSalience(agent, info);
        const novelty = this.calculateNovelty(agent, info);
        const relevance = this.calculateRelevance(agent, info);
        const attentionThreshold = 0.3 + agent.state.cognitiveLoad * 0.2;
        return salience + novelty + relevance > attentionThreshold;
    }
    evaluateSourceCredibility(agent, source) {
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
    calculateMotivatedReasoning(agent, info) {
        // How much will motivated reasoning affect processing?
        const beliefThreat = this.assessBeliefThreat(agent, info);
        const identityThreat = this.assessIdentityThreat(agent, info);
        // Higher values = more defensive processing
        return (beliefThreat + identityThreat) / 2 *
            (1 - agent.cognition.epistemiChastity);
    }
    calculateSocialProof(agent, info) {
        // Social proof from in-group adoption
        const ingroupAdoption = info.socialSignals?.ingroupEndorsements || 0;
        const identityStrength = agent.socialIdentity.identityStrength;
        return Math.tanh(ingroupAdoption * identityStrength * 0.1);
    }
    determineProcessingDepth(agent, info) {
        const analyticalTendency = agent.cognition.analyticalThinking;
        const cognitiveLoad = agent.state.cognitiveLoad;
        const emotionalArousal = agent.state.currentEmotion.arousal;
        // System 2 more likely with high analytical tendency, low load, low arousal
        const system2Probability = analyticalTendency * (1 - cognitiveLoad) * (1 - emotionalArousal * 0.5);
        return Math.random() < system2Probability ? 'SYSTEM_2' : 'SYSTEM_1';
    }
    calculateUpdateStrength(sourceCredibility, motivatedReasoning, socialProof, processingDepth) {
        let base = sourceCredibility * 0.4 + socialProof * 0.3;
        // Motivated reasoning reduces update for threatening info
        base *= 1 - motivatedReasoning * 0.5;
        // System 2 processing is more calibrated
        if (processingDepth === 'SYSTEM_2') {
            base = base * 0.8 + sourceCredibility * 0.2;
        }
        return Math.max(0, Math.min(1, base));
    }
    applyBeliefUpdate(agent, info, strength) {
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
        let newConfidence;
        if (alignmentWithBelief > 0) {
            // Confirming information
            newConfidence = oldConfidence + (1 - oldConfidence) * strength * 0.3;
        }
        else {
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
    calculateSalience(agent, info) {
        return info.emotionalIntensity * 0.5 + (agent.state.attentionFocus.includes(info.topic) ? 0.5 : 0);
    }
    calculateNovelty(agent, info) {
        const recent = agent.state.recentExposures.filter((e) => e.content === info.claim).length;
        return Math.max(0, 1 - recent * 0.3);
    }
    calculateRelevance(agent, info) {
        return agent.beliefs.beliefs.has(info.topic) ? 0.7 : 0.3;
    }
    isIngroupSource(agent, source) {
        return false; // Placeholder
    }
    assessBeliefThreat(agent, info) {
        const belief = agent.beliefs.beliefs.get(info.topic);
        if (!belief) {
            return 0;
        }
        return belief.valence !== info.valence ? belief.confidence : 0;
    }
    assessIdentityThreat(agent, info) {
        // Check if information threatens group identity
        return 0; // Placeholder
    }
}
exports.CognitiveAgentSimulator = CognitiveAgentSimulator;

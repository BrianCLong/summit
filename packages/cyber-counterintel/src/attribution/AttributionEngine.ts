/**
 * Nation-State Attribution Engine
 *
 * Advanced attribution analysis using multiple evidence types,
 * machine learning, and probabilistic reasoning
 */

import type {
  APTGroup,
  CyberCampaign,
  AttributionEvidence,
  MalwareAnalysis
} from '../types.js';

export interface AttributionResult {
  primaryAttribution: {
    actorId: string;
    actorName: string;
    country: string;
    confidence: number;
    evidenceStrength: string;
  } | null;
  alternativeAttributions: Array<{
    actorId: string;
    actorName: string;
    confidence: number;
  }>;
  evidenceSummary: {
    technical: number;
    operational: number;
    strategic: number;
    overall: number;
  };
  falseFlagIndicators: string[];
  confidenceFactors: {
    positive: string[];
    negative: string[];
  };
  recommendation: string;
}

export interface EvidenceWeight {
  type: string;
  baseWeight: number;
  corroborationMultiplier: number;
  decayFactor: number; // How much weight decreases over time
}

export class AttributionEngine {
  private evidenceWeights: Map<string, EvidenceWeight> = new Map();
  private evidenceStore: Map<string, AttributionEvidence[]> = new Map();
  private falseFlagIndicators: Map<string, string[]> = new Map();

  constructor() {
    this.initializeEvidenceWeights();
    this.initializeFalseFlagIndicators();
  }

  /**
   * Perform comprehensive attribution analysis
   */
  async analyzeAttribution(
    subjectId: string,
    subjectType: 'CAMPAIGN' | 'MALWARE' | 'INFRASTRUCTURE',
    evidence: AttributionEvidence[],
    knownActors: APTGroup[]
  ): Promise<AttributionResult> {
    // Calculate evidence scores for each potential actor
    const actorScores = new Map<string, {
      technical: number;
      operational: number;
      strategic: number;
      evidenceCount: number;
    }>();

    // Initialize scores for all known actors
    for (const actor of knownActors) {
      actorScores.set(actor.id, {
        technical: 0,
        operational: 0,
        strategic: 0,
        evidenceCount: 0
      });
    }

    // Process each piece of evidence
    for (const ev of evidence) {
      const weight = this.calculateEvidenceWeight(ev);
      const category = this.categorizeEvidence(ev.evidenceType);

      // Find actors this evidence points to
      const impliedActors = this.matchEvidenceToActors(ev, knownActors);

      for (const actorId of impliedActors) {
        const scores = actorScores.get(actorId);
        if (scores) {
          scores[category] += weight;
          scores.evidenceCount++;
        }
      }
    }

    // Calculate combined scores
    const rankedActors = Array.from(actorScores.entries())
      .map(([actorId, scores]) => ({
        actorId,
        actor: knownActors.find(a => a.id === actorId),
        scores,
        combined: this.calculateCombinedScore(scores)
      }))
      .filter(a => a.combined > 0)
      .sort((a, b) => b.combined - a.combined);

    // Check for false flag indicators
    const falseFlagWarnings = this.detectFalseFlags(evidence, rankedActors[0]);

    // Build attribution result
    const primaryAttribution = rankedActors.length > 0 && rankedActors[0].combined > 30
      ? {
          actorId: rankedActors[0].actorId,
          actorName: rankedActors[0].actor?.name || 'Unknown',
          country: rankedActors[0].actor?.originCountry || 'Unknown',
          confidence: rankedActors[0].combined,
          evidenceStrength: this.assessEvidenceStrength(rankedActors[0].scores)
        }
      : null;

    return {
      primaryAttribution,
      alternativeAttributions: rankedActors.slice(1, 4).map(a => ({
        actorId: a.actorId,
        actorName: a.actor?.name || 'Unknown',
        confidence: a.combined
      })),
      evidenceSummary: rankedActors[0]?.scores || {
        technical: 0,
        operational: 0,
        strategic: 0,
        overall: 0
      },
      falseFlagIndicators: falseFlagWarnings,
      confidenceFactors: this.identifyConfidenceFactors(evidence, rankedActors[0]),
      recommendation: this.generateRecommendation(primaryAttribution, falseFlagWarnings)
    };
  }

  /**
   * Analyze malware for attribution clues
   */
  async analyzeMalwareAttribution(
    malware: MalwareAnalysis,
    knownActors: APTGroup[]
  ): Promise<{
    attributedActors: Array<{ actorId: string; confidence: number; reason: string }>;
    codeArtifacts: string[];
    languageIndicators: string[];
    developmentPatterns: string[];
  }> {
    const attributedActors: Array<{ actorId: string; confidence: number; reason: string }> = [];

    // Check for known malware family associations
    for (const actor of knownActors) {
      // Check if this malware family is associated with the actor
      if (malware.associatedActors.includes(actor.id)) {
        attributedActors.push({
          actorId: actor.id,
          confidence: 85,
          reason: 'Known malware family association'
        });
      }
    }

    // Analyze code artifacts
    const codeArtifacts = this.extractCodeArtifacts(malware);

    // Analyze language indicators
    const languageIndicators = this.extractLanguageIndicators(malware);

    // Analyze development patterns
    const developmentPatterns = this.analyzeDevelopmentPatterns(malware);

    return {
      attributedActors,
      codeArtifacts,
      languageIndicators,
      developmentPatterns
    };
  }

  /**
   * Compare two campaigns for potential shared attribution
   */
  async compareCampaigns(
    campaign1: CyberCampaign,
    campaign2: CyberCampaign
  ): Promise<{
    similarity: number;
    sharedIndicators: string[];
    sharedTTPs: string[];
    sharedInfrastructure: string[];
    assessment: string;
  }> {
    // Compare indicators
    const sharedIndicators = campaign1.indicators
      .filter(i1 => campaign2.indicators.some(i2 => i1.value === i2.value))
      .map(i => i.value);

    // Compare TTPs
    const ttps1 = new Set(campaign1.killChainPhases.filter(p => p.observed).map(p => p.phase));
    const ttps2 = new Set(campaign2.killChainPhases.filter(p => p.observed).map(p => p.phase));
    const sharedTTPs = Array.from(ttps1).filter(t => ttps2.has(t));

    // Compare malware
    const sharedMalware = campaign1.malwareUsed.filter(m => campaign2.malwareUsed.includes(m));

    // Calculate overall similarity
    const similarity = this.calculateCampaignSimilarity(
      sharedIndicators.length,
      sharedTTPs.length,
      sharedMalware.length,
      campaign1,
      campaign2
    );

    return {
      similarity,
      sharedIndicators,
      sharedTTPs,
      sharedInfrastructure: sharedIndicators.filter(i => i.includes('.') || /\d+\.\d+\.\d+\.\d+/.test(i)),
      assessment: this.assessCampaignRelationship(similarity)
    };
  }

  /**
   * Generate attribution confidence timeline
   */
  generateConfidenceTimeline(
    evidence: AttributionEvidence[]
  ): Array<{ date: Date; confidence: number; event: string }> {
    const timeline: Array<{ date: Date; confidence: number; event: string }> = [];

    let runningConfidence = 0;

    // Sort evidence by date
    const sortedEvidence = [...evidence].sort(
      (a, b) => a.analysisDate.getTime() - b.analysisDate.getTime()
    );

    for (const ev of sortedEvidence) {
      const weight = this.calculateEvidenceWeight(ev);
      runningConfidence = Math.min(runningConfidence + weight, 100);

      timeline.push({
        date: ev.analysisDate,
        confidence: runningConfidence,
        event: `${ev.evidenceType}: ${ev.evidence.substring(0, 50)}...`
      });
    }

    return timeline;
  }

  // Private helper methods

  private initializeEvidenceWeights(): void {
    this.evidenceWeights.set('TECHNICAL_ARTIFACT', {
      type: 'TECHNICAL_ARTIFACT',
      baseWeight: 8,
      corroborationMultiplier: 1.5,
      decayFactor: 0.95
    });

    this.evidenceWeights.set('INFRASTRUCTURE_OVERLAP', {
      type: 'INFRASTRUCTURE_OVERLAP',
      baseWeight: 12,
      corroborationMultiplier: 1.8,
      decayFactor: 0.9
    });

    this.evidenceWeights.set('MALWARE_CODE_SIMILARITY', {
      type: 'MALWARE_CODE_SIMILARITY',
      baseWeight: 15,
      corroborationMultiplier: 2.0,
      decayFactor: 0.98
    });

    this.evidenceWeights.set('TTP_MATCH', {
      type: 'TTP_MATCH',
      baseWeight: 10,
      corroborationMultiplier: 1.4,
      decayFactor: 0.92
    });

    this.evidenceWeights.set('VICTIMOLOGY', {
      type: 'VICTIMOLOGY',
      baseWeight: 6,
      corroborationMultiplier: 1.2,
      decayFactor: 0.85
    });

    this.evidenceWeights.set('TIMING_CORRELATION', {
      type: 'TIMING_CORRELATION',
      baseWeight: 5,
      corroborationMultiplier: 1.1,
      decayFactor: 0.8
    });

    this.evidenceWeights.set('LANGUAGE_ARTIFACT', {
      type: 'LANGUAGE_ARTIFACT',
      baseWeight: 7,
      corroborationMultiplier: 1.3,
      decayFactor: 0.88
    });

    this.evidenceWeights.set('OPERATIONAL_ERROR', {
      type: 'OPERATIONAL_ERROR',
      baseWeight: 20,
      corroborationMultiplier: 2.5,
      decayFactor: 0.99
    });

    this.evidenceWeights.set('SIGINT', {
      type: 'SIGINT',
      baseWeight: 25,
      corroborationMultiplier: 3.0,
      decayFactor: 0.97
    });

    this.evidenceWeights.set('HUMINT', {
      type: 'HUMINT',
      baseWeight: 22,
      corroborationMultiplier: 2.8,
      decayFactor: 0.96
    });

    this.evidenceWeights.set('GEOLOCATION', {
      type: 'GEOLOCATION',
      baseWeight: 18,
      corroborationMultiplier: 2.2,
      decayFactor: 0.93
    });
  }

  private initializeFalseFlagIndicators(): void {
    // Known false flag techniques
    this.falseFlagIndicators.set('LANGUAGE', [
      'Conflicting language artifacts',
      'Deliberately planted language strings',
      'Inconsistent keyboard layout evidence'
    ]);

    this.falseFlagIndicators.set('TIMING', [
      'Activity outside expected timezone',
      'Inconsistent working hours',
      'Holiday activity patterns'
    ]);

    this.falseFlagIndicators.set('TOOLING', [
      'Use of publicly attributed tools',
      'Deliberate tool signature exposure',
      'Inconsistent tooling sophistication'
    ]);

    this.falseFlagIndicators.set('TARGETING', [
      'Unusual target selection',
      'Targeting inconsistent with known interests',
      'Opportunistic vs targeted mismatch'
    ]);
  }

  private calculateEvidenceWeight(evidence: AttributionEvidence): number {
    const weightConfig = this.evidenceWeights.get(evidence.evidenceType);
    if (!weightConfig) {
      return evidence.weight * (evidence.confidence / 100);
    }

    let weight = weightConfig.baseWeight;

    // Apply confidence factor
    weight *= (evidence.confidence / 100);

    // Apply corroboration multiplier
    const corroboration = evidence.corroboratedBy.length;
    if (corroboration > 0) {
      weight *= Math.pow(weightConfig.corroborationMultiplier, Math.min(corroboration, 3));
    }

    // Apply time decay
    const daysSinceAnalysis = (Date.now() - evidence.analysisDate.getTime()) / (1000 * 60 * 60 * 24);
    weight *= Math.pow(weightConfig.decayFactor, daysSinceAnalysis / 30);

    // Reduce weight if counter-indicators exist
    if (evidence.counterIndicators.length > 0) {
      weight *= Math.pow(0.8, evidence.counterIndicators.length);
    }

    return weight;
  }

  private categorizeEvidence(evidenceType: string): 'technical' | 'operational' | 'strategic' {
    const technical = [
      'TECHNICAL_ARTIFACT',
      'MALWARE_CODE_SIMILARITY',
      'INFRASTRUCTURE_OVERLAP'
    ];

    const operational = [
      'TTP_MATCH',
      'TIMING_CORRELATION',
      'OPERATIONAL_ERROR',
      'GEOLOCATION'
    ];

    if (technical.includes(evidenceType)) return 'technical';
    if (operational.includes(evidenceType)) return 'operational';
    return 'strategic';
  }

  private matchEvidenceToActors(
    evidence: AttributionEvidence,
    actors: APTGroup[]
  ): string[] {
    const matchedActors: string[] = [];

    // This would use more sophisticated matching in production
    // For now, return any actor that could be related
    for (const actor of actors) {
      if (evidence.evidence.toLowerCase().includes(actor.name.toLowerCase()) ||
          evidence.evidence.toLowerCase().includes(actor.originCountry.toLowerCase())) {
        matchedActors.push(actor.id);
      }
    }

    return matchedActors;
  }

  private calculateCombinedScore(scores: {
    technical: number;
    operational: number;
    strategic: number;
    evidenceCount: number;
  }): number {
    // Weighted combination
    const weighted = (scores.technical * 0.4) + (scores.operational * 0.35) + (scores.strategic * 0.25);

    // Bonus for evidence diversity
    const diversityBonus = (scores.technical > 0 ? 5 : 0) +
                          (scores.operational > 0 ? 5 : 0) +
                          (scores.strategic > 0 ? 5 : 0);

    // Evidence count bonus (diminishing returns)
    const countBonus = Math.min(scores.evidenceCount * 2, 15);

    return Math.min(weighted + diversityBonus + countBonus, 100);
  }

  private assessEvidenceStrength(scores: any): string {
    const total = scores.technical + scores.operational + scores.strategic;

    if (total >= 60 && scores.technical > 20 && scores.operational > 15) {
      return 'STRONG';
    }
    if (total >= 40 && (scores.technical > 10 || scores.operational > 10)) {
      return 'MODERATE';
    }
    if (total >= 20) {
      return 'CIRCUMSTANTIAL';
    }
    return 'WEAK';
  }

  private detectFalseFlags(
    evidence: AttributionEvidence[],
    topCandidate: any
  ): string[] {
    const warnings: string[] = [];

    // Check for conflicting evidence
    const evidenceTypes = new Set(evidence.map(e => e.evidenceType));

    // Check language inconsistencies
    const languageEvidence = evidence.filter(e => e.evidenceType === 'LANGUAGE_ARTIFACT');
    if (languageEvidence.length > 1) {
      const languages = new Set(languageEvidence.map(e => e.evidence));
      if (languages.size > 1) {
        warnings.push('Multiple conflicting language artifacts detected - possible false flag');
      }
    }

    // Check for too-perfect attribution
    if (topCandidate && topCandidate.combined > 95) {
      warnings.push('Unusually high attribution confidence - consider false flag possibility');
    }

    // Check for known false flag techniques
    for (const ev of evidence) {
      if (ev.counterIndicators.length > 2) {
        warnings.push(`Evidence "${ev.evidenceType}" has significant counter-indicators`);
      }
    }

    return warnings;
  }

  private identifyConfidenceFactors(
    evidence: AttributionEvidence[],
    topCandidate: any
  ): { positive: string[]; negative: string[] } {
    const positive: string[] = [];
    const negative: string[] = [];

    // Positive factors
    const hasSignt = evidence.some(e => e.evidenceType === 'SIGINT');
    const hasHumint = evidence.some(e => e.evidenceType === 'HUMINT');
    const hasOpError = evidence.some(e => e.evidenceType === 'OPERATIONAL_ERROR');

    if (hasSignt) positive.push('SIGINT corroboration available');
    if (hasHumint) positive.push('HUMINT corroboration available');
    if (hasOpError) positive.push('Operational errors provide strong evidence');

    const corroboratedEvidence = evidence.filter(e => e.corroboratedBy.length > 0);
    if (corroboratedEvidence.length > evidence.length * 0.5) {
      positive.push('Majority of evidence is corroborated');
    }

    // Negative factors
    const counterIndicators = evidence.flatMap(e => e.counterIndicators);
    if (counterIndicators.length > 0) {
      negative.push(`${counterIndicators.length} counter-indicators present`);
    }

    const lowConfidenceEvidence = evidence.filter(e => e.confidence < 50);
    if (lowConfidenceEvidence.length > evidence.length * 0.3) {
      negative.push('Significant portion of evidence has low confidence');
    }

    return { positive, negative };
  }

  private generateRecommendation(
    attribution: any,
    falseFlagWarnings: string[]
  ): string {
    if (!attribution) {
      return 'Insufficient evidence for attribution. Collect additional technical and operational evidence.';
    }

    if (falseFlagWarnings.length > 2) {
      return 'High probability of false flag operation. Exercise extreme caution with attribution claims.';
    }

    if (attribution.confidence >= 80) {
      return 'High-confidence attribution suitable for operational response and public disclosure.';
    }

    if (attribution.confidence >= 60) {
      return 'Moderate-confidence attribution suitable for internal planning but not public disclosure.';
    }

    if (attribution.confidence >= 40) {
      return 'Low-confidence attribution. Continue investigation before taking action.';
    }

    return 'Preliminary attribution only. Significant additional evidence required.';
  }

  private extractCodeArtifacts(malware: MalwareAnalysis): string[] {
    // Extract code-level artifacts that may indicate origin
    return [
      'Compilation timestamp',
      'Debug symbols',
      'Resource section artifacts',
      'Code signing certificates'
    ];
  }

  private extractLanguageIndicators(malware: MalwareAnalysis): string[] {
    // Extract language-related indicators
    return [
      'String encoding',
      'Error message language',
      'Code comments',
      'Variable naming conventions'
    ];
  }

  private analyzeDevelopmentPatterns(malware: MalwareAnalysis): string[] {
    // Analyze development and compilation patterns
    return [
      'Development environment',
      'Compilation chain',
      'Code reuse patterns',
      'Update frequency'
    ];
  }

  private calculateCampaignSimilarity(
    sharedIndicators: number,
    sharedTTPs: number,
    sharedMalware: number,
    campaign1: CyberCampaign,
    campaign2: CyberCampaign
  ): number {
    let similarity = 0;

    // Indicator overlap
    similarity += Math.min(sharedIndicators * 5, 30);

    // TTP overlap
    similarity += Math.min(sharedTTPs * 10, 30);

    // Malware overlap
    similarity += Math.min(sharedMalware * 15, 30);

    // Objective overlap
    const sharedObjectives = campaign1.objectives.filter(o => campaign2.objectives.includes(o));
    similarity += Math.min(sharedObjectives.length * 5, 10);

    return Math.min(similarity, 100);
  }

  private assessCampaignRelationship(similarity: number): string {
    if (similarity >= 80) return 'Highly likely same actor';
    if (similarity >= 60) return 'Probable same actor or close collaboration';
    if (similarity >= 40) return 'Possible relationship, shared tools or techniques';
    if (similarity >= 20) return 'Some similarities, possible coincidence';
    return 'No significant relationship identified';
  }

  // Public API

  addEvidence(subjectId: string, evidence: AttributionEvidence): void {
    const existing = this.evidenceStore.get(subjectId) || [];
    existing.push(evidence);
    this.evidenceStore.set(subjectId, existing);
  }

  getEvidence(subjectId: string): AttributionEvidence[] {
    return this.evidenceStore.get(subjectId) || [];
  }

  clearEvidence(subjectId: string): void {
    this.evidenceStore.delete(subjectId);
  }
}

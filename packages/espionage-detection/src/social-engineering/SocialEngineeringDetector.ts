/**
 * Social Engineering Detection System
 *
 * Detects and analyzes social engineering attacks and elicitation attempts
 */

import type {
  SocialEngineeringAttack,
  ElicitationAttempt,
  EspionageThreatLevel
} from '../types.js';

export interface ElicitationIndicator {
  technique: string;
  confidence: number;
  keywords: string[];
  context: string;
}

export class SocialEngineeringDetector {
  private knownTechniques: Map<string, any> = new Map();
  private targetProfiles: Map<string, any> = new Map();

  constructor() {
    this.initializeKnownTechniques();
  }

  /**
   * Analyze communication for elicitation attempts
   */
  async analyzeForElicitation(
    targetId: string,
    communication: any
  ): Promise<ElicitationAttempt | null> {
    const indicators = this.detectElicitationIndicators(communication);

    if (indicators.length === 0) {
      return null;
    }

    // Calculate overall confidence
    const confidence = indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;

    if (confidence > 0.6) {
      return {
        id: crypto.randomUUID(),
        timestamp: new Date(communication.timestamp),
        targetId,
        elicitorProfile: {
          name: communication.sender?.name,
          organization: communication.sender?.organization,
          nationality: communication.sender?.nationality,
          cover: this.identifyCover(communication.sender)
        },
        method: this.identifyElicitationMethod(indicators) as any,
        topic: communication.topic || 'Unknown',
        sensitiveInfoSought: this.extractSensitiveTopics(communication),
        informationDisclosed: false,
        reported: false,
        threatLevel: this.calculateThreatLevel(confidence, indicators)
      };
    }

    return null;
  }

  /**
   * Detect social engineering attack
   */
  async detectSocialEngineeringAttack(
    targetId: string,
    incident: any
  ): Promise<SocialEngineeringAttack | null> {
    const attackVector = this.identifyAttackVector(incident);

    if (!attackVector) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      timestamp: new Date(incident.timestamp),
      targetId,
      attackVector: attackVector as any,
      attackerProfile: {
        identityUsed: incident.attacker?.identity || 'Unknown',
        organization: incident.attacker?.organization,
        contactMethod: incident.contactMethod
      },
      objective: this.identifyObjective(incident),
      successful: incident.successful || false,
      dataCompromised: incident.dataCompromised,
      mitigationApplied: incident.mitigation
    };
  }

  /**
   * Detect elicitation indicators in communication
   */
  private detectElicitationIndicators(communication: any): ElicitationIndicator[] {
    const indicators: ElicitationIndicator[] = [];
    const content = communication.content?.toLowerCase() || '';

    // Check for flattery
    if (this.containsFlattery(content)) {
      indicators.push({
        technique: 'FLATTERY',
        confidence: 0.7,
        keywords: this.extractFlatteryKeywords(content),
        context: 'Excessive praise or compliments'
      });
    }

    // Check for assumed knowledge
    if (this.containsAssumedKnowledge(content)) {
      indicators.push({
        technique: 'ASSUMED_KNOWLEDGE',
        confidence: 0.8,
        keywords: [],
        context: 'Pretending to already know information'
      });
    }

    // Check for quid pro quo
    if (this.containsQuidProQuo(content)) {
      indicators.push({
        technique: 'QUID_PRO_QUO',
        confidence: 0.9,
        keywords: [],
        context: 'Offering something in exchange for information'
      });
    }

    // Check for bracketing
    if (this.containsBracketing(content)) {
      indicators.push({
        technique: 'BRACKETING',
        confidence: 0.75,
        keywords: [],
        context: 'Using ranges to elicit specific information'
      });
    }

    return indicators;
  }

  /**
   * Identify attack vector
   */
  private identifyAttackVector(incident: any): string | null {
    const indicators = incident.indicators || {};

    if (indicators.email && indicators.spoofed) return 'SPEAR_PHISHING';
    if (indicators.email) return 'PHISHING';
    if (indicators.phone && indicators.voiceCall) return 'VISHING';
    if (indicators.sms) return 'SMISHING';
    if (indicators.impersonation) return 'IMPERSONATION';
    if (indicators.physicalAccess) return 'TAILGATING';
    if (indicators.pretext) return 'PRETEXTING';
    if (indicators.bait) return 'BAITING';

    return null;
  }

  /**
   * Identify elicitation method
   */
  private identifyElicitationMethod(indicators: ElicitationIndicator[]): string {
    if (indicators.length === 0) return 'CASUAL_CONVERSATION';

    // Return the technique with highest confidence
    const sorted = indicators.sort((a, b) => b.confidence - a.confidence);
    return sorted[0].technique;
  }

  /**
   * Calculate threat level
   */
  private calculateThreatLevel(
    confidence: number,
    indicators: ElicitationIndicator[]
  ): EspionageThreatLevel {
    const avgConfidence = confidence * 100;

    if (avgConfidence >= 90 || indicators.length >= 4) return 'CRITICAL';
    if (avgConfidence >= 75 || indicators.length >= 3) return 'HIGH';
    if (avgConfidence >= 60 || indicators.length >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Helper methods for detection
   */

  private containsFlattery(content: string): boolean {
    const flatteryPhrases = [
      'impressive', 'amazing', 'brilliant', 'talented',
      'expert', 'leader', 'outstanding', 'exceptional'
    ];
    return flatteryPhrases.some(phrase => content.includes(phrase));
  }

  private containsAssumedKnowledge(content: string): boolean {
    const assumptionPhrases = [
      'as you know', 'i heard that', 'everyone knows',
      'it\'s common knowledge', 'i already know'
    ];
    return assumptionPhrases.some(phrase => content.includes(phrase));
  }

  private containsQuidProQuo(content: string): boolean {
    const quidProQuoPhrases = [
      'in exchange for', 'if you tell me', 'i\'ll share',
      'trade information', 'mutual benefit'
    ];
    return quidProQuoPhrases.some(phrase => content.includes(phrase));
  }

  private containsBracketing(content: string): boolean {
    const bracketingPattern = /between \d+ and \d+|is it more than|less than/i;
    return bracketingPattern.test(content);
  }

  private extractFlatteryKeywords(content: string): string[] {
    return ['flattery'];
  }

  private identifyCover(sender: any): string {
    return sender?.coverStory || 'Unknown';
  }

  private extractSensitiveTopics(communication: any): string[] {
    const sensitiveKeywords = [
      'classified', 'secret', 'confidential', 'restricted',
      'proprietary', 'internal', 'security', 'access'
    ];

    const content = communication.content?.toLowerCase() || '';
    return sensitiveKeywords.filter(keyword => content.includes(keyword));
  }

  private identifyObjective(incident: any): string {
    return incident.objective || 'Information gathering';
  }

  /**
   * Initialize known social engineering techniques
   */
  private initializeKnownTechniques(): void {
    this.knownTechniques.set('FLATTERY', {
      description: 'Using praise to build rapport and lower defenses',
      indicators: ['excessive compliments', 'insincere praise']
    });

    this.knownTechniques.set('ASSUMED_KNOWLEDGE', {
      description: 'Pretending to already know information',
      indicators: ['claims of insider knowledge', 'false familiarity']
    });

    this.knownTechniques.set('QUID_PRO_QUO', {
      description: 'Offering exchange for information',
      indicators: ['reciprocal offers', 'trading information']
    });
  }

  /**
   * Add target profile for enhanced detection
   */
  addTargetProfile(targetId: string, profile: any): void {
    this.targetProfiles.set(targetId, profile);
  }

  /**
   * Get target's sensitivity level
   */
  getTargetSensitivity(targetId: string): string {
    const profile = this.targetProfiles.get(targetId);
    return profile?.sensitivityLevel || 'MEDIUM';
  }
}

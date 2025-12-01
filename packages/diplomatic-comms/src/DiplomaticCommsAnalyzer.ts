import {
  DiplomaticCommunication,
  CommunicationType,
  Tone,
  Sentiment,
  Signal,
  CommunicationPattern,
  NarrativeTracking,
  RhetoricalAnalysis,
  ComparativeAnalysis,
  SignalDetection,
  PatternShift,
  MessagingStrategy
} from './types.js';

/**
 * DiplomaticCommsAnalyzer
 *
 * Analyze diplomatic communications, statements, cables, and messaging strategies
 */
export class DiplomaticCommsAnalyzer {
  private communications: Map<string, DiplomaticCommunication> = new Map();
  private communicationsByCountry: Map<string, Set<string>> = new Map();
  private communicationsByType: Map<CommunicationType, Set<string>> = new Map();
  private narratives: Map<string, NarrativeTracking> = new Map();
  private patterns: Map<string, CommunicationPattern> = new Map();

  /**
   * Track a diplomatic communication
   */
  trackCommunication(comm: DiplomaticCommunication): void {
    this.communications.set(comm.id, comm);

    // Index by country
    const country = comm.sender.country || comm.sender.name;
    if (!this.communicationsByCountry.has(country)) {
      this.communicationsByCountry.set(country, new Set());
    }
    this.communicationsByCountry.get(country)!.add(comm.id);

    // Index by type
    if (!this.communicationsByType.has(comm.type)) {
      this.communicationsByType.set(comm.type, new Set());
    }
    this.communicationsByType.get(comm.type)!.add(comm.id);

    // Update patterns
    this.updateCommunicationPattern(comm);

    // Track in narratives
    if (comm.partOfNarrative) {
      this.addToNarrative(comm.partOfNarrative, comm.id);
    }
  }

  /**
   * Get communication by ID
   */
  getCommunication(id: string): DiplomaticCommunication | undefined {
    return this.communications.get(id);
  }

  /**
   * Get communications by country
   */
  getCommunicationsByCountry(country: string): DiplomaticCommunication[] {
    const commIds = this.communicationsByCountry.get(country) || new Set();
    return Array.from(commIds)
      .map(id => this.communications.get(id))
      .filter((c): c is DiplomaticCommunication => c !== undefined);
  }

  /**
   * Get communications by type
   */
  getCommunicationsByType(type: CommunicationType): DiplomaticCommunication[] {
    const commIds = this.communicationsByType.get(type) || new Set();
    return Array.from(commIds)
      .map(id => this.communications.get(id))
      .filter((c): c is DiplomaticCommunication => c !== undefined);
  }

  /**
   * Analyze sentiment trends
   */
  analyzeSentimentTrends(country: string, days: number = 90): {
    averageSentiment: number;
    trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
    sentimentByPeriod: { period: string; sentiment: number }[];
    mostPositive: DiplomaticCommunication[];
    mostNegative: DiplomaticCommunication[];
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const communications = this.getCommunicationsByCountry(country)
      .filter(c => c.date >= cutoffDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (communications.length === 0) {
      return {
        averageSentiment: 0,
        trend: 'STABLE',
        sentimentByPeriod: [],
        mostPositive: [],
        mostNegative: []
      };
    }

    // Calculate average sentiment
    const avgSentiment = communications.reduce((sum, c) => sum + c.sentimentScore, 0) / communications.length;

    // Calculate trend (first half vs second half)
    const midpoint = Math.floor(communications.length / 2);
    const firstHalf = communications.slice(0, midpoint);
    const secondHalf = communications.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, c) => sum + c.sentimentScore, 0) / (firstHalf.length || 1);
    const secondAvg = secondHalf.reduce((sum, c) => sum + c.sentimentScore, 0) / (secondHalf.length || 1);

    let trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING' = 'STABLE';
    if (secondAvg > firstAvg + 0.15) trend = 'IMPROVING';
    else if (secondAvg < firstAvg - 0.15) trend = 'DETERIORATING';

    // Group by periods (weeks)
    const sentimentByPeriod: { period: string; sentiment: number }[] = [];
    const periodSize = Math.max(1, Math.floor(days / 10)); // ~10 periods

    for (let i = 0; i < 10; i++) {
      const periodStart = new Date(cutoffDate);
      periodStart.setDate(periodStart.getDate() + i * periodSize);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + periodSize);

      const periodComms = communications.filter(
        c => c.date >= periodStart && c.date < periodEnd
      );

      if (periodComms.length > 0) {
        const periodSentiment = periodComms.reduce((sum, c) => sum + c.sentimentScore, 0) / periodComms.length;
        sentimentByPeriod.push({
          period: `${periodStart.toISOString().split('T')[0]}`,
          sentiment: periodSentiment
        });
      }
    }

    // Get most positive and negative
    const sorted = [...communications].sort((a, b) => b.sentimentScore - a.sentimentScore);
    const mostPositive = sorted.slice(0, 5);
    const mostNegative = sorted.slice(-5).reverse();

    return {
      averageSentiment: avgSentiment,
      trend,
      sentimentByPeriod,
      mostPositive,
      mostNegative
    };
  }

  /**
   * Detect signals in communications
   */
  detectSignals(communication: DiplomaticCommunication): SignalDetection[] {
    const detections: SignalDetection[] = [];

    for (const signal of communication.signals) {
      const evidencePoints: string[] = [];

      // Analyze tone for evidence
      if (signal.type === 'WARNING' && communication.tone === Tone.WARNING) {
        evidencePoints.push('Warning tone detected in communication');
      }

      if (signal.type === 'THREAT' && communication.tone === Tone.THREATENING) {
        evidencePoints.push('Threatening language used');
      }

      // Analyze content for specific phrases
      const warningPhrases = ['serious consequences', 'will not tolerate', 'red line', 'last chance'];
      const reassurancePhrases = ['committed to', 'peaceful resolution', 'open to dialogue', 'constructive'];

      for (const phrase of warningPhrases) {
        if (communication.content.toLowerCase().includes(phrase)) {
          evidencePoints.push(`Warning phrase detected: "${phrase}"`);
        }
      }

      for (const phrase of reassurancePhrases) {
        if (communication.content.toLowerCase().includes(phrase)) {
          evidencePoints.push(`Reassurance phrase detected: "${phrase}"`);
        }
      }

      // Check for policy shift indicators
      if (signal.type === 'POLICY_SHIFT') {
        if (communication.content.toLowerCase().includes('new approach') ||
            communication.content.toLowerCase().includes('change in policy')) {
          evidencePoints.push('Explicit policy change language detected');
        }
      }

      // Contextual factors
      const contextualFactors = [
        communication.context.geopoliticalSituation,
        ...communication.context.recentEvents || []
      ];

      // Calculate predictive value
      let predictiveValue = signal.strength * signal.clarity;
      if (evidencePoints.length > 3) predictiveValue *= 1.2;
      predictiveValue = Math.min(100, predictiveValue);

      // Actionable implications
      const actionableImplications = this.generateActionableImplications(signal, communication);

      detections.push({
        signal,
        evidencePoints,
        contextualFactors,
        predictiveValue,
        actionableImplications
      });
    }

    return detections;
  }

  /**
   * Analyze messaging strategy
   */
  analyzeMessagingStrategy(country: string, days: number = 30): MessagingStrategy {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const communications = this.getCommunicationsByCountry(country)
      .filter(c => c.date >= cutoffDate);

    // Determine approach
    const directCount = communications.filter(c =>
      c.linguisticFeatures.directness > 70
    ).length;

    const ambiguousCount = communications.filter(c =>
      c.linguisticFeatures.directness < 40
    ).length;

    let approach: 'DIRECT' | 'INDIRECT' | 'AMBIGUOUS' | 'LAYERED' | 'COORDINATED' = 'DIRECT';
    if (ambiguousCount > communications.length / 2) approach = 'AMBIGUOUS';
    else if (directCount < communications.length / 3) approach = 'INDIRECT';

    // Extract objectives
    const allObjectives = communications
      .flatMap(c => c.intent.objectives)
      .filter(Boolean);

    const objectiveCounts = new Map<string, number>();
    for (const obj of allObjectives) {
      objectiveCounts.set(obj, (objectiveCounts.get(obj) || 0) + 1);
    }

    const objectives = Array.from(objectiveCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([obj]) => obj);

    // Target audiences
    const audienceSet = new Set<string>();
    communications.forEach(c => {
      if (c.targetAudience) {
        c.targetAudience.forEach(a => audienceSet.add(a));
      }
    });
    const targetAudiences = Array.from(audienceSet);

    // Tactics
    const tactics = Array.from(new Set(
      communications.flatMap(c => c.intent.tacticUsed).filter(Boolean) as string[]
    ));

    // Check for coordination
    const coordination = this.detectCoordination(communications);

    // Calculate consistency
    const themes = communications.flatMap(c => c.themes.map(t => t.name));
    const themeCounts = new Map<string, number>();
    themes.forEach(t => themeCounts.set(t, (themeCounts.get(t) || 0) + 1));
    const maxThemeCount = Math.max(...Array.from(themeCounts.values()), 1);
    const consistency = (maxThemeCount / communications.length) * 100;

    // Estimate effectiveness (based on media pickup, reactions, etc.)
    let effectiveness = 50; // Base
    const avgMediaPickup = communications.reduce((sum, c) =>
      sum + (c.mediaPickup?.length || 0), 0
    ) / communications.length;
    if (avgMediaPickup > 10) effectiveness += 20;
    else if (avgMediaPickup > 5) effectiveness += 10;

    return {
      approach,
      objectives,
      targetAudiences,
      tactics,
      coordination,
      consistency,
      effectiveness: Math.min(100, effectiveness)
    };
  }

  /**
   * Track narrative
   */
  trackNarrative(narrative: NarrativeTracking): void {
    this.narratives.set(narrative.id, narrative);
  }

  /**
   * Get narrative
   */
  getNarrative(id: string): NarrativeTracking | undefined {
    return this.narratives.get(id);
  }

  /**
   * Analyze narrative adoption
   */
  analyzeNarrativeAdoption(narrativeId: string): {
    narrative: NarrativeTracking | undefined;
    totalAdopters: number;
    fullAdoption: number;
    partialAdoption: number;
    rejection: number;
    dominantRegions: string[];
    counterNarrativeStrength: number;
  } {
    const narrative = this.narratives.get(narrativeId);
    if (!narrative) {
      return {
        narrative: undefined,
        totalAdopters: 0,
        fullAdoption: 0,
        partialAdoption: 0,
        rejection: 0,
        dominantRegions: [],
        counterNarrativeStrength: 0
      };
    }

    let fullAdoption = 0;
    let partialAdoption = 0;
    let rejection = 0;

    for (const adoption of narrative.adoption) {
      if (adoption.level === 'FULL') fullAdoption++;
      else if (adoption.level === 'PARTIAL' || adoption.level === 'ADAPTED') partialAdoption++;
      else if (adoption.level === 'REJECTED') rejection++;
    }

    // Calculate counter-narrative strength
    const counterNarrativeStrength = narrative.counterNarratives
      ? narrative.counterNarratives.reduce((sum, cn) => sum + cn.strength, 0) / narrative.counterNarratives.length
      : 0;

    return {
      narrative,
      totalAdopters: narrative.adoption.length,
      fullAdoption,
      partialAdoption,
      rejection,
      dominantRegions: [], // Would need region data
      counterNarrativeStrength
    };
  }

  /**
   * Compare communications
   */
  compareCommunications(commIds: string[]): ComparativeAnalysis {
    const communications = commIds
      .map(id => this.communications.get(id))
      .filter((c): c is DiplomaticCommunication => c !== undefined);

    // Find common themes
    const allThemes = communications.flatMap(c => c.themes.map(t => t.name));
    const themeCounts = new Map<string, number>();
    allThemes.forEach(t => themeCounts.set(t, (themeCounts.get(t) || 0) + 1));

    const commonThemes = Array.from(themeCounts.entries())
      .filter(([_, count]) => count >= communications.length / 2)
      .map(([theme]) => theme);

    // Find divergences
    const divergences: { aspect: string; differences: string[]; significance: number }[] = [];

    // Compare tones
    const tones = new Set(communications.map(c => c.tone));
    if (tones.size > 1) {
      divergences.push({
        aspect: 'Tone',
        differences: Array.from(tones),
        significance: 7
      });
    }

    // Compare sentiments
    const sentiments = communications.map(c => c.sentimentScore);
    const sentimentRange = Math.max(...sentiments) - Math.min(...sentiments);
    if (sentimentRange > 0.5) {
      divergences.push({
        aspect: 'Sentiment',
        differences: [`Range: ${sentimentRange.toFixed(2)}`],
        significance: 8
      });
    }

    // Calculate consistency
    const avgThemeOverlap = communications.length > 1
      ? (commonThemes.length / allThemes.length) * 100
      : 100;
    const consistencyScore = Math.min(100, avgThemeOverlap * 1.5);

    // Check for contradictions
    const contradictions: string[] = [];
    for (let i = 0; i < communications.length; i++) {
      for (let j = i + 1; j < communications.length; j++) {
        const comm1 = communications[i];
        const comm2 = communications[j];

        // Check for opposite sentiments on same topic
        const sharedTopics = comm1.topics.filter(t => comm2.topics.includes(t));
        for (const topic of sharedTopics) {
          if (Math.abs(comm1.sentimentScore - comm2.sentimentScore) > 0.7) {
            contradictions.push(`Contradictory positions on "${topic}"`);
          }
        }
      }
    }

    // Calculate complementarity
    const uniqueTopics = new Set(communications.flatMap(c => c.topics));
    const complementarity = (uniqueTopics.size / (communications.length * 3)) * 100; // Assuming avg 3 topics per comm

    return {
      communications,
      commonThemes,
      divergences,
      consistencyScore,
      contradictions: contradictions.length > 0 ? contradictions : undefined,
      complementarity
    };
  }

  /**
   * Perform rhetorical analysis
   */
  performRhetoricalAnalysis(commId: string): RhetoricalAnalysis {
    const comm = this.communications.get(commId);
    if (!comm) {
      return {
        communication: commId,
        devices: [],
        persuasiveTechniques: [],
        logicalStructure: 'Unknown',
        emotionalAppeals: [],
        credibilityMarkers: [],
        weaknesses: ['Communication not found']
      };
    }

    // Detect rhetorical devices
    const devices: RhetoricalAnalysis['devices'] = [];

    if (comm.rhetoricalDevices) {
      for (const device of comm.rhetoricalDevices) {
        devices.push({
          type: device,
          examples: [],
          purpose: this.explainRhetoricalDevice(device),
          effectiveness: 70
        });
      }
    }

    // Identify persuasive techniques
    const persuasiveTechniques: string[] = [];
    if (comm.linguisticFeatures.emotionality > 60) {
      persuasiveTechniques.push('Emotional appeal (pathos)');
    }
    if (comm.sender.title && comm.sender.title.includes('President')) {
      persuasiveTechniques.push('Authority appeal (ethos)');
    }
    if (comm.content.includes('evidence') || comm.content.includes('fact')) {
      persuasiveTechniques.push('Logical appeal (logos)');
    }

    // Analyze logical structure
    let logicalStructure = 'Deductive reasoning';
    if (comm.content.includes('therefore') || comm.content.includes('thus')) {
      logicalStructure = 'Deductive reasoning with clear conclusions';
    } else if (comm.content.includes('for example') || comm.content.includes('evidence shows')) {
      logicalStructure = 'Inductive reasoning from examples';
    }

    // Emotional appeals
    const emotionalAppeals: string[] = [];
    if (comm.emotion) {
      emotionalAppeals.push(comm.emotion.primary);
      if (comm.emotion.secondary) {
        emotionalAppeals.push(...comm.emotion.secondary);
      }
    }

    // Credibility markers
    const credibilityMarkers = [
      comm.source.type,
      comm.verified ? 'Verified source' : 'Unverified source',
      `Confidence: ${Math.round(comm.confidence * 100)}%`
    ];

    // Weaknesses
    const weaknesses: string[] = [];
    if (comm.linguisticFeatures.clarity < 50) {
      weaknesses.push('Lack of clarity in messaging');
    }
    if (comm.confidence < 0.7) {
      weaknesses.push('Low confidence in content accuracy');
    }
    if (comm.linguisticFeatures.directness < 40) {
      weaknesses.push('Overly ambiguous or indirect language');
    }

    return {
      communication: commId,
      devices,
      persuasiveTechniques,
      logicalStructure,
      emotionalAppeals,
      credibilityMarkers,
      weaknesses: weaknesses.length > 0 ? weaknesses : undefined
    };
  }

  /**
   * Detect pattern shifts
   */
  detectPatternShifts(country: string): PatternShift[] {
    const pattern = this.patterns.get(country);
    return pattern?.shifts || [];
  }

  private updateCommunicationPattern(comm: DiplomaticCommunication): void {
    const country = comm.sender.country || comm.sender.name;
    let pattern = this.patterns.get(country);

    if (!pattern) {
      pattern = {
        country,
        period: { start: comm.date, end: comm.date },
        totalCommunications: 0,
        byType: {} as Record<CommunicationType, number>,
        averageTone: comm.tone,
        averageSentiment: comm.sentimentScore,
        topTopics: [],
        topTargets: [],
        messagingConsistency: 100,
        strategicThemes: [],
        shifts: []
      };
    }

    // Update pattern
    pattern.totalCommunications++;
    pattern.byType[comm.type] = (pattern.byType[comm.type] || 0) + 1;
    pattern.period.end = comm.date;

    this.patterns.set(country, pattern);
  }

  private addToNarrative(narrativeId: string, commId: string): void {
    const narrative = this.narratives.get(narrativeId);
    if (narrative) {
      narrative.communications.push(commId);
    }
  }

  private detectCoordination(communications: DiplomaticCommunication[]): any {
    // Check for coordinated messaging
    const timeDiffs: number[] = [];
    for (let i = 1; i < communications.length; i++) {
      const diff = communications[i].date.getTime() - communications[i - 1].date.getTime();
      timeDiffs.push(diff);
    }

    const avgTimeDiff = timeDiffs.reduce((sum, d) => sum + d, 0) / (timeDiffs.length || 1);
    const oneDay = 24 * 60 * 60 * 1000;

    if (avgTimeDiff < oneDay) {
      return {
        coordinatedWith: [],
        timing: 'SIMULTANEOUS' as const,
        messageAlignment: 80,
        evidenceOfCoordination: ['Closely timed releases', 'Similar messaging']
      };
    }

    return undefined;
  }

  private generateActionableImplications(signal: Signal, comm: DiplomaticCommunication): string[] {
    const implications: string[] = [];

    if (signal.type === 'WARNING' || signal.type === 'THREAT') {
      implications.push('Monitor for follow-up actions or escalation');
      implications.push('Assess credibility and capability to follow through');
      implications.push('Consider diplomatic response options');
    }

    if (signal.type === 'POLICY_SHIFT') {
      implications.push('Analyze implications for bilateral relations');
      implications.push('Identify opportunities or risks from policy change');
      implications.push('Update strategic assessments');
    }

    if (signal.type === 'REASSURANCE') {
      implications.push('Verify with concrete actions or commitments');
      implications.push('Monitor for consistency in future communications');
    }

    return implications;
  }

  private explainRhetoricalDevice(device: string): string {
    const explanations: Record<string, string> = {
      'metaphor': 'Creates vivid comparisons to enhance understanding',
      'repetition': 'Emphasizes key points through repetition',
      'rhetorical question': 'Engages audience and emphasizes points',
      'analogy': 'Explains complex ideas through familiar comparisons',
      'allusion': 'References shared cultural or historical knowledge'
    };

    return explanations[device.toLowerCase()] || 'Enhances persuasive impact';
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalCommunications: number;
    byType: Record<string, number>;
    averageSentiment: number;
    mostActiveCountries: string[];
  } {
    const byType: Record<string, number> = {};
    let totalSentiment = 0;

    for (const comm of this.communications.values()) {
      byType[comm.type] = (byType[comm.type] || 0) + 1;
      totalSentiment += comm.sentimentScore;
    }

    const countryCounts = new Map<string, number>();
    for (const [country, commIds] of this.communicationsByCountry.entries()) {
      countryCounts.set(country, commIds.size);
    }

    const mostActive = Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country]) => country);

    return {
      totalCommunications: this.communications.size,
      byType,
      averageSentiment: this.communications.size > 0 ? totalSentiment / this.communications.size : 0,
      mostActiveCountries: mostActive
    };
  }
}

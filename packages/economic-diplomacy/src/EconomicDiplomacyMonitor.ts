import {
  TradeNegotiation,
  NegotiationType,
  NegotiationPhase,
  EconomicPartnership,
  PartnershipType,
  SanctionRegime,
  InvestmentTreaty,
  TradeDispute,
  TradeRelationship,
  EconomicCoercion,
  StickingPoint,
  CriticalIssue
} from './types.js';

/**
 * EconomicDiplomacyMonitor
 *
 * Monitor trade negotiations, economic partnerships, sanctions,
 * and all aspects of economic diplomacy and statecraft
 */
export class EconomicDiplomacyMonitor {
  private negotiations: Map<string, TradeNegotiation> = new Map();
  private negotiationsByType: Map<NegotiationType, Set<string>> = new Map();
  private negotiationsByPhase: Map<NegotiationPhase, Set<string>> = new Map();
  private partnerships: Map<string, EconomicPartnership> = new Map();
  private sanctions: Map<string, SanctionRegime> = new Map();
  private treaties: Map<string, InvestmentTreaty> = new Map();
  private disputes: Map<string, TradeDispute> = new Map();
  private relationships: Map<string, TradeRelationship> = new Map();
  private coercion: Map<string, EconomicCoercion> = new Map();

  /**
   * Track a trade negotiation
   */
  trackNegotiation(negotiation: TradeNegotiation): void {
    this.negotiations.set(negotiation.id, negotiation);

    // Index by type
    if (!this.negotiationsByType.has(negotiation.type)) {
      this.negotiationsByType.set(negotiation.type, new Set());
    }
    this.negotiationsByType.get(negotiation.type)!.add(negotiation.id);

    // Index by phase
    if (!this.negotiationsByPhase.has(negotiation.phase)) {
      this.negotiationsByPhase.set(negotiation.phase, new Set());
    }
    this.negotiationsByPhase.get(negotiation.phase)!.add(negotiation.id);
  }

  /**
   * Get negotiation by ID
   */
  getNegotiation(id: string): TradeNegotiation | undefined {
    return this.negotiations.get(id);
  }

  /**
   * Get active negotiations
   */
  getActiveNegotiations(): TradeNegotiation[] {
    return Array.from(this.negotiations.values())
      .filter(n =>
        n.phase !== NegotiationPhase.CONCLUDED &&
        n.phase !== NegotiationPhase.FAILED &&
        n.phase !== NegotiationPhase.SUSPENDED &&
        n.monitoring
      )
      .sort((a, b) => b.stakes.economicStakes - a.stakes.economicStakes);
  }

  /**
   * Get negotiations by type
   */
  getNegotiationsByType(type: NegotiationType): TradeNegotiation[] {
    const negotiationIds = this.negotiationsByType.get(type) || new Set();
    return Array.from(negotiationIds)
      .map(id => this.negotiations.get(id))
      .filter((n): n is TradeNegotiation => n !== undefined);
  }

  /**
   * Analyze negotiation progress
   */
  analyzeNegotiationProgress(negotiationId: string): {
    negotiation: TradeNegotiation | undefined;
    overallProgress: number;
    momentum: string;
    criticalPath: string[];
    bottlenecks: string[];
    successLikelihood: number;
    estimatedCompletion?: Date;
    recommendations: string[];
  } {
    const negotiation = this.negotiations.get(negotiationId);
    if (!negotiation) {
      return {
        negotiation: undefined,
        overallProgress: 0,
        momentum: 'Unknown',
        criticalPath: [],
        bottlenecks: [],
        successLikelihood: 0,
        recommendations: []
      };
    }

    // Calculate overall progress
    const chapterProgress = (negotiation.chaptersAgreed / negotiation.chaptersTotal) * 100;
    const overallProgress = (
      negotiation.progress * 0.6 +
      chapterProgress * 0.4
    );

    // Identify critical path (chapters and issues)
    const criticalPath: string[] = [];
    for (const issue of negotiation.criticalIssues) {
      if (issue.dealBreaker) {
        criticalPath.push(issue.issue);
      }
    }

    // Identify bottlenecks
    const bottlenecks: string[] = [];
    for (const stickingPoint of negotiation.keyStickingPoints) {
      if (stickingPoint.severity === 'CRITICAL' || stickingPoint.severity === 'MAJOR') {
        bottlenecks.push(stickingPoint.issue);
      }
    }

    // Estimate completion
    let estimatedCompletion: Date | undefined;
    if (negotiation.targetDate) {
      estimatedCompletion = negotiation.targetDate;
    } else if (negotiation.progress > 0) {
      const monthsElapsed = (new Date().getTime() - negotiation.launchDate.getTime()) /
        (1000 * 60 * 60 * 24 * 30);
      const monthsRemaining = (monthsElapsed / negotiation.progress) * (100 - negotiation.progress);
      estimatedCompletion = new Date();
      estimatedCompletion.setMonth(estimatedCompletion.getMonth() + monthsRemaining);
    }

    // Generate recommendations
    const recommendations = this.generateNegotiationRecommendations(negotiation);

    return {
      negotiation,
      overallProgress,
      momentum: negotiation.momentum,
      criticalPath,
      bottlenecks,
      successLikelihood: negotiation.successLikelihood,
      estimatedCompletion,
      recommendations
    };
  }

  /**
   * Identify deal breakers
   */
  identifyDealBreakers(negotiationId: string): {
    dealBreakers: CriticalIssue[];
    resolutionStrategies: {
      issue: string;
      strategies: string[];
      feasibility: number;
    }[];
    ministerialIntervention: boolean;
  } {
    const negotiation = this.negotiations.get(negotiationId);
    if (!negotiation) {
      return {
        dealBreakers: [],
        resolutionStrategies: [],
        ministerialIntervention: false
      };
    }

    const dealBreakers = negotiation.criticalIssues.filter(i => i.dealBreaker);

    const resolutionStrategies = dealBreakers.map(issue => {
      const strategies: string[] = [];
      const relatedStickingPoint = negotiation.keyStickingPoints.find(
        sp => sp.issue === issue.issue
      );

      if (relatedStickingPoint?.potentialSolutions) {
        strategies.push(...relatedStickingPoint.potentialSolutions);
      }

      // Generic strategies
      if (issue.requiresMinisterialIntervention) {
        strategies.push('Elevate to ministerial level');
      }

      strategies.push('Explore creative compromises');
      strategies.push('Consider phased approach');
      strategies.push('Seek third-party facilitation');

      return {
        issue: issue.issue,
        strategies,
        feasibility: relatedStickingPoint?.resolutionProspects === 'LIKELY' ? 80 :
                     relatedStickingPoint?.resolutionProspects === 'POSSIBLE' ? 60 :
                     relatedStickingPoint?.resolutionProspects === 'DIFFICULT' ? 40 : 20
      };
    });

    const ministerialIntervention = dealBreakers.some(db => db.requiresMinisterialIntervention);

    return {
      dealBreakers,
      resolutionStrategies,
      ministerialIntervention
    };
  }

  /**
   * Assess economic impact
   */
  assessEconomicImpact(negotiationId: string): {
    negotiation: TradeNegotiation | undefined;
    totalImpact: number;
    beneficiaries: string[];
    losers: string[];
    netBenefit: string;
    distributionalEffects: string;
  } {
    const negotiation = this.negotiations.get(negotiationId);
    if (!negotiation) {
      return {
        negotiation: undefined,
        totalImpact: 0,
        beneficiaries: [],
        losers: [],
        netBenefit: 'Unknown',
        distributionalEffects: 'Unknown'
      };
    }

    const totalImpact = negotiation.expectedImpact.estimatedTradeIncrease;

    const beneficiaries = negotiation.expectedImpact.sectorsGaining;
    const losers = negotiation.expectedImpact.sectorsLosing;

    // Calculate net benefit
    const jobsCreated = negotiation.expectedImpact.jobsCreated || 0;
    const jobsDisplaced = negotiation.expectedImpact.jobsDisplaced || 0;
    const netJobs = jobsCreated - jobsDisplaced;

    const netBenefit = netJobs > 0
      ? `Net positive: ${netJobs} jobs created`
      : netJobs < 0
      ? `Net negative: ${Math.abs(netJobs)} jobs lost`
      : 'Neutral job impact';

    const distributionalEffects = beneficiaries.length > losers.length
      ? 'Benefits widely distributed'
      : losers.length > beneficiaries.length
      ? 'Costs concentrated in specific sectors'
      : 'Mixed distributional effects';

    return {
      negotiation,
      totalImpact,
      beneficiaries,
      losers,
      netBenefit,
      distributionalEffects
    };
  }

  /**
   * Track economic partnership
   */
  trackPartnership(partnership: EconomicPartnership): void {
    this.partnerships.set(partnership.id, partnership);
  }

  /**
   * Evaluate partnership effectiveness
   */
  evaluatePartnershipEffectiveness(partnershipId: string): {
    partnership: EconomicPartnership | undefined;
    effectivenessScore: number;
    achievementRate: number;
    economicValue: number;
    strategicValue: number;
    strengthAreas: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const partnership = this.partnerships.get(partnershipId);
    if (!partnership) {
      return {
        partnership: undefined,
        effectivenessScore: 0,
        achievementRate: 0,
        economicValue: 0,
        strategicValue: 0,
        strengthAreas: [],
        weaknesses: [],
        recommendations: []
      };
    }

    const strengthAreas: string[] = [];
    const weaknesses: string[] = [];

    // Calculate achievement rate
    const completedProjects = partnership.projects.filter(
      p => p.status === 'COMPLETED' || p.status === 'OPERATIONAL'
    ).length;
    const achievementRate = partnership.projects.length > 0
      ? (completedProjects / partnership.projects.length) * 100
      : 0;

    // Analyze strengths and weaknesses
    if (partnership.effectiveness > 80) {
      strengthAreas.push('High overall effectiveness');
    } else if (partnership.effectiveness < 60) {
      weaknesses.push('Below-target effectiveness');
    }

    if (partnership.sustainability > 75) {
      strengthAreas.push('Strong sustainability');
    } else if (partnership.sustainability < 50) {
      weaknesses.push('Sustainability concerns');
    }

    if (achievementRate > 70) {
      strengthAreas.push('Strong project delivery');
    } else if (achievementRate < 40) {
      weaknesses.push('Poor project completion rate');
    }

    if (partnership.challenges.length > 5) {
      weaknesses.push('Multiple concurrent challenges');
    }

    const recommendations = this.generatePartnershipRecommendations(partnership);

    return {
      partnership,
      effectivenessScore: partnership.effectiveness,
      achievementRate,
      economicValue: partnership.economicBenefit,
      strategicValue: partnership.strategicValue,
      strengthAreas,
      weaknesses,
      recommendations
    };
  }

  /**
   * Track sanction regime
   */
  trackSanction(sanction: SanctionRegime): void {
    this.sanctions.set(sanction.id, sanction);
  }

  /**
   * Assess sanction effectiveness
   */
  assessSanctionEffectiveness(sanctionId: string): {
    sanction: SanctionRegime | undefined;
    effectivenessScore: number;
    economicImpact: number;
    complianceRate: number;
    objectivesAchieved: number;
    unintendedConsequences: string[];
    reliefProspects: number;
    recommendations: string[];
  } {
    const sanction = this.sanctions.get(sanctionId);
    if (!sanction) {
      return {
        sanction: undefined,
        effectivenessScore: 0,
        economicImpact: 0,
        complianceRate: 0,
        objectivesAchieved: 0,
        unintendedConsequences: [],
        reliefProspects: 0,
        recommendations: []
      };
    }

    const economicImpact = Math.abs(sanction.economicImpact.targetCountryGDPImpact);
    const complianceRate = sanction.compliance.complianceRate;

    // Estimate objectives achieved (simplified)
    const objectivesAchieved = sanction.effectiveness;

    // Identify unintended consequences
    const unintendedConsequences: string[] = [];
    if (sanction.humanitarianImpact) {
      if (sanction.humanitarianImpact.severity === 'SEVERE' ||
          sanction.humanitarianImpact.severity === 'SIGNIFICANT') {
        unintendedConsequences.push('Significant humanitarian impact');
      }
    }

    if (sanction.economicImpact.spilloverEffects &&
        sanction.economicImpact.spilloverEffects.length > 0) {
      unintendedConsequences.push('Negative spillover to third countries');
    }

    const recommendations = this.generateSanctionRecommendations(sanction);

    return {
      sanction,
      effectivenessScore: sanction.effectiveness,
      economicImpact,
      complianceRate,
      objectivesAchieved,
      unintendedConsequences,
      reliefProspects: sanction.liftingProspects,
      recommendations
    };
  }

  /**
   * Track investment treaty
   */
  trackTreaty(treaty: InvestmentTreaty): void {
    this.treaties.set(treaty.id, treaty);
  }

  /**
   * Track trade dispute
   */
  trackDispute(dispute: TradeDispute): void {
    this.disputes.set(dispute.id, dispute);
  }

  /**
   * Analyze dispute trends
   */
  analyzeDisputeTrends(country?: string): {
    totalDisputes: number;
    asComplainant: number;
    asRespondent: number;
    winRate: number;
    commonIssues: string[];
    averageValue: number;
    trends: string[];
  } {
    let disputes = Array.from(this.disputes.values());

    if (country) {
      disputes = disputes.filter(d =>
        d.complainant === country || d.respondent === country
      );
    }

    const asComplainant = disputes.filter(d => d.complainant === country).length;
    const asRespondent = disputes.filter(d => d.respondent === country).length;

    // Calculate win rate (simplified)
    const resolved = disputes.filter(d => d.status === 'RESOLVED');
    const won = resolved.filter(d =>
      (d.complainant === country && d.resolution?.includes('favor')) ||
      (d.respondent === country && d.resolution?.includes('dismissed'))
    ).length;
    const winRate = resolved.length > 0 ? (won / resolved.length) * 100 : 0;

    // Common issues
    const allSubjects = disputes.map(d => d.subject);
    const subjectCounts = new Map<string, number>();
    allSubjects.forEach(s => subjectCounts.set(s, (subjectCounts.get(s) || 0) + 1));
    const commonIssues = Array.from(subjectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subject]) => subject);

    // Average value
    const avgValue = disputes.length > 0
      ? disputes.reduce((sum, d) => sum + d.tradeValue, 0) / disputes.length
      : 0;

    // Trends
    const trends: string[] = [];
    const recentDisputes = disputes.filter(d =>
      d.filedDate.getTime() > Date.now() - 365 * 24 * 60 * 60 * 1000
    );

    if (recentDisputes.length > disputes.length * 0.4) {
      trends.push('Increasing dispute activity');
    }

    return {
      totalDisputes: disputes.length,
      asComplainant,
      asRespondent,
      winRate,
      commonIssues,
      averageValue: avgValue,
      trends
    };
  }

  /**
   * Track trade relationship
   */
  trackTradeRelationship(relationship: TradeRelationship): void {
    const key = this.getRelationshipKey(relationship.country1, relationship.country2);
    this.relationships.set(key, relationship);
  }

  /**
   * Analyze bilateral trade
   */
  analyzeBilateralTrade(country1: string, country2: string): {
    relationship: TradeRelationship | undefined;
    tradeIntensity: number;
    balanceAssessment: string;
    growth: string;
    opportunities: string[];
    barriers: string[];
    recommendations: string[];
  } {
    const key = this.getRelationshipKey(country1, country2);
    const relationship = this.relationships.get(key);

    if (!relationship) {
      return {
        relationship: undefined,
        tradeIntensity: 0,
        balanceAssessment: 'Unknown',
        growth: 'Unknown',
        opportunities: [],
        barriers: [],
        recommendations: []
      };
    }

    // Calculate trade intensity (simplified)
    const tradeIntensity = relationship.bilateralTradeVolume;

    // Balance assessment
    const balancePct = (relationship.tradeBalance / relationship.bilateralTradeVolume) * 100;
    const balanceAssessment = Math.abs(balancePct) < 10
      ? 'Balanced'
      : balancePct > 10
      ? `${relationship.country1} has surplus of ${balancePct.toFixed(1)}%`
      : `${relationship.country2} has surplus of ${Math.abs(balancePct).toFixed(1)}%`;

    // Growth assessment
    const growth = relationship.historicalTrend === 'GROWING'
      ? `Growing at ${relationship.tradeGrowthRate.toFixed(1)}% annually`
      : relationship.historicalTrend === 'DECLINING'
      ? `Declining at ${Math.abs(relationship.tradeGrowthRate).toFixed(1)}% annually`
      : 'Stable';

    const opportunities = relationship.growthOpportunities;
    const barriers = relationship.barriers;

    const recommendations: string[] = [];
    if (relationship.unrealizedPotential > relationship.bilateralTradeVolume * 0.2) {
      recommendations.push('Significant unrealized trade potential - explore new markets');
    }

    if (relationship.tradeFrictions.length > 3) {
      recommendations.push('Address trade frictions through dialogue');
    }

    if (relationship.tradeAgreements.length === 0) {
      recommendations.push('Consider negotiating trade agreement');
    }

    return {
      relationship,
      tradeIntensity,
      balanceAssessment,
      growth,
      opportunities,
      barriers,
      recommendations
    };
  }

  /**
   * Track economic coercion
   */
  trackCoercion(coercion: EconomicCoercion): void {
    this.coercion.set(coercion.id, coercion);
  }

  /**
   * Analyze coercion effectiveness
   */
  analyzeCoercionEffectiveness(coercionId: string): {
    coercion: EconomicCoercion | undefined;
    effectivenessScore: number;
    economicDamage: number;
    objectivesAchieved: boolean;
    retaliation: boolean;
    internationalBacklash: string;
    recommendations: string[];
  } {
    const coercion = this.coercion.get(coercionId);
    if (!coercion) {
      return {
        coercion: undefined,
        effectivenessScore: 0,
        economicDamage: 0,
        objectivesAchieved: false,
        retaliation: false,
        internationalBacklash: 'Unknown',
        recommendations: []
      };
    }

    const retaliation = coercion.retaliationMeasures !== undefined &&
                        coercion.retaliationMeasures.length > 0;

    const negativeReactions = coercion.internationalReaction.filter(r =>
      r.toLowerCase().includes('condemn') ||
      r.toLowerCase().includes('criticize') ||
      r.toLowerCase().includes('concern')
    ).length;

    const internationalBacklash = negativeReactions > 5
      ? 'Significant international criticism'
      : negativeReactions > 2
      ? 'Moderate international concern'
      : 'Limited international reaction';

    const objectivesAchieved = coercion.effectiveness > 70;

    const recommendations: string[] = [];
    if (retaliation) {
      recommendations.push('Consider de-escalation to prevent trade war');
    }

    if (!objectivesAchieved && coercion.effectiveness < 50) {
      recommendations.push('Reevaluate strategy - low effectiveness');
    }

    return {
      coercion,
      effectivenessScore: coercion.effectiveness,
      economicDamage: coercion.economicDamage,
      objectivesAchieved,
      retaliation,
      internationalBacklash,
      recommendations
    };
  }

  /**
   * Compare trade agreements
   */
  compareTradeAgreements(negotiationIds: string[]): {
    negotiations: TradeNegotiation[];
    mostAdvanced: string;
    mostComprehensive: string;
    highestStakes: string;
    fastestProgress: string;
    insights: string[];
  } {
    const negotiations = negotiationIds
      .map(id => this.negotiations.get(id))
      .filter((n): n is TradeNegotiation => n !== undefined);

    if (negotiations.length === 0) {
      return {
        negotiations: [],
        mostAdvanced: '',
        mostComprehensive: '',
        highestStakes: '',
        fastestProgress: '',
        insights: []
      };
    }

    // Most advanced (highest progress)
    const mostAdvanced = negotiations.reduce((max, n) =>
      n.progress > max.progress ? n : max
    );

    // Most comprehensive (most chapters)
    const mostComprehensive = negotiations.reduce((max, n) =>
      n.chaptersTotal > max.chaptersTotal ? n : max
    );

    // Highest stakes
    const highestStakes = negotiations.reduce((max, n) =>
      n.stakes.economicStakes > max.stakes.economicStakes ? n : max
    );

    // Fastest progress (progress / duration)
    const withDuration = negotiations.filter(n => n.duration && n.duration > 0);
    const fastestProgress = withDuration.length > 0
      ? withDuration.reduce((max, n) => {
          const rate = n.progress / (n.duration || 1);
          const maxRate = max.progress / (max.duration || 1);
          return rate > maxRate ? n : max;
        })
      : negotiations[0];

    // Generate insights
    const insights: string[] = [];
    const avgProgress = negotiations.reduce((sum, n) => sum + n.progress, 0) / negotiations.length;
    insights.push(`Average progress across agreements: ${avgProgress.toFixed(1)}%`);

    const stalled = negotiations.filter(n => n.momentum === 'STALLED').length;
    if (stalled > 0) {
      insights.push(`${stalled} agreement(s) currently stalled`);
    }

    return {
      negotiations,
      mostAdvanced: mostAdvanced.name,
      mostComprehensive: mostComprehensive.name,
      highestStakes: highestStakes.name,
      fastestProgress: fastestProgress.name,
      insights
    };
  }

  private generateNegotiationRecommendations(negotiation: TradeNegotiation): string[] {
    const recommendations: string[] = [];

    if (negotiation.momentum === 'STALLED') {
      recommendations.push('Inject political momentum through high-level engagement');
    }

    if (negotiation.keyStickingPoints.length > 5) {
      recommendations.push('Prioritize and sequence issue resolution');
    }

    if (negotiation.businessSupport < 60) {
      recommendations.push('Enhance stakeholder engagement and communication');
    }

    if (negotiation.successLikelihood < 50) {
      recommendations.push('Reassess negotiation strategy and feasibility');
    }

    return recommendations;
  }

  private generatePartnershipRecommendations(partnership: EconomicPartnership): string[] {
    const recommendations: string[] = [];

    if (partnership.effectiveness < 70) {
      recommendations.push('Review partnership structure and mechanisms');
    }

    const delayedProjects = partnership.projects.filter(p => p.status === 'DELAYED');
    if (delayedProjects.length > 0) {
      recommendations.push('Address project implementation bottlenecks');
    }

    if (partnership.sustainability < 60) {
      recommendations.push('Strengthen sustainability measures');
    }

    return recommendations;
  }

  private generateSanctionRecommendations(sanction: SanctionRegime): string[] {
    const recommendations: string[] = [];

    if (sanction.effectiveness < 50) {
      recommendations.push('Review sanction design and enforcement');
    }

    if (sanction.humanitarianImpact &&
        sanction.humanitarianImpact.severity === 'SEVERE') {
      recommendations.push('Strengthen humanitarian exemptions');
    }

    if (sanction.compliance.complianceRate < 70) {
      recommendations.push('Enhance enforcement and compliance mechanisms');
    }

    return recommendations;
  }

  private getRelationshipKey(country1: string, country2: string): string {
    return [country1, country2].sort().join(':');
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalNegotiations: number;
    activeNegotiations: number;
    byPhase: Record<string, number>;
    totalPartnerships: number;
    activeSanctions: number;
    totalDisputes: number;
  } {
    const byPhase: Record<string, number> = {};

    for (const negotiation of this.negotiations.values()) {
      byPhase[negotiation.phase] = (byPhase[negotiation.phase] || 0) + 1;
    }

    const activeNegotiations = this.getActiveNegotiations();

    const activeSanctions = Array.from(this.sanctions.values())
      .filter(s => !s.endDate || s.endDate > new Date())
      .length;

    return {
      totalNegotiations: this.negotiations.size,
      activeNegotiations: activeNegotiations.length,
      byPhase,
      totalPartnerships: this.partnerships.size,
      activeSanctions,
      totalDisputes: this.disputes.size
    };
  }
}

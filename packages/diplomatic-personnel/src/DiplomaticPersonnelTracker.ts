import {
  Diplomat,
  DiplomaticRank,
  Embassy,
  DiplomaticNetwork,
  DiplomaticCorps,
  CareerPath,
  DiplomaticCadre,
  AppointmentTracking,
  InfluenceMetrics,
  PersonnelComparison,
  SpecializationArea,
  Posting
} from './types.js';

/**
 * DiplomaticPersonnelTracker
 *
 * Track ambassadors, envoys, diplomatic personnel, and their networks
 */
export class DiplomaticPersonnelTracker {
  private diplomats: Map<string, Diplomat> = new Map();
  private diplomatsByCountry: Map<string, Set<string>> = new Map();
  private diplomatsByRank: Map<DiplomaticRank, Set<string>> = new Map();
  private embassies: Map<string, Embassy> = new Map();
  private networks: Map<string, DiplomaticNetwork> = new Map();
  private careerPaths: Map<string, CareerPath> = new Map();
  private cadres: Map<string, DiplomaticCadre> = new Map();

  /**
   * Track a diplomat
   */
  trackDiplomat(diplomat: Diplomat): void {
    this.diplomats.set(diplomat.id, diplomat);

    // Index by country
    if (!this.diplomatsByCountry.has(diplomat.country)) {
      this.diplomatsByCountry.set(diplomat.country, new Set());
    }
    this.diplomatsByCountry.get(diplomat.country)!.add(diplomat.id);

    // Index by rank
    if (!this.diplomatsByRank.has(diplomat.rank)) {
      this.diplomatsByRank.set(diplomat.rank, new Set());
    }
    this.diplomatsByRank.get(diplomat.rank)!.add(diplomat.id);

    // Update career path
    this.updateCareerPath(diplomat);
  }

  /**
   * Get diplomat by ID
   */
  getDiplomat(id: string): Diplomat | undefined {
    return this.diplomats.get(id);
  }

  /**
   * Get diplomats by country
   */
  getDiplomatsByCountry(country: string): Diplomat[] {
    const diplomatIds = this.diplomatsByCountry.get(country) || new Set();
    return Array.from(diplomatIds)
      .map(id => this.diplomats.get(id))
      .filter((d): d is Diplomat => d !== undefined);
  }

  /**
   * Get diplomats by rank
   */
  getDiplomatsByRank(rank: DiplomaticRank): Diplomat[] {
    const diplomatIds = this.diplomatsByRank.get(rank) || new Set();
    return Array.from(diplomatIds)
      .map(id => this.diplomats.get(id))
      .filter((d): d is Diplomat => d !== undefined);
  }

  /**
   * Get current ambassadors to a country
   */
  getAmbassadorsToCountry(hostCountry: string): Diplomat[] {
    return Array.from(this.diplomats.values())
      .filter(d =>
        d.currentPosting.isCurrent &&
        d.currentPosting.location.country === hostCountry &&
        (d.rank === DiplomaticRank.AMBASSADOR ||
         d.rank === DiplomaticRank.HIGH_COMMISSIONER ||
         d.rank === DiplomaticRank.CHARGE_D_AFFAIRES)
      );
  }

  /**
   * Analyze diplomat effectiveness
   */
  analyzeDiplomatEffectiveness(diplomatId: string): {
    diplomat: Diplomat | undefined;
    effectivenessScore: number;
    strengths: string[];
    areas ForImprovement: string[];
    careerTrajectory: 'ASCENDING' | 'STABLE' | 'DECLINING';
    recommendations: string[];
  } {
    const diplomat = this.diplomats.get(diplomatId);
    if (!diplomat) {
      return {
        diplomat: undefined,
        effectivenessScore: 0,
        strengths: [],
        areasForImprovement: [],
        careerTrajectory: 'STABLE',
        recommendations: []
      };
    }

    const strengths = [...diplomat.strengths];
    const areasForImprovement: string[] = [];

    // Analyze based on various factors
    if (diplomat.effectiveness > 80) {
      strengths.push('Exceptional performance record');
    } else if (diplomat.effectiveness < 60) {
      areasForImprovement.push('Performance improvement needed');
    }

    if (diplomat.networkSize > 100) {
      strengths.push('Extensive diplomatic network');
    } else if (diplomat.networkSize < 30) {
      areasForImprovement.push('Limited network - needs expansion');
    }

    if (diplomat.languages.length > 3) {
      strengths.push('Strong multilingual capabilities');
    } else if (diplomat.languages.length < 2) {
      areasForImprovement.push('Additional language skills needed');
    }

    if (diplomat.reputation.credibility > 80) {
      strengths.push('High credibility and trust');
    }

    // Career trajectory
    const careerPath = this.careerPaths.get(diplomatId);
    const careerTrajectory = careerPath?.trajectory || 'STABLE';

    // Recommendations
    const recommendations = this.generateDiplomatRecommendations(diplomat);

    return {
      diplomat,
      effectivenessScore: diplomat.effectiveness,
      strengths,
      areasForImprovement,
      careerTrajectory,
      recommendations
    };
  }

  /**
   * Map diplomatic network
   */
  mapDiplomaticNetwork(diplomatId: string, depth: number = 2): {
    centerDiplomat: Diplomat | undefined;
    directConnections: Diplomat[];
    secondDegreeConnections: Diplomat[];
    networkStrength: number;
    influentialContacts: Diplomat[];
    geographicReach: string[];
  } {
    const diplomat = this.diplomats.get(diplomatId);
    if (!diplomat) {
      return {
        centerDiplomat: undefined,
        directConnections: [],
        secondDegreeConnections: [],
        networkStrength: 0,
        influentialContacts: [],
        geographicReach: []
      };
    }

    // Direct connections
    const directConnections: Diplomat[] = [];
    const secondDegreeConnections: Diplomat[] = [];
    const seenIds = new Set<string>([diplomatId]);

    for (const relationship of diplomat.relationships) {
      const contact = this.diplomats.get(relationship.withDiplomat);
      if (contact) {
        directConnections.push(contact);
        seenIds.add(contact.id);

        // Second degree if depth >= 2
        if (depth >= 2) {
          for (const secondRel of contact.relationships) {
            if (!seenIds.has(secondRel.withDiplomat)) {
              const secondContact = this.diplomats.get(secondRel.withDiplomat);
              if (secondContact) {
                secondDegreeConnections.push(secondContact);
                seenIds.add(secondContact.id);
              }
            }
          }
        }
      }
    }

    // Calculate network strength
    const avgRelationshipStrength = diplomat.relationships.length > 0
      ? diplomat.relationships.reduce((sum, r) => sum + r.strength, 0) / diplomat.relationships.length
      : 0;

    const networkStrength = (
      (directConnections.length / 100) * 40 +
      avgRelationshipStrength * 0.6
    );

    // Influential contacts (high influence)
    const influentialContacts = directConnections
      .filter(d => d.influence > 70)
      .sort((a, b) => b.influence - a.influence)
      .slice(0, 10);

    // Geographic reach
    const countries = new Set(
      directConnections.map(d => d.country)
    );
    const regions = new Set(
      directConnections.map(d => d.currentPosting.location.region)
    );

    const geographicReach = [
      `${countries.size} countries`,
      `${regions.size} regions`
    ];

    return {
      centerDiplomat: diplomat,
      directConnections,
      secondDegreeConnections: secondDegreeConnections.slice(0, 50),
      networkStrength,
      influentialContacts,
      geographicReach
    };
  }

  /**
   * Track embassy
   */
  trackEmbassy(embassy: Embassy): void {
    this.embassies.set(embassy.id, embassy);
  }

  /**
   * Analyze embassy effectiveness
   */
  analyzeEmbassyEffectiveness(embassyId: string): {
    embassy: Embassy | undefined;
    effectivenessScore: number;
    staffingLevel: 'UNDERSTAFFED' | 'ADEQUATE' | 'WELL_STAFFED' | 'OVERSTAFFED';
    strengthAreas: string[];
    challenges: string[];
    recommendations: string[];
  } {
    const embassy = this.embassies.get(embassyId);
    if (!embassy) {
      return {
        embassy: undefined,
        effectivenessScore: 0,
        staffingLevel: 'ADEQUATE',
        strengthAreas: [],
        challenges: [],
        recommendations: []
      };
    }

    const strengthAreas: string[] = [];
    const challenges: string[] = [];

    // Analyze effectiveness
    if (embassy.effectiveness > 80) {
      strengthAreas.push('High overall effectiveness');
    } else if (embassy.effectiveness < 60) {
      challenges.push('Effectiveness below target');
    }

    // Analyze bilateral relationship
    if (embassy.bilateralRelationshipQuality > 75) {
      strengthAreas.push('Strong bilateral relationship');
    } else if (embassy.bilateralRelationshipQuality < 50) {
      challenges.push('Strained bilateral relations');
    }

    // Assess staffing
    let staffingLevel: 'UNDERSTAFFED' | 'ADEQUATE' | 'WELL_STAFFED' | 'OVERSTAFFED' = 'ADEQUATE';
    const expectedStaff = this.calculateExpectedStaffing(embassy.size);
    const ratio = embassy.staff.totalStaff / expectedStaff;

    if (ratio < 0.7) staffingLevel = 'UNDERSTAFFED';
    else if (ratio > 1.3) staffingLevel = 'OVERSTAFFED';
    else if (ratio > 0.9 && ratio <= 1.1) staffingLevel = 'WELL_STAFFED';

    if (staffingLevel === 'UNDERSTAFFED') {
      challenges.push('Insufficient staffing levels');
    }

    // Check turnover
    if (embassy.staff.turnoverRate && embassy.staff.turnoverRate > 30) {
      challenges.push('High staff turnover rate');
    }

    const recommendations = this.generateEmbassyRecommendations(embassy, staffingLevel);

    return {
      embassy,
      effectivenessScore: embassy.effectiveness,
      staffingLevel,
      strengthAreas,
      challenges,
      recommendations
    };
  }

  /**
   * Track diplomatic network
   */
  trackNetwork(network: DiplomaticNetwork): void {
    this.networks.set(network.id, network);
  }

  /**
   * Identify influential diplomats
   */
  identifyInfluentialDiplomats(criteria?: {
    minInfluence?: number;
    country?: string;
    region?: string;
    specialization?: SpecializationArea;
  }): Diplomat[] {
    let diplomats = Array.from(this.diplomats.values());

    // Apply filters
    if (criteria?.minInfluence) {
      diplomats = diplomats.filter(d => d.influence >= criteria.minInfluence);
    }

    if (criteria?.country) {
      diplomats = diplomats.filter(d => d.country === criteria.country);
    }

    if (criteria?.region) {
      diplomats = diplomats.filter(d =>
        d.currentPosting.location.region === criteria.region ||
        d.regionalExpertise.includes(criteria.region)
      );
    }

    if (criteria?.specialization) {
      diplomats = diplomats.filter(d =>
        d.specializations.includes(criteria.specialization!)
      );
    }

    // Sort by influence
    return diplomats
      .sort((a, b) => b.influence - a.influence)
      .slice(0, 50);
  }

  /**
   * Analyze career progression
   */
  analyzeCareerProgression(diplomatId: string): {
    diplomat: Diplomat | undefined;
    careerPath: CareerPath | undefined;
    progressionRate: number;
    peakAchieved: boolean;
    futureProspects: string;
    benchmarkComparison: string;
  } {
    const diplomat = this.diplomats.get(diplomatId);
    const careerPath = this.careerPaths.get(diplomatId);

    if (!diplomat || !careerPath) {
      return {
        diplomat,
        careerPath,
        progressionRate: 0,
        peakAchieved: false,
        futureProspects: 'Unknown',
        benchmarkComparison: 'No data'
      };
    }

    // Calculate progression rate
    const yearsOfService = (new Date().getTime() - diplomat.careerStart.getTime()) /
      (1000 * 60 * 60 * 24 * 365);

    const progressionRate = careerPath.promotionVelocity;

    // Check if peak achieved
    const peakAchieved = diplomat.rank === careerPath.peakRank;

    // Future prospects
    let futureProspects = '';
    if (careerPath.trajectory === 'ASCENDING') {
      futureProspects = 'Strong - likely to advance further';
    } else if (careerPath.trajectory === 'STABLE') {
      futureProspects = 'Moderate - maintaining current level';
    } else if (careerPath.trajectory === 'DECLINING') {
      futureProspects = 'Limited - approaching career end';
    } else {
      futureProspects = 'Transitional - lateral moves expected';
    }

    // Benchmark comparison
    const benchmarkYears = this.getBenchmarkPromotionTime(diplomat.rank);
    const benchmarkComparison = progressionRate < benchmarkYears
      ? 'Faster than average progression'
      : progressionRate > benchmarkYears * 1.5
      ? 'Slower than average progression'
      : 'Average progression rate';

    return {
      diplomat,
      careerPath,
      progressionRate,
      peakAchieved,
      futureProspects,
      benchmarkComparison
    };
  }

  /**
   * Track diplomatic cadre
   */
  trackCadre(cadre: DiplomaticCadre): void {
    this.cadres.set(cadre.country, cadre);
  }

  /**
   * Compare diplomatic cadres
   */
  compareCadres(countries: string[]): {
    cadres: DiplomaticCadre[];
    largestCadre: string;
    mostEffective: string;
    bestTrained: string;
    mostDiverse: string;
    insights: string[];
  } {
    const cadres = countries
      .map(c => this.cadres.get(c))
      .filter((c): c is DiplomaticCadre => c !== undefined);

    if (cadres.length === 0) {
      return {
        cadres: [],
        largestCadre: '',
        mostEffective: '',
        bestTrained: '',
        mostDiverse: '',
        insights: []
      };
    }

    // Find largest
    const largest = cadres.reduce((max, c) =>
      c.totalDiplomats > max.totalDiplomats ? c : max
    );

    // Find most effective
    const mostEffective = cadres.reduce((max, c) =>
      c.effectiveness > max.effectiveness ? c : max
    );

    // Best trained (most training programs)
    const bestTrained = cadres.reduce((max, c) =>
      c.trainingPrograms.length > max.trainingPrograms.length ? c : max
    );

    // Most diverse (most languages)
    const mostDiverse = cadres.reduce((max, c) =>
      c.languageCapabilities.length > max.languageCapabilities.length ? c : max
    );

    // Generate insights
    const insights: string[] = [];
    const avgSize = cadres.reduce((sum, c) => sum + c.totalDiplomats, 0) / cadres.length;
    const avgEffectiveness = cadres.reduce((sum, c) => sum + c.effectiveness, 0) / cadres.length;

    insights.push(`Average cadre size: ${Math.round(avgSize)} diplomats`);
    insights.push(`Average effectiveness: ${avgEffectiveness.toFixed(1)}%`);

    if (largest.totalDiplomats > avgSize * 2) {
      insights.push(`${largest.country} has significantly larger cadre than average`);
    }

    return {
      cadres,
      largestCadre: largest.country,
      mostEffective: mostEffective.country,
      bestTrained: bestTrained.country,
      mostDiverse: mostDiverse.country,
      insights
    };
  }

  /**
   * Calculate influence metrics
   */
  calculateInfluenceMetrics(diplomatId: string): InfluenceMetrics {
    const diplomat = this.diplomats.get(diplomatId);
    if (!diplomat) {
      return {
        diplomat: diplomatId,
        period: { start: new Date(), end: new Date() },
        networkInfluence: 0,
        mediaInfluence: 0,
        politicalInfluence: 0,
        policyInfluence: 0,
        accessToPowerCenters: 0,
        thoughtLeadership: 0,
        negotiatingPower: 0,
        overallInfluence: 0,
        trend: 'STABLE',
        influenceFactors: [],
        influenceSpheres: []
      };
    }

    // Network influence based on network size and quality
    const networkInfluence = Math.min(100,
      (diplomat.networkSize / 200) * 100 * 0.7 +
      (diplomat.relationships.reduce((sum, r) => sum + r.strength, 0) /
        (diplomat.relationships.length || 1)) * 0.3
    );

    // Media influence based on public engagements
    const highProfileEngagements = diplomat.publicEngagements.filter(
      e => e.mediaAttention === 'HIGH' || e.mediaAttention === 'VERY_HIGH'
    ).length;
    const mediaInfluence = Math.min(100, (highProfileEngagements / 20) * 100);

    // Political influence based on rank and profile
    let politicalInfluence = 50;
    if (diplomat.rank === DiplomaticRank.AMBASSADOR) politicalInfluence = 80;
    if (diplomat.profileLevel === 'VERY_HIGH') politicalInfluence += 15;
    politicalInfluence = Math.min(100, politicalInfluence);

    // Policy influence based on negotiations and writings
    const policyInfluence = Math.min(100,
      (diplomat.negotiations.length / 10) * 50 +
      (diplomat.writings.filter(w => w.influence > 70).length / 5) * 50
    );

    // Access to power centers (based on postings and relationships)
    const accessToPowerCenters = diplomat.influence;

    // Thought leadership (based on publications and speeches)
    const thoughtLeadership = Math.min(100,
      (diplomat.writings.length / 10) * 60 +
      (diplomat.speeches.filter(s => s.significance >= 7).length / 15) * 40
    );

    // Negotiating power (from negotiation participation)
    const leadNegotiations = diplomat.negotiations.filter(
      n => n.role === 'LEAD' || n.role === 'MEDIATOR'
    ).length;
    const negotiatingPower = Math.min(100, (leadNegotiations / 10) * 100);

    // Overall influence
    const overallInfluence = (
      networkInfluence * 0.25 +
      mediaInfluence * 0.15 +
      politicalInfluence * 0.25 +
      policyInfluence * 0.15 +
      accessToPowerCenters * 0.10 +
      thoughtLeadership * 0.05 +
      negotiatingPower * 0.05
    );

    // Determine trend
    const careerPath = this.careerPaths.get(diplomatId);
    let trend: 'RISING' | 'STABLE' | 'DECLINING' = 'STABLE';
    if (careerPath) {
      if (careerPath.trajectory === 'ASCENDING') trend = 'RISING';
      else if (careerPath.trajectory === 'DECLINING') trend = 'DECLINING';
    }

    // Influence factors
    const influenceFactors: string[] = [];
    if (networkInfluence > 70) influenceFactors.push('Extensive network');
    if (politicalInfluence > 80) influenceFactors.push('Senior rank');
    if (thoughtLeadership > 60) influenceFactors.push('Thought leadership');
    if (negotiatingPower > 70) influenceFactors.push('Negotiation expertise');

    // Influence spheres
    const influenceSpheres = [
      ...diplomat.regionalExpertise,
      ...diplomat.topicalExpertise
    ].slice(0, 5);

    return {
      diplomat: diplomatId,
      period: { start: diplomat.careerStart, end: new Date() },
      networkInfluence,
      mediaInfluence,
      politicalInfluence,
      policyInfluence,
      accessToPowerCenters,
      thoughtLeadership,
      negotiatingPower,
      overallInfluence,
      trend,
      influenceFactors,
      influenceSpheres
    };
  }

  /**
   * Compare diplomats
   */
  compareDiplomats(diplomatIds: string[]): PersonnelComparison {
    const diplomats = diplomatIds
      .map(id => this.diplomats.get(id))
      .filter((d): d is Diplomat => d !== undefined);

    // Common background
    const allEducation = diplomats.flatMap(d => d.education.map(e => e.institution));
    const institutionCounts = new Map<string, number>();
    allEducation.forEach(i => institutionCounts.set(i, (institutionCounts.get(i) || 0) + 1));

    const commonBackground = Array.from(institutionCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([institution]) => institution);

    // Distinctive features
    const distinctiveFeatures = diplomats.map(d => ({
      diplomat: d.name,
      features: [
        ...d.specializations.map(s => `Specialization: ${s}`),
        ...d.regionalExpertise.map(r => `Regional expertise: ${r}`),
        d.profileLevel === 'VERY_HIGH' ? 'Very high profile' : ''
      ].filter(Boolean)
    }));

    // Effectiveness ranking
    const effectivenessRanking = diplomats
      .map(d => ({ diplomat: d.name, rank: 0, score: d.effectiveness }))
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Network overlap
    const networkOverlap: PersonnelComparison['networkOverlap'] = [];
    for (let i = 0; i < diplomats.length; i++) {
      for (let j = i + 1; j < diplomats.length; j++) {
        const d1 = diplomats[i];
        const d2 = diplomats[j];

        const d1Contacts = new Set(d1.relationships.map(r => r.withDiplomat));
        const d2Contacts = new Set(d2.relationships.map(r => r.withDiplomat));

        const shared = Array.from(d1Contacts).filter(c => d2Contacts.has(c)).length;
        const total = new Set([...d1Contacts, ...d2Contacts]).size;

        networkOverlap.push({
          diplomat1: d1.name,
          diplomat2: d2.name,
          sharedContacts: shared,
          overlapPercentage: total > 0 ? (shared / total) * 100 : 0
        });
      }
    }

    return {
      diplomats,
      commonBackground,
      distinctiveFeatures,
      effectivenessRanking,
      networkOverlap
    };
  }

  private updateCareerPath(diplomat: Diplomat): void {
    let careerPath = this.careerPaths.get(diplomat.id);

    if (!careerPath) {
      careerPath = {
        diplomat: diplomat.id,
        stages: [],
        trajectory: 'STABLE',
        peakRank: diplomat.rank,
        peakInfluence: diplomat.influence,
        promotionVelocity: 0,
        geographicDiversity: 0,
        functionalDiversity: 0,
        futureProspects: {}
      };
    }

    // Update with current posting if not already included
    const currentStage = {
      posting: diplomat.currentPosting,
      rank: diplomat.rank,
      duration: diplomat.currentPosting.duration || 0,
      impact: 7,
      keyAchievements: diplomat.currentPosting.achievements || [],
      skillsDeveloped: diplomat.specializations.map(String)
    };

    const hasCurrentStage = careerPath.stages.some(
      s => s.posting.id === diplomat.currentPosting.id
    );

    if (!hasCurrentStage) {
      careerPath.stages.push(currentStage);
    }

    this.careerPaths.set(diplomat.id, careerPath);
  }

  private generateDiplomatRecommendations(diplomat: Diplomat): string[] {
    const recommendations: string[] = [];

    if (diplomat.networkSize < 50) {
      recommendations.push('Expand diplomatic network through conferences and exchanges');
    }

    if (diplomat.languages.length < 3) {
      recommendations.push('Acquire additional language skills');
    }

    if (diplomat.regionalExpertise.length < 2) {
      recommendations.push('Develop expertise in additional regions');
    }

    if (diplomat.publicEngagements.length < 10) {
      recommendations.push('Increase public engagement and visibility');
    }

    return recommendations;
  }

  private generateEmbassyRecommendations(
    embassy: Embassy,
    staffingLevel: string
  ): string[] {
    const recommendations: string[] = [];

    if (staffingLevel === 'UNDERSTAFFED') {
      recommendations.push('Increase staffing levels to meet operational needs');
    }

    if (embassy.effectiveness < 70) {
      recommendations.push('Review and enhance operational effectiveness');
    }

    if (embassy.bilateralRelationshipQuality < 60) {
      recommendations.push('Strengthen bilateral relationship through enhanced engagement');
    }

    return recommendations;
  }

  private calculateExpectedStaffing(size: string): number {
    const staffingLevels = {
      'SMALL': 20,
      'MEDIUM': 50,
      'LARGE': 100,
      'VERY_LARGE': 200
    };
    return staffingLevels[size as keyof typeof staffingLevels] || 50;
  }

  private getBenchmarkPromotionTime(rank: DiplomaticRank): number {
    // Average years for promotion at each rank
    const benchmarks: Record<string, number> = {
      [DiplomaticRank.THIRD_SECRETARY]: 3,
      [DiplomaticRank.SECOND_SECRETARY]: 4,
      [DiplomaticRank.FIRST_SECRETARY]: 5,
      [DiplomaticRank.COUNSELOR]: 6,
      [DiplomaticRank.MINISTER_COUNSELOR]: 7,
      [DiplomaticRank.AMBASSADOR]: 8
    };
    return benchmarks[rank] || 5;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalDiplomats: number;
    byRank: Record<string, number>;
    byCountry: Record<string, number>;
    averageInfluence: number;
    averageEffectiveness: number;
    topInfluencers: string[];
  } {
    const byRank: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    let totalInfluence = 0;
    let totalEffectiveness = 0;

    for (const diplomat of this.diplomats.values()) {
      byRank[diplomat.rank] = (byRank[diplomat.rank] || 0) + 1;
      byCountry[diplomat.country] = (byCountry[diplomat.country] || 0) + 1;
      totalInfluence += diplomat.influence;
      totalEffectiveness += diplomat.effectiveness;
    }

    const topInfluencers = Array.from(this.diplomats.values())
      .sort((a, b) => b.influence - a.influence)
      .slice(0, 10)
      .map(d => d.name);

    return {
      totalDiplomats: this.diplomats.size,
      byRank,
      byCountry,
      averageInfluence: this.diplomats.size > 0 ? totalInfluence / this.diplomats.size : 0,
      averageEffectiveness: this.diplomats.size > 0 ? totalEffectiveness / this.diplomats.size : 0,
      topInfluencers
    };
  }
}

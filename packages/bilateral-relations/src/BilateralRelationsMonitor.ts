import {
  BilateralRelationship,
  RelationshipStatus,
  CooperationLevel,
  FrictionPoint,
  Trajectory,
  RiskFactor,
  RelationshipComparison
} from './types.js';

/**
 * BilateralRelationsMonitor
 *
 * Monitor and analyze bilateral relationships between countries
 */
export class BilateralRelationsMonitor {
  private relationships: Map<string, BilateralRelationship> = new Map();
  private relationshipsByCountry: Map<string, Set<string>> = new Map();

  /**
   * Track a bilateral relationship
   */
  trackRelationship(relationship: BilateralRelationship): void {
    const key = this.getRelationshipKey(relationship.country1, relationship.country2);
    this.relationships.set(key, relationship);

    // Index by both countries
    this.addToCountryIndex(relationship.country1, key);
    this.addToCountryIndex(relationship.country2, key);
  }

  /**
   * Get relationship between two countries
   */
  getRelationship(country1: string, country2: string): BilateralRelationship | undefined {
    const key = this.getRelationshipKey(country1, country2);
    return this.relationships.get(key);
  }

  /**
   * Get all relationships for a country
   */
  getCountryRelationships(country: string): BilateralRelationship[] {
    const keys = this.relationshipsByCountry.get(country) || new Set();
    return Array.from(keys)
      .map(key => this.relationships.get(key))
      .filter((r): r is BilateralRelationship => r !== undefined);
  }

  /**
   * Get relationships by status
   */
  getRelationshipsByStatus(status: RelationshipStatus): BilateralRelationship[] {
    return Array.from(this.relationships.values())
      .filter(r => r.status === status);
  }

  /**
   * Assess relationship health
   */
  assessRelationshipHealth(country1: string, country2: string): {
    overallHealth: number;
    strengths: string[];
    weaknesses: string[];
    outlook: string;
    recommendations: string[];
  } {
    const relationship = this.getRelationship(country1, country2);
    if (!relationship) {
      return {
        overallHealth: 0,
        strengths: [],
        weaknesses: [],
        outlook: 'Unknown',
        recommendations: ['Establish formal relationship tracking']
      };
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Analyze cooperation areas
    const strongCooperation = relationship.cooperationAreas.filter(c =>
      c.level === CooperationLevel.EXTENSIVE || c.level === CooperationLevel.SUBSTANTIAL
    );
    if (strongCooperation.length > 0) {
      strengths.push(`Strong cooperation in ${strongCooperation.length} areas`);
    }

    // Analyze friction points
    const highFriction = relationship.frictionPoints.filter(f => f.severity >= 7);
    if (highFriction.length > 0) {
      weaknesses.push(`${highFriction.length} high-severity friction points`);
    }

    // Trade relationship
    if (relationship.tradeRelationship.trend === 'GROWING') {
      strengths.push('Growing trade relationship');
    } else if (relationship.tradeRelationship.trend === 'DECLINING') {
      weaknesses.push('Declining trade relationship');
    }

    // Defense cooperation
    if (relationship.defenseCooperation.level === CooperationLevel.EXTENSIVE) {
      strengths.push('Strong defense cooperation');
    }

    const overallHealth = (
      relationship.relationshipQuality * 0.4 +
      relationship.strategicAlignment * 0.3 +
      relationship.trustLevel * 0.2 +
      relationship.stability * 0.1
    );

    let outlook: string;
    if (relationship.recentTrend === 'IMPROVING') {
      outlook = 'Positive - relationship improving';
    } else if (relationship.recentTrend === 'DETERIORATING') {
      outlook = 'Concerning - relationship deteriorating';
    } else if (relationship.recentTrend === 'VOLATILE') {
      outlook = 'Unstable - high volatility observed';
    } else {
      outlook = 'Stable - no major changes expected';
    }

    const recommendations = this.generateRecommendations(relationship);

    return {
      overallHealth,
      strengths,
      weaknesses,
      outlook,
      recommendations
    };
  }

  /**
   * Identify crisis relationships
   */
  identifyCrisisRelationships(): BilateralRelationship[] {
    return Array.from(this.relationships.values())
      .filter(r =>
        r.status === RelationshipStatus.HOSTILE ||
        r.status === RelationshipStatus.SEVERED ||
        r.status === RelationshipStatus.TENSE ||
        r.relationshipQuality < 30 ||
        r.stability < 40
      )
      .sort((a, b) => a.relationshipQuality - b.relationshipQuality);
  }

  /**
   * Identify improving relationships
   */
  identifyImprovingRelationships(threshold: number = 20): BilateralRelationship[] {
    return Array.from(this.relationships.values())
      .filter(r =>
        r.recentTrend === 'IMPROVING' &&
        r.status === RelationshipStatus.NORMALIZING
      );
  }

  /**
   * Analyze cooperation patterns
   */
  analyzeCooperationPatterns(country: string): {
    totalPartners: number;
    cooperationByDomain: Record<string, number>;
    strongPartners: string[];
    strategicPartners: string[];
    averageCooperationLevel: number;
  } {
    const relationships = this.getCountryRelationships(country);

    const cooperationByDomain: Record<string, number> = {};
    const strongPartners: string[] = [];
    const strategicPartners: string[] = [];

    for (const rel of relationships) {
      // Count cooperation by domain
      for (const area of rel.cooperationAreas) {
        cooperationByDomain[area.domain] = (cooperationByDomain[area.domain] || 0) + 1;
      }

      // Identify strong partners
      if (rel.relationshipQuality > 70) {
        const partner = rel.country1 === country ? rel.country2 : rel.country1;
        strongPartners.push(partner);
      }

      // Identify strategic partners
      if (rel.status === RelationshipStatus.STRATEGIC_PARTNERSHIP) {
        const partner = rel.country1 === country ? rel.country2 : rel.country1;
        strategicPartners.push(partner);
      }
    }

    const avgQuality = relationships.length > 0
      ? relationships.reduce((sum, r) => sum + r.relationshipQuality, 0) / relationships.length
      : 0;

    return {
      totalPartners: relationships.length,
      cooperationByDomain,
      strongPartners,
      strategicPartners,
      averageCooperationLevel: avgQuality
    };
  }

  /**
   * Detect relationship risks
   */
  detectRelationshipRisks(country1: string, country2: string): {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    risks: RiskFactor[];
    earlyWarningIndicators: string[];
    mitigationOptions: string[];
  } {
    const relationship = this.getRelationship(country1, country2);
    if (!relationship) {
      return {
        riskLevel: 'LOW',
        risks: [],
        earlyWarningIndicators: [],
        mitigationOptions: []
      };
    }

    const earlyWarningIndicators: string[] = [];

    // Check for escalating friction
    const escalating = relationship.frictionPoints.filter(f =>
      f.escalationRisk === 'HIGH' || f.escalationRisk === 'CRITICAL'
    );
    if (escalating.length > 0) {
      earlyWarningIndicators.push(`${escalating.length} friction points at high escalation risk`);
    }

    // Check sanctions
    if (relationship.sanctions && relationship.sanctions.length > 0) {
      const activeSanctions = relationship.sanctions.filter(s => !s.liftedDate);
      if (activeSanctions.length > 0) {
        earlyWarningIndicators.push(`${activeSanctions.length} active sanctions in place`);
      }
    }

    // Check recent trend
    if (relationship.recentTrend === 'DETERIORATING') {
      earlyWarningIndicators.push('Relationship trend is deteriorating');
    }

    // Calculate risk level
    let riskScore = 0;
    if (relationship.relationshipQuality < 30) riskScore += 30;
    if (relationship.stability < 40) riskScore += 25;
    if (escalating.length > 0) riskScore += 20;
    if (relationship.recentTrend === 'DETERIORATING') riskScore += 15;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (riskScore >= 60) riskLevel = 'CRITICAL';
    else if (riskScore >= 40) riskLevel = 'HIGH';
    else if (riskScore >= 20) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    const mitigationOptions = this.generateMitigationOptions(relationship);

    return {
      riskLevel,
      risks: relationship.riskFactors,
      earlyWarningIndicators,
      mitigationOptions
    };
  }

  /**
   * Compare multiple relationships
   */
  compareRelationships(relationships: BilateralRelationship[]): RelationshipComparison {
    if (relationships.length === 0) {
      return {
        relationships: [],
        averageQuality: 0,
        bestRelationship: { countries: [], quality: 0 },
        worstRelationship: { countries: [], quality: 0 },
        mostImproved: { countries: [], improvement: 0 },
        mostDeteriorated: { countries: [], deterioration: 0 }
      };
    }

    const averageQuality = relationships.reduce((sum, r) => sum + r.relationshipQuality, 0) / relationships.length;

    const best = relationships.reduce((best, r) =>
      r.relationshipQuality > best.relationshipQuality ? r : best
    );

    const worst = relationships.reduce((worst, r) =>
      r.relationshipQuality < worst.relationshipQuality ? r : worst
    );

    return {
      relationships,
      averageQuality,
      bestRelationship: { countries: [best.country1, best.country2], quality: best.relationshipQuality },
      worstRelationship: { countries: [worst.country1, worst.country2], quality: worst.relationshipQuality },
      mostImproved: { countries: [], improvement: 0 },
      mostDeteriorated: { countries: [], deterioration: 0 }
    };
  }

  private getRelationshipKey(country1: string, country2: string): string {
    return [country1, country2].sort().join(':');
  }

  private addToCountryIndex(country: string, relationshipKey: string): void {
    if (!this.relationshipsByCountry.has(country)) {
      this.relationshipsByCountry.set(country, new Set());
    }
    this.relationshipsByCountry.get(country)!.add(relationshipKey);
  }

  private generateRecommendations(relationship: BilateralRelationship): string[] {
    const recommendations: string[] = [];

    if (relationship.relationshipQuality < 50) {
      recommendations.push('Consider high-level diplomatic engagement to improve relations');
    }

    if (relationship.frictionPoints.length > 3) {
      recommendations.push('Establish working groups to address key friction points');
    }

    if (relationship.defenseCooperation.level === CooperationLevel.MINIMAL) {
      recommendations.push('Explore opportunities for defense and security cooperation');
    }

    if (relationship.tradeRelationship.trend === 'DECLINING') {
      recommendations.push('Review trade policies and explore new economic opportunities');
    }

    return recommendations;
  }

  private generateMitigationOptions(relationship: BilateralRelationship): string[] {
    const options: string[] = [];

    options.push('Increase diplomatic dialogue at multiple levels');
    options.push('Establish confidence-building measures');
    options.push('Explore areas of mutual interest for cooperation');

    if (relationship.frictionPoints.length > 0) {
      options.push('Initiate third-party mediation for key disputes');
    }

    return options;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalRelationships: number;
    byStatus: Record<string, number>;
    averageQuality: number;
    crisisCount: number;
  } {
    const byStatus: Record<string, number> = {};
    let totalQuality = 0;

    for (const rel of this.relationships.values()) {
      byStatus[rel.status] = (byStatus[rel.status] || 0) + 1;
      totalQuality += rel.relationshipQuality;
    }

    const crisisRelationships = this.identifyCrisisRelationships();

    return {
      totalRelationships: this.relationships.size,
      byStatus,
      averageQuality: this.relationships.size > 0 ? totalQuality / this.relationships.size : 0,
      crisisCount: crisisRelationships.length
    };
  }
}

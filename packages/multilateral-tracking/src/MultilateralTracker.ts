import {
  MultilateralOrganization,
  OrganizationType,
  MembershipStatus,
  Member,
  VotingPattern,
  PowerDynamics,
  Coalition,
  Resolution,
  OrganizationComparison,
  Activity
} from './types.js';

/**
 * MultilateralTracker
 *
 * Comprehensive tracking and analysis of multilateral organizations,
 * UN system, regional bodies, and international institutions
 */
export class MultilateralTracker {
  private organizations: Map<string, MultilateralOrganization> = new Map();
  private organizationsByType: Map<OrganizationType, Set<string>> = new Map();
  private organizationsByCountry: Map<string, Set<string>> = new Map();
  private votingPatterns: Map<string, VotingPattern[]> = new Map();
  private powerDynamics: Map<string, PowerDynamics> = new Map();

  /**
   * Track a multilateral organization
   */
  trackOrganization(org: MultilateralOrganization): void {
    this.organizations.set(org.id, org);

    // Index by type
    if (!this.organizationsByType.has(org.type)) {
      this.organizationsByType.set(org.type, new Set());
    }
    this.organizationsByType.get(org.type)!.add(org.id);

    // Index by member countries
    for (const member of org.members) {
      if (!this.organizationsByCountry.has(member.country)) {
        this.organizationsByCountry.set(member.country, new Set());
      }
      this.organizationsByCountry.get(member.country)!.add(org.id);
    }
  }

  /**
   * Get organization by ID
   */
  getOrganization(id: string): MultilateralOrganization | undefined {
    return this.organizations.get(id);
  }

  /**
   * Get organizations by type
   */
  getOrganizationsByType(type: OrganizationType): MultilateralOrganization[] {
    const orgIds = this.organizationsByType.get(type) || new Set();
    return Array.from(orgIds)
      .map(id => this.organizations.get(id))
      .filter((org): org is MultilateralOrganization => org !== undefined);
  }

  /**
   * Get organizations a country is member of
   */
  getCountryMemberships(country: string): {
    organization: MultilateralOrganization;
    membership: Member;
  }[] {
    const orgIds = this.organizationsByCountry.get(country) || new Set();
    const memberships: { organization: MultilateralOrganization; membership: Member }[] = [];

    for (const orgId of orgIds) {
      const org = this.organizations.get(orgId);
      if (org) {
        const membership = org.members.find(m => m.country === country);
        if (membership) {
          memberships.push({ organization: org, membership });
        }
      }
    }

    return memberships;
  }

  /**
   * Analyze country's multilateral engagement
   */
  analyzeCountryEngagement(country: string): {
    totalMemberships: number;
    byType: Record<string, number>;
    leadershipPositions: number;
    averageInfluence: number;
    averageParticipation: number;
    keyOrganizations: string[];
    votingPatterns: {
      organization: string;
      alignmentStrength: number;
      primaryAlignments: string[];
    }[];
  } {
    const memberships = this.getCountryMemberships(country);

    const byType: Record<string, number> = {};
    let totalInfluence = 0;
    let totalParticipation = 0;
    let leadershipCount = 0;

    for (const { organization, membership } of memberships) {
      byType[organization.type] = (byType[organization.type] || 0) + 1;
      totalInfluence += membership.influence;
      totalParticipation += membership.activeParticipation;
      leadershipCount += membership.leadership.length;
    }

    // Identify key organizations (high influence)
    const keyOrganizations = memberships
      .filter(m => m.membership.influence > 70)
      .map(m => m.organization.name)
      .slice(0, 10);

    // Analyze voting patterns
    const votingPatterns = this.analyzeVotingPatterns(country);

    return {
      totalMemberships: memberships.length,
      byType,
      leadershipPositions: leadershipCount,
      averageInfluence: memberships.length > 0 ? totalInfluence / memberships.length : 0,
      averageParticipation: memberships.length > 0 ? totalParticipation / memberships.length : 0,
      keyOrganizations,
      votingPatterns
    };
  }

  /**
   * Track voting patterns
   */
  trackVotingPattern(pattern: VotingPattern): void {
    const key = `${pattern.country}:${pattern.organization}`;
    if (!this.votingPatterns.has(key)) {
      this.votingPatterns.set(key, []);
    }
    this.votingPatterns.get(key)!.push(pattern);
  }

  /**
   * Analyze voting patterns for a country
   */
  analyzeVotingPatterns(country: string): {
    organization: string;
    alignmentStrength: number;
    primaryAlignments: string[];
  }[] {
    const patterns: {
      organization: string;
      alignmentStrength: number;
      primaryAlignments: string[];
    }[] = [];

    for (const [key, patternList] of this.votingPatterns.entries()) {
      if (key.startsWith(`${country}:`)) {
        const org = key.split(':')[1];
        const latestPattern = patternList[patternList.length - 1];

        // Calculate average alignment strength
        const avgAlignment = latestPattern.votingAlignment.reduce(
          (sum, a) => sum + a.agreementRate,
          0
        ) / (latestPattern.votingAlignment.length || 1);

        // Get top alignments
        const primaryAlignments = latestPattern.votingAlignment
          .sort((a, b) => b.agreementRate - a.agreementRate)
          .slice(0, 5)
          .map(a => a.withCountry);

        patterns.push({
          organization: org,
          alignmentStrength: avgAlignment,
          primaryAlignments
        });
      }
    }

    return patterns;
  }

  /**
   * Identify voting blocs
   */
  identifyVotingBlocs(organizationId: string): Coalition[] {
    const org = this.organizations.get(organizationId);
    if (!org) return [];

    // Analyze voting patterns to identify cohesive groups
    const blocs: Coalition[] = [];
    const votingData = new Map<string, Map<string, number>>();

    // Build alignment matrix
    for (const member of org.members) {
      const patterns = this.votingPatterns.get(`${member.country}:${org.name}`);
      if (patterns && patterns.length > 0) {
        const latest = patterns[patterns.length - 1];
        const alignmentMap = new Map<string, number>();
        for (const alignment of latest.votingAlignment) {
          alignmentMap.set(alignment.withCountry, alignment.agreementRate);
        }
        votingData.set(member.country, alignmentMap);
      }
    }

    // Simple clustering based on high mutual alignment
    const processed = new Set<string>();
    for (const [country1, alignments] of votingData.entries()) {
      if (processed.has(country1)) continue;

      const blocMembers = [country1];
      processed.add(country1);

      for (const [country2, rate] of alignments.entries()) {
        if (rate > 75 && !processed.has(country2)) {
          // Check if country2 also aligns with country1
          const reverse = votingData.get(country2)?.get(country1) || 0;
          if (reverse > 75) {
            blocMembers.push(country2);
            processed.add(country2);
          }
        }
      }

      if (blocMembers.length >= 3) {
        blocs.push({
          id: `bloc-${blocs.length + 1}`,
          name: `Voting Bloc ${blocs.length + 1}`,
          members: blocMembers,
          formed: new Date(),
          purpose: 'Strategic voting alignment',
          cohesion: 80,
          effectiveness: 70,
          achievements: [],
          challenges: []
        });
      }
    }

    return blocs;
  }

  /**
   * Analyze power dynamics within an organization
   */
  analyzePowerDynamics(organizationId: string): PowerDynamics {
    const org = this.organizations.get(organizationId);
    if (!org) {
      return {
        organization: organizationId,
        dominantActors: [],
        coalitions: [],
        competingBlocs: [],
        balanceOfPower: {
          type: 'BALANCED',
          description: 'Organization not found'
        }
      };
    }

    // Identify dominant actors
    const dominantActors = org.members
      .filter(m => m.influence > 70)
      .sort((a, b) => b.influence - a.influence)
      .slice(0, 10)
      .map(m => ({
        country: m.country,
        influence: m.influence,
        mechanisms: [
          m.votingPower === 'VETO_POWER' ? 'Veto power' : '',
          m.leadership.length > 0 ? 'Leadership positions' : '',
          m.contributions && m.contributions.length > 0 ? 'Major contributor' : ''
        ].filter(Boolean)
      }));

    // Identify coalitions
    const coalitions = this.identifyVotingBlocs(organizationId);

    // Determine balance of power
    let balanceType: 'UNIPOLAR' | 'BIPOLAR' | 'MULTIPOLAR' | 'BALANCED' = 'BALANCED';
    let description = '';

    if (dominantActors.length === 1 && dominantActors[0].influence > 80) {
      balanceType = 'UNIPOLAR';
      description = `Dominated by ${dominantActors[0].country}`;
    } else if (dominantActors.length === 2 && dominantActors[0].influence > 70) {
      balanceType = 'BIPOLAR';
      description = `Dual leadership by ${dominantActors[0].country} and ${dominantActors[1].country}`;
    } else if (dominantActors.length > 2) {
      balanceType = 'MULTIPOLAR';
      description = `Power distributed among ${dominantActors.length} major actors`;
    } else {
      description = 'Relatively balanced power distribution';
    }

    const dynamics: PowerDynamics = {
      organization: org.name,
      dominantActors,
      coalitions,
      competingBlocs: [],
      balanceOfPower: {
        type: balanceType,
        description
      }
    };

    this.powerDynamics.set(organizationId, dynamics);
    return dynamics;
  }

  /**
   * Compare effectiveness across organizations
   */
  compareOrganizationEffectiveness(
    organizationIds: string[]
  ): OrganizationComparison {
    const organizations = organizationIds
      .map(id => this.organizations.get(id))
      .filter((org): org is MultilateralOrganization => org !== undefined);

    // Calculate membership overlap
    const membershipOverlap: {
      org1: string;
      org2: string;
      sharedMembers: string[];
      overlapPercentage: number;
    }[] = [];

    for (let i = 0; i < organizations.length; i++) {
      for (let j = i + 1; j < organizations.length; j++) {
        const org1 = organizations[i];
        const org2 = organizations[j];

        const members1 = new Set(org1.members.map(m => m.country));
        const members2 = new Set(org2.members.map(m => m.country));

        const shared = Array.from(members1).filter(m => members2.has(m));
        const totalUnique = new Set([...members1, ...members2]).size;

        membershipOverlap.push({
          org1: org1.name,
          org2: org2.name,
          sharedMembers: shared,
          overlapPercentage: (shared.length / totalUnique) * 100
        });
      }
    }

    // Effectiveness ranking
    const effectivenessRanking = organizations
      .map(org => ({
        organization: org.name,
        score: org.effectiveness,
        ranking: 0
      }))
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({
        ...item,
        ranking: index + 1
      }));

    return {
      organizations,
      membershipOverlap,
      functionalOverlap: [],
      effectivenessRanking
    };
  }

  /**
   * Track resolution implementation
   */
  trackResolutionImplementation(
    organizationId: string,
    resolutionId: string
  ): {
    resolution: Resolution | undefined;
    complianceRate: number;
    fullyCompliant: string[];
    partiallyCompliant: string[];
    nonCompliant: string[];
    progress: number;
  } {
    const org = this.organizations.get(organizationId);
    const resolution = org?.resolutions.find(r => r.id === resolutionId);

    if (!resolution) {
      return {
        resolution: undefined,
        complianceRate: 0,
        fullyCompliant: [],
        partiallyCompliant: [],
        nonCompliant: [],
        progress: 0
      };
    }

    const fullyCompliant: string[] = [];
    const partiallyCompliant: string[] = [];
    const nonCompliant: string[] = [];

    for (const compliance of resolution.implementation.compliance) {
      switch (compliance.level) {
        case 'FULL':
          fullyCompliant.push(compliance.country);
          break;
        case 'PARTIAL':
        case 'MINIMAL':
          partiallyCompliant.push(compliance.country);
          break;
        case 'NON_COMPLIANT':
          nonCompliant.push(compliance.country);
          break;
      }
    }

    const totalCountries = resolution.implementation.compliance.length;
    const complianceRate = totalCountries > 0
      ? (fullyCompliant.length / totalCountries) * 100
      : 0;

    return {
      resolution,
      complianceRate,
      fullyCompliant,
      partiallyCompliant,
      nonCompliant,
      progress: resolution.implementation.progress
    };
  }

  /**
   * Analyze organization reform prospects
   */
  analyzeReformProspects(organizationId: string): {
    totalReforms: number;
    byStatus: Record<string, number>;
    supportLevel: number;
    majorObstacles: string[];
    likelyToSucceed: number;
    recommendations: string[];
  } {
    const org = this.organizations.get(organizationId);
    if (!org || !org.reformProposals) {
      return {
        totalReforms: 0,
        byStatus: {},
        supportLevel: 0,
        majorObstacles: [],
        likelyToSucceed: 0,
        recommendations: []
      };
    }

    const byStatus: Record<string, number> = {};
    let totalSupport = 0;
    const obstacles = new Set<string>();

    for (const reform of org.reformProposals) {
      byStatus[reform.status] = (byStatus[reform.status] || 0) + 1;
      totalSupport += reform.support.percentage;

      if (reform.opposition) {
        reform.opposition.reasons.forEach(r => obstacles.add(r));
      }
    }

    const avgSupport = org.reformProposals.length > 0
      ? totalSupport / org.reformProposals.length
      : 0;

    const likelyToSucceed = org.reformProposals.filter(
      r => r.support.percentage > 66 && r.status !== 'REJECTED'
    ).length;

    const recommendations = this.generateReformRecommendations(org);

    return {
      totalReforms: org.reformProposals.length,
      byStatus,
      supportLevel: avgSupport,
      majorObstacles: Array.from(obstacles),
      likelyToSucceed,
      recommendations
    };
  }

  /**
   * Monitor organization activity levels
   */
  monitorActivityLevels(): {
    organization: string;
    activityLevel: string;
    activePrograms: number;
    activeMissions: number;
    recentMeetings: number;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  }[] {
    const results: {
      organization: string;
      activityLevel: string;
      activePrograms: number;
      activeMissions: number;
      recentMeetings: number;
      trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    }[] = [];

    for (const org of this.organizations.values()) {
      const activePrograms = org.programs.filter(
        p => !p.endDate || p.endDate > new Date()
      ).length;

      const activeMissions = org.activities.filter(
        a => a.status === 'ACTIVE'
      ).length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentMeetings = org.meetings.filter(
        m => m.date >= thirtyDaysAgo
      ).length;

      // Simple trend calculation
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const olderMeetings = org.meetings.filter(
        m => m.date >= sixtyDaysAgo && m.date < thirtyDaysAgo
      ).length;

      let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
      if (recentMeetings > olderMeetings * 1.2) trend = 'INCREASING';
      else if (recentMeetings < olderMeetings * 0.8) trend = 'DECREASING';

      results.push({
        organization: org.name,
        activityLevel: org.activityLevel,
        activePrograms,
        activeMissions,
        recentMeetings,
        trend
      });
    }

    return results.sort((a, b) => b.recentMeetings - a.recentMeetings);
  }

  /**
   * Predict organization trajectory
   */
  predictOrganizationTrajectory(organizationId: string): {
    organization: string;
    currentEffectiveness: number;
    projectedEffectiveness: number;
    keyFactors: string[];
    risks: string[];
    opportunities: string[];
    confidence: number;
  } {
    const org = this.organizations.get(organizationId);
    if (!org) {
      return {
        organization: organizationId,
        currentEffectiveness: 0,
        projectedEffectiveness: 0,
        keyFactors: [],
        risks: [],
        opportunities: [],
        confidence: 0
      };
    }

    let projectedEffectiveness = org.effectiveness;
    const keyFactors: string[] = [];
    const risks: string[] = [];
    const opportunities: string[] = [];

    // Analyze cohesion
    if (org.cohesion < 50) {
      projectedEffectiveness -= 10;
      risks.push('Low member cohesion threatens effectiveness');
    } else if (org.cohesion > 80) {
      projectedEffectiveness += 5;
      keyFactors.push('Strong member cohesion');
    }

    // Analyze funding
    if (org.budget) {
      const voluntaryPercentage = org.funding
        .filter(f => f.type === 'VOLUNTARY_CONTRIBUTIONS')
        .reduce((sum, f) => sum + f.percentage, 0);

      if (voluntaryPercentage > 70) {
        risks.push('Heavy reliance on voluntary contributions creates funding uncertainty');
      }
    }

    // Analyze challenges
    if (org.currentChallenges.length > 5) {
      risks.push('Multiple concurrent challenges may overwhelm organization');
      projectedEffectiveness -= 5;
    }

    // Analyze reform potential
    if (org.reformProposals && org.reformProposals.length > 0) {
      const activeReforms = org.reformProposals.filter(
        r => r.status === 'UNDER_DISCUSSION' || r.status === 'NEGOTIATING'
      );
      if (activeReforms.length > 0) {
        opportunities.push('Active reform processes may improve effectiveness');
        projectedEffectiveness += 10;
      }
    }

    // Confidence based on data completeness
    let confidence = 70;
    if (org.members.length > 0) confidence += 10;
    if (org.activities.length > 0) confidence += 10;
    if (org.resolutions.length > 0) confidence += 10;

    return {
      organization: org.name,
      currentEffectiveness: org.effectiveness,
      projectedEffectiveness: Math.max(0, Math.min(100, projectedEffectiveness)),
      keyFactors,
      risks,
      opportunities,
      confidence: Math.min(100, confidence)
    };
  }

  private generateReformRecommendations(org: MultilateralOrganization): string[] {
    const recommendations: string[] = [];

    if (org.effectiveness < 60) {
      recommendations.push('Comprehensive effectiveness review needed');
    }

    if (org.cohesion < 50) {
      recommendations.push('Build consensus through enhanced dialogue mechanisms');
    }

    if (org.budget && org.budget.totalAmount > 0) {
      const topContributor = org.budget.topContributors[0];
      if (topContributor && topContributor.percentage > 30) {
        recommendations.push('Diversify funding sources to reduce dependency');
      }
    }

    if (org.currentChallenges.length > 5) {
      recommendations.push('Prioritize and sequence reform initiatives');
    }

    return recommendations;
  }

  /**
   * Get all organizations
   */
  getAllOrganizations(): MultilateralOrganization[] {
    return Array.from(this.organizations.values());
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalOrganizations: number;
    byType: Record<string, number>;
    averageEffectiveness: number;
    averageMemberCount: number;
    mostActiveOrganizations: string[];
  } {
    const byType: Record<string, number> = {};
    let totalEffectiveness = 0;
    let totalMembers = 0;

    for (const org of this.organizations.values()) {
      byType[org.type] = (byType[org.type] || 0) + 1;
      totalEffectiveness += org.effectiveness;
      totalMembers += org.memberCount;
    }

    const activityLevels = this.monitorActivityLevels();
    const mostActive = activityLevels
      .slice(0, 5)
      .map(a => a.organization);

    return {
      totalOrganizations: this.organizations.size,
      byType,
      averageEffectiveness: this.organizations.size > 0
        ? totalEffectiveness / this.organizations.size
        : 0,
      averageMemberCount: this.organizations.size > 0
        ? totalMembers / this.organizations.size
        : 0,
      mostActiveOrganizations: mostActive
    };
  }
}

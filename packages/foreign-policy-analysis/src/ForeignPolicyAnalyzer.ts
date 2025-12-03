import {
  ForeignPolicy,
  PolicyDomain,
  PolicyPosition,
  PolicyShift,
  NationalInterest,
  StrategicDoctrine,
  PolicyAlignment,
  PolicyComparison,
  VotingRecord
} from './types.js';

/**
 * ForeignPolicyAnalyzer
 *
 * Comprehensive analysis of foreign policy positions, strategic doctrines,
 * policy evolution, and international alignments
 */
export class ForeignPolicyAnalyzer {
  private policies: Map<string, ForeignPolicy> = new Map();
  private policiesByCountry: Map<string, Set<string>> = new Map();
  private policiesByDomain: Map<PolicyDomain, Set<string>> = new Map();
  private doctrines: Map<string, StrategicDoctrine> = new Map();
  private interests: Map<string, NationalInterest[]> = new Map();

  /**
   * Track a foreign policy position
   */
  trackPolicy(policy: ForeignPolicy): void {
    this.policies.set(policy.id, policy);

    // Index by country
    if (!this.policiesByCountry.has(policy.country)) {
      this.policiesByCountry.set(policy.country, new Set());
    }
    this.policiesByCountry.get(policy.country)!.add(policy.id);

    // Index by domain
    if (!this.policiesByDomain.has(policy.domain)) {
      this.policiesByDomain.set(policy.domain, new Set());
    }
    this.policiesByDomain.get(policy.domain)!.add(policy.id);
  }

  /**
   * Track strategic doctrine
   */
  trackDoctrine(doctrine: StrategicDoctrine): void {
    this.doctrines.set(`${doctrine.country}:${doctrine.name}`, doctrine);
  }

  /**
   * Track national interests
   */
  trackNationalInterest(interest: NationalInterest): void {
    if (!this.interests.has(interest.country)) {
      this.interests.set(interest.country, []);
    }
    this.interests.get(interest.country)!.push(interest);
  }

  /**
   * Get policies for a country
   */
  getPoliciesByCountry(country: string): ForeignPolicy[] {
    const policyIds = this.policiesByCountry.get(country) || new Set();
    return Array.from(policyIds)
      .map(id => this.policies.get(id))
      .filter((p): p is ForeignPolicy => p !== undefined);
  }

  /**
   * Get policies by domain
   */
  getPoliciesByDomain(domain: PolicyDomain): ForeignPolicy[] {
    const policyIds = this.policiesByDomain.get(domain) || new Set();
    return Array.from(policyIds)
      .map(id => this.policies.get(id))
      .filter((p): p is ForeignPolicy => p !== undefined);
  }

  /**
   * Detect policy shifts
   */
  detectPolicyShifts(country: string, days: number = 365): PolicyShift[] {
    const policies = this.getPoliciesByCountry(country);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const shifts: PolicyShift[] = [];

    for (const policy of policies) {
      if (policy.shiftHistory) {
        const recentShifts = policy.shiftHistory.filter(s => s.date >= cutoffDate);
        shifts.push(...recentShifts);
      }
    }

    return shifts.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Analyze voting patterns
   */
  analyzeVotingPatterns(country: string): {
    totalVotes: number;
    voteDistribution: Record<string, number>;
    topicsVotedOn: string[];
    alignmentWithMajority: number;
    frequentCosponsors: { country: string; count: number }[];
  } {
    const policies = this.getPoliciesByCountry(country);
    const allVotes: VotingRecord[] = [];

    for (const policy of policies) {
      allVotes.push(...policy.votingRecords);
    }

    const voteDistribution: Record<string, number> = {
      YES: 0,
      NO: 0,
      ABSTAIN: 0,
      ABSENT: 0
    };

    const topics = new Set<string>();

    for (const vote of allVotes) {
      voteDistribution[vote.vote]++;
      topics.add(vote.topic);
    }

    // Calculate alignment with majority (simplified)
    const alignmentWithMajority = allVotes.filter(v => v.vote === 'YES').length / allVotes.length * 100;

    return {
      totalVotes: allVotes.length,
      voteDistribution,
      topicsVotedOn: Array.from(topics),
      alignmentWithMajority,
      frequentCosponsors: []
    };
  }

  /**
   * Calculate policy alignment between two countries
   */
  calculatePolicyAlignment(country1: string, country2: string): PolicyAlignment {
    const policies1 = this.getPoliciesByCountry(country1);
    const policies2 = this.getPoliciesByCountry(country2);

    const domainAlignment: Map<PolicyDomain, { alignment: number; count: number }> = new Map();
    const similarities: string[] = [];
    const differences: string[] = [];

    for (const p1 of policies1) {
      const p2 = policies2.find(p => p.domain === p1.domain && p.topic === p1.topic);
      if (p2) {
        const alignment = this.calculatePositionAlignment(p1.position, p2.position);

        if (!domainAlignment.has(p1.domain)) {
          domainAlignment.set(p1.domain, { alignment: 0, count: 0 });
        }

        const current = domainAlignment.get(p1.domain)!;
        current.alignment += alignment;
        current.count++;

        if (alignment > 80) {
          similarities.push(`${p1.topic}: Both ${p1.position}`);
        } else if (alignment < 30) {
          differences.push(`${p1.topic}: ${country1} ${p1.position} vs ${country2} ${p2.position}`);
        }
      }
    }

    const domainAlignmentArray = Array.from(domainAlignment.entries()).map(([domain, { alignment, count }]) => ({
      domain,
      alignment: alignment / count,
      trend: 'STABLE' as const
    }));

    const overallAlignment = domainAlignmentArray.length > 0
      ? domainAlignmentArray.reduce((sum, d) => sum + d.alignment, 0) / domainAlignmentArray.length
      : 0;

    let trajectory: 'IMPROVING' | 'STABLE' | 'DETERIORATING' = 'STABLE';
    if (overallAlignment > 70) trajectory = 'IMPROVING';
    else if (overallAlignment < 40) trajectory = 'DETERIORATING';

    return {
      country1,
      country2,
      overallAlignment,
      domainAlignment: domainAlignmentArray,
      keySimilarities: similarities.slice(0, 10),
      keyDifferences: differences.slice(0, 10),
      trajectory,
      outlook: this.generateAlignmentOutlook(overallAlignment, trajectory)
    };
  }

  /**
   * Compare policies across multiple countries
   */
  comparePolicies(countries: string[], domain: PolicyDomain, topic: string): PolicyComparison {
    const positions: {
      country: string;
      position: PolicyPosition;
      rationale: string;
    }[] = [];

    for (const country of countries) {
      const policies = this.getPoliciesByCountry(country);
      const policy = policies.find(p => p.domain === domain && p.topic === topic);

      if (policy) {
        positions.push({
          country,
          position: policy.position,
          rationale: policy.officialStatement
        });
      }
    }

    // Categorize into spectrum
    const mostHawkish = positions
      .filter(p => p.position === PolicyPosition.STRONGLY_OPPOSE || p.position === PolicyPosition.OPPOSE)
      .map(p => p.country);

    const moderate = positions
      .filter(p => p.position === PolicyPosition.NEUTRAL || p.position === PolicyPosition.CONDITIONAL)
      .map(p => p.country);

    const mostDovish = positions
      .filter(p => p.position === PolicyPosition.STRONGLY_SUPPORT || p.position === PolicyPosition.SUPPORT)
      .map(p => p.country);

    // Detect coalitions
    const coalitions = this.detectCoalitions(positions);

    return {
      countries,
      domain,
      topic,
      positions,
      spectrum: {
        mostHawkish,
        moderate,
        mostDovish
      },
      coalitions,
      outliers: []
    };
  }

  /**
   * Analyze policy consistency over time
   */
  analyzePolicyConsistency(country: string, domain?: PolicyDomain): {
    overallConsistency: number;
    volatilePolicies: string[];
    stablePolicies: string[];
    majorReversals: PolicyShift[];
  } {
    let policies = this.getPoliciesByCountry(country);

    if (domain) {
      policies = policies.filter(p => p.domain === domain);
    }

    const consistencyScores = policies.map(p => p.consistency);
    const overallConsistency = consistencyScores.length > 0
      ? consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length
      : 0;

    const volatilePolicies = policies
      .filter(p => p.trendDirection === 'VOLATILE')
      .map(p => p.topic);

    const stablePolicies = policies
      .filter(p => p.trendDirection === 'STABLE' && p.consistency > 80)
      .map(p => p.topic);

    const majorReversals: PolicyShift[] = [];
    for (const policy of policies) {
      if (policy.shiftHistory) {
        const reversals = policy.shiftHistory.filter(s =>
          s.shiftType === 'MAJOR_REVERSAL' && s.magnitude >= 7
        );
        majorReversals.push(...reversals);
      }
    }

    return {
      overallConsistency,
      volatilePolicies,
      stablePolicies,
      majorReversals: majorReversals.sort((a, b) => b.date.getTime() - a.date.getTime())
    };
  }

  /**
   * Predict policy evolution
   */
  predictPolicyEvolution(country: string, domain: PolicyDomain): {
    domain: PolicyDomain;
    currentTrend: string;
    predictedDirection: 'HARDENING' | 'SOFTENING' | 'STABLE';
    confidence: number;
    indicators: string[];
    timeframe: string;
  } {
    const policies = this.getPoliciesByCountry(country).filter(p => p.domain === domain);

    if (policies.length === 0) {
      return {
        domain,
        currentTrend: 'UNKNOWN',
        predictedDirection: 'STABLE',
        confidence: 0,
        indicators: [],
        timeframe: 'N/A'
      };
    }

    // Analyze trends
    const hardening = policies.filter(p => p.trendDirection === 'HARDENING').length;
    const softening = policies.filter(p => p.trendDirection === 'SOFTENING').length;
    const stable = policies.filter(p => p.trendDirection === 'STABLE').length;

    let predictedDirection: 'HARDENING' | 'SOFTENING' | 'STABLE' = 'STABLE';
    if (hardening > softening && hardening > stable) predictedDirection = 'HARDENING';
    else if (softening > hardening && softening > stable) predictedDirection = 'SOFTENING';

    const confidence = Math.max(hardening, softening, stable) / policies.length * 100;

    const indicators = this.identifyPolicyIndicators(policies, predictedDirection);

    return {
      domain,
      currentTrend: `${hardening} hardening, ${softening} softening, ${stable} stable`,
      predictedDirection,
      confidence,
      indicators,
      timeframe: '6-12 months'
    };
  }

  /**
   * Get national interests for a country
   */
  getNationalInterests(country: string, category?: 'VITAL' | 'IMPORTANT' | 'PERIPHERAL'): NationalInterest[] {
    const interests = this.interests.get(country) || [];
    if (category) {
      return interests.filter(i => i.category === category);
    }
    return interests;
  }

  /**
   * Analyze doctrine-policy alignment
   */
  analyzeDoctrineAlignment(country: string, doctrineName: string): {
    alignment: number;
    consistentPolicies: string[];
    inconsistentPolicies: string[];
    recommendations: string[];
  } {
    const doctrine = this.doctrines.get(`${country}:${doctrineName}`);
    if (!doctrine) {
      return {
        alignment: 0,
        consistentPolicies: [],
        inconsistentPolicies: [],
        recommendations: ['Doctrine not found']
      };
    }

    const policies = this.getPoliciesByCountry(country);
    const consistentPolicies: string[] = [];
    const inconsistentPolicies: string[] = [];

    for (const policy of policies) {
      // Simplified alignment check
      if (policy.consistency > 70) {
        consistentPolicies.push(policy.topic);
      } else {
        inconsistentPolicies.push(policy.topic);
      }
    }

    const alignment = policies.length > 0
      ? (consistentPolicies.length / policies.length) * 100
      : 0;

    const recommendations = [];
    if (alignment < 60) {
      recommendations.push('Consider revising doctrine to match actual policies');
      recommendations.push('Increase coordination between policy formulation and implementation');
    }

    return {
      alignment,
      consistentPolicies,
      inconsistentPolicies,
      recommendations
    };
  }

  private calculatePositionAlignment(pos1: PolicyPosition, pos2: PolicyPosition): number {
    if (pos1 === pos2) return 100;

    const positions = [
      PolicyPosition.STRONGLY_OPPOSE,
      PolicyPosition.OPPOSE,
      PolicyPosition.NEUTRAL,
      PolicyPosition.SUPPORT,
      PolicyPosition.STRONGLY_SUPPORT
    ];

    const idx1 = positions.indexOf(pos1);
    const idx2 = positions.indexOf(pos2);

    if (idx1 === -1 || idx2 === -1) return 50; // Unknown positions

    const distance = Math.abs(idx1 - idx2);
    return Math.max(0, 100 - (distance * 25));
  }

  private generateAlignmentOutlook(alignment: number, trajectory: string): string {
    if (alignment > 80) {
      return 'Strong strategic partnership with high policy coherence';
    } else if (alignment > 60) {
      return 'Significant alignment with areas of cooperation';
    } else if (alignment > 40) {
      return 'Mixed alignment with both cooperation and competition';
    } else {
      return 'Low alignment with significant policy divergence';
    }
  }

  private detectCoalitions(positions: { country: string; position: PolicyPosition }[]): {
    name: string;
    members: string[];
    position: string;
  }[] {
    const coalitions: Map<PolicyPosition, string[]> = new Map();

    for (const { country, position } of positions) {
      if (!coalitions.has(position)) {
        coalitions.set(position, []);
      }
      coalitions.get(position)!.push(country);
    }

    return Array.from(coalitions.entries())
      .filter(([_, members]) => members.length > 1)
      .map(([position, members]) => ({
        name: `${position} Coalition`,
        members,
        position: position.toString()
      }));
  }

  private identifyPolicyIndicators(policies: ForeignPolicy[], direction: string): string[] {
    const indicators: string[] = [];

    for (const policy of policies) {
      if (policy.trendDirection === direction) {
        if (policy.policyDocuments.length > 0) {
          indicators.push(`Recent policy documents on ${policy.topic}`);
        }
        if (policy.speeches.length > 0) {
          indicators.push(`Leadership speeches emphasizing ${policy.topic}`);
        }
      }
    }

    return indicators.slice(0, 5);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalPolicies: number;
    policiesByDomain: Record<string, number>;
    countriesTracked: number;
    doctrinesTracked: number;
  } {
    const policiesByDomain: Record<string, number> = {};

    for (const policy of this.policies.values()) {
      policiesByDomain[policy.domain] = (policiesByDomain[policy.domain] || 0) + 1;
    }

    return {
      totalPolicies: this.policies.size,
      policiesByDomain,
      countriesTracked: this.policiesByCountry.size,
      doctrinesTracked: this.doctrines.size
    };
  }
}

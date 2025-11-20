/**
 * Radicalization Monitor
 * Monitors and detects radicalization pathways and indicators
 */

import type {
  RadicalizationProfile,
  OnlineRadicalization,
  ExtremistContent,
  SocialNetworkInfluence,
  IdeologicalEvolution,
  DetectionQuery,
  DetectionResult,
  RadicalizationTrend
} from './types.js';

export class RadicalizationMonitor {
  private profiles: Map<string, RadicalizationProfile> = new Map();
  private onlineActivity: Map<string, OnlineRadicalization> = new Map();
  private content: Map<string, ExtremistContent> = new Map();
  private socialNetworks: Map<string, SocialNetworkInfluence> = new Map();
  private ideologicalEvolution: Map<string, IdeologicalEvolution> = new Map();

  /**
   * Create or update radicalization profile
   */
  async monitorIndividual(profile: RadicalizationProfile): Promise<void> {
    this.profiles.set(profile.individualId, profile);
    await this.assessRisk(profile.individualId);
  }

  /**
   * Track online radicalization activity
   */
  async trackOnlineActivity(activity: OnlineRadicalization): Promise<void> {
    this.onlineActivity.set(activity.individualId, activity);
    await this.analyzeOnlinePathway(activity);
  }

  /**
   * Register extremist content
   */
  async registerContent(content: ExtremistContent): Promise<void> {
    this.content.set(content.id, content);
    await this.analyzePropagation(content);
  }

  /**
   * Analyze social network influence
   */
  async analyzeSocialNetwork(network: SocialNetworkInfluence): Promise<void> {
    this.socialNetworks.set(network.individualId, network);
  }

  /**
   * Track ideological evolution
   */
  async trackIdeologicalChange(evolution: IdeologicalEvolution): Promise<void> {
    this.ideologicalEvolution.set(evolution.individualId, evolution);
  }

  /**
   * Query radicalization profiles
   */
  async queryProfiles(query: DetectionQuery): Promise<DetectionResult> {
    let filtered = Array.from(this.profiles.values());

    if (query.status && query.status.length > 0) {
      filtered = filtered.filter(p => query.status!.includes(p.status));
    }

    if (query.stages && query.stages.length > 0) {
      filtered = filtered.filter(p => query.stages!.includes(p.stage));
    }

    if (query.pathways && query.pathways.length > 0) {
      filtered = filtered.filter(p => query.pathways!.includes(p.pathway.primary));
    }

    if (query.minRiskScore !== undefined) {
      filtered = filtered.filter(p => p.riskScore >= query.minRiskScore!);
    }

    const highRisk = filtered.filter(p => p.riskScore >= 0.7);
    const trends = this.calculateTrends(filtered);

    return {
      profiles: filtered,
      totalCount: filtered.length,
      highRisk,
      trends
    };
  }

  /**
   * Get complete radicalization analysis for individual
   */
  async getIndividualAnalysis(individualId: string) {
    return {
      profile: this.profiles.get(individualId),
      onlineActivity: this.onlineActivity.get(individualId),
      socialNetwork: this.socialNetworks.get(individualId),
      ideologicalEvolution: this.ideologicalEvolution.get(individualId)
    };
  }

  /**
   * Identify gateway content
   */
  async identifyGatewayContent(): Promise<ExtremistContent[]> {
    return Array.from(this.content.values()).filter(
      c => c.extremismLevel === 'GATEWAY'
    );
  }

  /**
   * Detect echo chambers
   */
  async detectEchoChambers(individualId: string) {
    const activity = this.onlineActivity.get(individualId);
    return activity?.echoChambers || [];
  }

  /**
   * Recommend interventions
   */
  async recommendInterventions(individualId: string): Promise<{
    recommended: Array<{ type: string; priority: string; description: string }>;
    timing: string;
  }> {
    const profile = this.profiles.get(individualId);
    if (!profile) {
      return { recommended: [], timing: 'N/A' };
    }

    const recommendations: Array<{ type: string; priority: string; description: string }> = [];

    if (profile.stage === 'PRE_RADICALIZATION' || profile.stage === 'IDENTIFICATION') {
      recommendations.push({
        type: 'COMMUNITY_PROGRAM',
        priority: 'HIGH',
        description: 'Engage with community programs and positive role models'
      });
      recommendations.push({
        type: 'EDUCATION',
        priority: 'HIGH',
        description: 'Provide critical thinking and media literacy education'
      });
    }

    if (profile.pathway.primary === 'ONLINE') {
      recommendations.push({
        type: 'COUNTER_NARRATIVE',
        priority: 'HIGH',
        description: 'Expose to counter-narratives and alternative perspectives'
      });
    }

    if (profile.riskScore >= 0.7) {
      recommendations.push({
        type: 'LAW_ENFORCEMENT',
        priority: 'CRITICAL',
        description: 'Consider law enforcement intervention'
      });
    }

    const timing = profile.stage === 'ACTION' ? 'IMMEDIATE' :
                   profile.stage === 'INDOCTRINATION' ? 'URGENT' : 'SOON';

    return { recommended: recommendations, timing };
  }

  /**
   * Private helper methods
   */

  private async assessRisk(individualId: string): Promise<void> {
    const profile = this.profiles.get(individualId);
    if (!profile) return;

    let risk = 0;

    // Stage-based risk
    const stageRisk = {
      'PRE_RADICALIZATION': 0.2,
      'IDENTIFICATION': 0.4,
      'INDOCTRINATION': 0.7,
      'ACTION': 0.95
    };
    risk += stageRisk[profile.stage] * 0.4;

    // Indicator-based risk
    const criticalIndicators = profile.indicators.filter(
      i => i.severity === 'CRITICAL'
    ).length;
    risk += Math.min(criticalIndicators * 0.1, 0.3);

    // Influence-based risk
    const highImpactInfluences = profile.influences.filter(
      i => i.impact === 'HIGH'
    ).length;
    risk += Math.min(highImpactInfluences * 0.05, 0.2);

    // Online activity risk
    const online = this.onlineActivity.get(individualId);
    if (online) {
      const extremeContent = online.contentExposure.filter(
        c => c.extremismLevel === 'EXTREME'
      ).length;
      risk += Math.min(extremeContent * 0.02, 0.1);
    }

    profile.riskScore = Math.min(risk, 1.0);
  }

  private async analyzeOnlinePathway(activity: OnlineRadicalization): Promise<void> {
    // Analysis implementation
  }

  private async analyzePropagation(content: ExtremistContent): Promise<void> {
    // Propagation analysis implementation
  }

  private calculateTrends(profiles: RadicalizationProfile[]): RadicalizationTrend[] {
    return [
      {
        type: 'Radicalization',
        direction: 'STABLE',
        magnitude: profiles.length,
        period: '30-days',
        description: `${profiles.length} individuals under monitoring`
      }
    ];
  }
}

/**
 * Advanced Persistent Threat (APT) Tracker
 *
 * Sophisticated tracking of nation-state and advanced threat actors
 * with behavioral analysis and predictive capabilities
 */

import type {
  APTGroup,
  CyberCampaign,
  MalwareAnalysis,
  ZeroDay
} from '../types.js';

export interface APTActivityPattern {
  actorId: string;
  timePattern: {
    activeHours: number[];
    activeDays: number[];
    timezone: string;
  };
  targetingPattern: {
    sectors: Map<string, number>;
    countries: Map<string, number>;
    organizationTypes: Map<string, number>;
  };
  operationalPattern: {
    initialAccessPreference: string[];
    dwellTimeAverage: number;
    exfilMethods: string[];
    cleanupBehavior: string;
  };
}

export interface ThreatPrediction {
  actorId: string;
  predictedTargets: Array<{
    target: string;
    probability: number;
    reasoning: string[];
  }>;
  predictedTTPs: Array<{
    technique: string;
    probability: number;
    lastUsed: Date;
  }>;
  predictedTimeframe: {
    earliest: Date;
    latest: Date;
    confidence: number;
  };
  riskScore: number;
}

export interface ActorCorrelation {
  actor1: string;
  actor2: string;
  correlationType: 'INFRASTRUCTURE' | 'MALWARE' | 'TTP' | 'TIMING' | 'TARGETING';
  strength: number;
  evidence: string[];
  possibleRelationship: 'SAME_GROUP' | 'AFFILIATED' | 'SHARED_TOOLS' | 'COINCIDENTAL';
}

export class APTTracker {
  private actors: Map<string, APTGroup> = new Map();
  private campaigns: Map<string, CyberCampaign> = new Map();
  private malware: Map<string, MalwareAnalysis> = new Map();
  private zeroDays: Map<string, ZeroDay> = new Map();
  private activityPatterns: Map<string, APTActivityPattern> = new Map();

  // Known APT Groups Database
  private aptDatabase: Map<string, APTGroup> = new Map();

  constructor() {
    this.initializeAPTDatabase();
  }

  /**
   * Track new APT activity
   */
  async trackActivity(activity: any): Promise<{
    actorId: string | null;
    confidence: number;
    matchedIndicators: string[];
    recommendedActions: string[];
  }> {
    const indicators = this.extractIndicators(activity);
    const matches = await this.matchToKnownActors(indicators);

    if (matches.length === 0) {
      return {
        actorId: null,
        confidence: 0,
        matchedIndicators: [],
        recommendedActions: ['Create new actor profile', 'Collect additional indicators']
      };
    }

    const bestMatch = matches[0];

    // Update activity pattern
    this.updateActivityPattern(bestMatch.actorId, activity);

    return {
      actorId: bestMatch.actorId,
      confidence: bestMatch.confidence,
      matchedIndicators: bestMatch.indicators,
      recommendedActions: this.generateRecommendations(bestMatch)
    };
  }

  /**
   * Analyze campaign for APT attribution
   */
  async analyzeCampaign(campaign: CyberCampaign): Promise<{
    attribution: {
      actorId: string;
      confidence: number;
      evidence: string[];
    } | null;
    relatedCampaigns: string[];
    ttpsUsed: string[];
    sophisticationAssessment: string;
  }> {
    // Extract TTPs from campaign
    const ttps = this.extractCampaignTTPs(campaign);

    // Match against known actor TTPs
    const actorMatches = this.matchTTPsToActors(ttps);

    // Analyze infrastructure overlaps
    const infraOverlaps = this.analyzeInfrastructureOverlaps(campaign);

    // Analyze malware relationships
    const malwareRelations = await this.analyzeMalwareRelationships(campaign.malwareUsed);

    // Calculate combined attribution
    const attribution = this.calculateAttribution(
      actorMatches,
      infraOverlaps,
      malwareRelations
    );

    // Find related campaigns
    const relatedCampaigns = this.findRelatedCampaigns(campaign);

    return {
      attribution,
      relatedCampaigns,
      ttpsUsed: ttps,
      sophisticationAssessment: this.assessSophistication(campaign)
    };
  }

  /**
   * Predict future APT activity
   */
  async predictActivity(actorId: string): Promise<ThreatPrediction> {
    const actor = this.actors.get(actorId) || this.aptDatabase.get(actorId);
    if (!actor) {
      throw new Error(`Unknown actor: ${actorId}`);
    }

    const pattern = this.activityPatterns.get(actorId);
    const historicalCampaigns = this.getActorCampaigns(actorId);

    // Predict targets based on historical patterns
    const predictedTargets = this.predictTargets(actor, pattern, historicalCampaigns);

    // Predict TTPs based on evolution patterns
    const predictedTTPs = this.predictTTPs(actor, historicalCampaigns);

    // Predict timing based on activity patterns
    const predictedTimeframe = this.predictTiming(pattern);

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(actor, predictedTargets, predictedTTPs);

    return {
      actorId,
      predictedTargets,
      predictedTTPs,
      predictedTimeframe,
      riskScore
    };
  }

  /**
   * Find correlations between APT groups
   */
  async findActorCorrelations(actorId: string): Promise<ActorCorrelation[]> {
    const correlations: ActorCorrelation[] = [];
    const actor = this.actors.get(actorId) || this.aptDatabase.get(actorId);

    if (!actor) {
      return correlations;
    }

    // Check infrastructure overlaps with other actors
    for (const [otherId, otherActor] of this.aptDatabase) {
      if (otherId === actorId) continue;

      const infraCorr = this.calculateInfrastructureCorrelation(actor, otherActor);
      if (infraCorr > 0.3) {
        correlations.push({
          actor1: actorId,
          actor2: otherId,
          correlationType: 'INFRASTRUCTURE',
          strength: infraCorr,
          evidence: ['Shared C2 infrastructure patterns'],
          possibleRelationship: infraCorr > 0.7 ? 'SAME_GROUP' : 'AFFILIATED'
        });
      }

      const ttpCorr = this.calculateTTPCorrelation(actor, otherActor);
      if (ttpCorr > 0.4) {
        correlations.push({
          actor1: actorId,
          actor2: otherId,
          correlationType: 'TTP',
          strength: ttpCorr,
          evidence: ['Similar attack techniques and procedures'],
          possibleRelationship: ttpCorr > 0.8 ? 'SAME_GROUP' : 'SHARED_TOOLS'
        });
      }
    }

    return correlations;
  }

  /**
   * Track zero-day usage by APTs
   */
  async trackZeroDay(zeroDay: ZeroDay): Promise<void> {
    this.zeroDays.set(zeroDay.id, zeroDay);

    // If attributed to an actor, update their capabilities
    if (zeroDay.attributedActor) {
      const actor = this.actors.get(zeroDay.attributedActor);
      if (actor) {
        actor.capabilities.zeroDay = true;
        actor.lastActivity = new Date();
      }
    }
  }

  /**
   * Generate tactical threat brief
   */
  async generateThreatBrief(actorIds: string[]): Promise<{
    actors: Array<{
      id: string;
      name: string;
      threatLevel: string;
      recentActivity: string;
    }>;
    activeCampaigns: number;
    activeZeroDays: number;
    keyRecommendations: string[];
    priorityIndicators: Array<{
      type: string;
      value: string;
      actor: string;
    }>;
  }> {
    const actors = actorIds
      .map(id => this.actors.get(id) || this.aptDatabase.get(id))
      .filter((a): a is APTGroup => a !== undefined);

    const activeCampaigns = Array.from(this.campaigns.values())
      .filter(c => c.status === 'ACTIVE').length;

    const activeZeroDays = Array.from(this.zeroDays.values())
      .filter(z => z.status === 'UNPATCHED' && z.exploitedInWild).length;

    const priorityIndicators = this.getPriorityIndicators(actors);

    return {
      actors: actors.map(a => ({
        id: a.id,
        name: a.name,
        threatLevel: this.assessThreatLevel(a),
        recentActivity: this.getRecentActivitySummary(a.id)
      })),
      activeCampaigns,
      activeZeroDays,
      keyRecommendations: this.generateKeyRecommendations(actors),
      priorityIndicators
    };
  }

  // Private helper methods

  private initializeAPTDatabase(): void {
    // Initialize with known APT profiles
    // This would normally be loaded from threat intelligence feeds
  }

  private extractIndicators(activity: any): string[] {
    const indicators: string[] = [];
    // Extract IPs, domains, hashes, etc.
    return indicators;
  }

  private async matchToKnownActors(indicators: string[]): Promise<Array<{
    actorId: string;
    confidence: number;
    indicators: string[];
  }>> {
    const matches: Array<{
      actorId: string;
      confidence: number;
      indicators: string[];
    }> = [];

    for (const [actorId, actor] of this.aptDatabase) {
      const matchedIndicators = this.findMatchingIndicators(indicators, actor);
      if (matchedIndicators.length > 0) {
        matches.push({
          actorId,
          confidence: this.calculateMatchConfidence(matchedIndicators, actor),
          indicators: matchedIndicators
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private findMatchingIndicators(indicators: string[], actor: APTGroup): string[] {
    const matched: string[] = [];
    // Compare against actor's known infrastructure
    for (const indicator of indicators) {
      if (actor.infrastructure.knownDomains.includes(indicator) ||
          actor.infrastructure.knownIPs.includes(indicator)) {
        matched.push(indicator);
      }
    }
    return matched;
  }

  private calculateMatchConfidence(matchedIndicators: string[], actor: APTGroup): number {
    // Calculate confidence based on number and quality of matches
    const baseScore = Math.min(matchedIndicators.length * 15, 60);
    const recencyBonus = this.isRecentlyActive(actor) ? 20 : 0;
    return Math.min(baseScore + recencyBonus + 20, 100);
  }

  private isRecentlyActive(actor: APTGroup): boolean {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return actor.lastActivity > thirtyDaysAgo;
  }

  private updateActivityPattern(actorId: string, activity: any): void {
    let pattern = this.activityPatterns.get(actorId);
    if (!pattern) {
      pattern = {
        actorId,
        timePattern: {
          activeHours: [],
          activeDays: [],
          timezone: 'UTC'
        },
        targetingPattern: {
          sectors: new Map(),
          countries: new Map(),
          organizationTypes: new Map()
        },
        operationalPattern: {
          initialAccessPreference: [],
          dwellTimeAverage: 0,
          exfilMethods: [],
          cleanupBehavior: 'UNKNOWN'
        }
      };
      this.activityPatterns.set(actorId, pattern);
    }

    // Update patterns based on new activity
    const hour = new Date(activity.timestamp).getHours();
    const day = new Date(activity.timestamp).getDay();

    if (!pattern.timePattern.activeHours.includes(hour)) {
      pattern.timePattern.activeHours.push(hour);
    }
    if (!pattern.timePattern.activeDays.includes(day)) {
      pattern.timePattern.activeDays.push(day);
    }
  }

  private generateRecommendations(match: {
    actorId: string;
    confidence: number;
    indicators: string[];
  }): string[] {
    const recommendations: string[] = [];

    if (match.confidence > 80) {
      recommendations.push('High-confidence attribution - initiate full incident response');
      recommendations.push('Block all known actor infrastructure');
      recommendations.push('Hunt for additional compromise indicators');
    } else if (match.confidence > 50) {
      recommendations.push('Medium-confidence attribution - collect additional evidence');
      recommendations.push('Implement monitoring for known actor TTPs');
    } else {
      recommendations.push('Low-confidence attribution - continue investigation');
    }

    return recommendations;
  }

  private extractCampaignTTPs(campaign: CyberCampaign): string[] {
    const ttps: string[] = [];
    ttps.push(campaign.initialAccess.vector);
    campaign.killChainPhases.forEach(phase => {
      if (phase.observed) {
        ttps.push(phase.phase);
      }
    });
    return ttps;
  }

  private matchTTPsToActors(ttps: string[]): Map<string, number> {
    const matches = new Map<string, number>();
    // Match TTPs against known actor patterns
    return matches;
  }

  private analyzeInfrastructureOverlaps(campaign: CyberCampaign): Map<string, number> {
    const overlaps = new Map<string, number>();
    // Analyze infrastructure for overlaps with known actors
    return overlaps;
  }

  private async analyzeMalwareRelationships(malwareIds: string[]): Promise<Map<string, number>> {
    const relationships = new Map<string, number>();
    // Analyze malware code similarity and relationships
    return relationships;
  }

  private calculateAttribution(
    actorMatches: Map<string, number>,
    infraOverlaps: Map<string, number>,
    malwareRelations: Map<string, number>
  ): {
    actorId: string;
    confidence: number;
    evidence: string[];
  } | null {
    // Combine all evidence for attribution
    return null;
  }

  private findRelatedCampaigns(campaign: CyberCampaign): string[] {
    const related: string[] = [];
    // Find campaigns with overlapping indicators or TTPs
    return related;
  }

  private assessSophistication(campaign: CyberCampaign): string {
    let score = 0;

    if (campaign.initialAccess.vector === 'ZERO_DAY') score += 30;
    if (campaign.initialAccess.vector === 'SUPPLY_CHAIN') score += 25;
    if (campaign.killChainPhases.filter(p => p.observed).length >= 5) score += 20;
    if (campaign.dataExfiltrated.detected) score += 15;

    if (score >= 60) return 'ELITE';
    if (score >= 40) return 'ADVANCED';
    if (score >= 20) return 'INTERMEDIATE';
    return 'BASIC';
  }

  private getActorCampaigns(actorId: string): CyberCampaign[] {
    return Array.from(this.campaigns.values())
      .filter(c => c.attributedActor === actorId);
  }

  private predictTargets(
    actor: APTGroup,
    pattern: APTActivityPattern | undefined,
    campaigns: CyberCampaign[]
  ): Array<{ target: string; probability: number; reasoning: string[] }> {
    const predictions: Array<{ target: string; probability: number; reasoning: string[] }> = [];

    // Predict based on historical targeting
    for (const sector of actor.targetSectors) {
      predictions.push({
        target: sector,
        probability: 0.7,
        reasoning: ['Historical targeting preference', 'Strategic value to sponsor']
      });
    }

    return predictions;
  }

  private predictTTPs(
    actor: APTGroup,
    campaigns: CyberCampaign[]
  ): Array<{ technique: string; probability: number; lastUsed: Date }> {
    return actor.knownTTPs.map(ttp => ({
      technique: ttp.technique,
      probability: 0.8,
      lastUsed: actor.lastActivity
    }));
  }

  private predictTiming(pattern: APTActivityPattern | undefined): {
    earliest: Date;
    latest: Date;
    confidence: number;
  } {
    const now = new Date();
    return {
      earliest: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      latest: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      confidence: 40
    };
  }

  private calculateRiskScore(
    actor: APTGroup,
    targets: any[],
    ttps: any[]
  ): number {
    let score = 0;

    // Factor in actor sophistication
    switch (actor.sophisticationLevel) {
      case 'ELITE': score += 40; break;
      case 'ADVANCED': score += 30; break;
      case 'INTERMEDIATE': score += 20; break;
      case 'BASIC': score += 10; break;
    }

    // Factor in capabilities
    if (actor.capabilities.zeroDay) score += 15;
    if (actor.capabilities.supplyChain) score += 15;
    if (actor.capabilities.insiderRecruitment) score += 10;

    // Factor in recent activity
    if (this.isRecentlyActive(actor)) score += 20;

    return Math.min(score, 100);
  }

  private calculateInfrastructureCorrelation(actor1: APTGroup, actor2: APTGroup): number {
    // Calculate overlap in infrastructure
    const shared = actor1.infrastructure.knownIPs
      .filter(ip => actor2.infrastructure.knownIPs.includes(ip)).length;

    const total = new Set([
      ...actor1.infrastructure.knownIPs,
      ...actor2.infrastructure.knownIPs
    ]).size;

    return total > 0 ? shared / total : 0;
  }

  private calculateTTPCorrelation(actor1: APTGroup, actor2: APTGroup): number {
    const ttps1 = new Set(actor1.knownTTPs.map(t => t.technique));
    const ttps2 = new Set(actor2.knownTTPs.map(t => t.technique));

    const shared = Array.from(ttps1).filter(t => ttps2.has(t)).length;
    const total = new Set([...ttps1, ...ttps2]).size;

    return total > 0 ? shared / total : 0;
  }

  private assessThreatLevel(actor: APTGroup): string {
    if (actor.sophisticationLevel === 'ELITE' && actor.capabilities.zeroDay) {
      return 'CRITICAL';
    }
    if (actor.sophisticationLevel === 'ADVANCED') {
      return 'HIGH';
    }
    if (actor.sophisticationLevel === 'INTERMEDIATE') {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private getRecentActivitySummary(actorId: string): string {
    const campaigns = this.getActorCampaigns(actorId);
    const active = campaigns.filter(c => c.status === 'ACTIVE');
    if (active.length > 0) {
      return `${active.length} active campaign(s)`;
    }
    return 'No recent activity';
  }

  private getPriorityIndicators(actors: APTGroup[]): Array<{
    type: string;
    value: string;
    actor: string;
  }> {
    const indicators: Array<{ type: string; value: string; actor: string }> = [];

    for (const actor of actors) {
      actor.infrastructure.knownDomains.slice(0, 5).forEach(domain => {
        indicators.push({ type: 'DOMAIN', value: domain, actor: actor.name });
      });
      actor.infrastructure.knownIPs.slice(0, 5).forEach(ip => {
        indicators.push({ type: 'IP', value: ip, actor: actor.name });
      });
    }

    return indicators;
  }

  private generateKeyRecommendations(actors: APTGroup[]): string[] {
    const recommendations: string[] = [];

    recommendations.push('Block all known malicious indicators at network perimeter');
    recommendations.push('Enable enhanced logging on critical systems');
    recommendations.push('Conduct threat hunting using actor-specific TTPs');
    recommendations.push('Review privileged access for indicators of compromise');

    if (actors.some(a => a.capabilities.zeroDay)) {
      recommendations.push('Prioritize patching and vulnerability management');
    }

    if (actors.some(a => a.capabilities.supplyChain)) {
      recommendations.push('Review third-party vendor access and software integrity');
    }

    return recommendations;
  }

  // Public API for managing actors and campaigns

  addActor(actor: APTGroup): void {
    this.actors.set(actor.id, actor);
  }

  addCampaign(campaign: CyberCampaign): void {
    this.campaigns.set(campaign.id, campaign);
  }

  addMalware(malware: MalwareAnalysis): void {
    this.malware.set(malware.id, malware);
  }

  getActor(id: string): APTGroup | undefined {
    return this.actors.get(id) || this.aptDatabase.get(id);
  }

  getCampaign(id: string): CyberCampaign | undefined {
    return this.campaigns.get(id);
  }

  getActiveCampaigns(): CyberCampaign[] {
    return Array.from(this.campaigns.values()).filter(c => c.status === 'ACTIVE');
  }
}

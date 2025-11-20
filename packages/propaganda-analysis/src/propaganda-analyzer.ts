/**
 * Propaganda Analyzer
 * Analyzes terrorist propaganda and messaging
 */

import type {
  PropagandaContent,
  MediaProduction,
  MediaSpokesperson,
  NarrativeEvolution,
  RecruitmentMessaging,
  CounterNarrative,
  LanguageAnalysis,
  AudienceAnalysis,
  PropagandaCampaign,
  AnalysisQuery,
  AnalysisResult,
  CounterNarrativeOpportunity
} from './types.js';

export class PropagandaAnalyzer {
  private content: Map<string, PropagandaContent> = new Map();
  private productions: Map<string, MediaProduction> = new Map();
  private spokespersons: Map<string, MediaSpokesperson> = new Map();
  private narratives: Map<string, NarrativeEvolution> = new Map();
  private recruitment: Map<string, RecruitmentMessaging> = new Map();
  private counterNarratives: Map<string, CounterNarrative> = new Map();
  private languageAnalysis: Map<string, LanguageAnalysis> = new Map();
  private audienceAnalysis: Map<string, AudienceAnalysis> = new Map();
  private campaigns: Map<string, PropagandaCampaign> = new Map();

  /**
   * Analyze propaganda content
   */
  async analyzeContent(content: PropagandaContent): Promise<void> {
    this.content.set(content.id, content);
    await this.analyzeNarrative(content);
    await this.analyzeImpact(content);
  }

  /**
   * Track media production
   */
  async trackMediaProduction(production: MediaProduction): Promise<void> {
    this.productions.set(production.id, production);
  }

  /**
   * Monitor spokesperson
   */
  async monitorSpokesperson(spokesperson: MediaSpokesperson): Promise<void> {
    this.spokespersons.set(spokesperson.id, spokesperson);
  }

  /**
   * Track narrative evolution
   */
  async trackNarrativeEvolution(evolution: NarrativeEvolution): Promise<void> {
    this.narratives.set(evolution.organization, evolution);
  }

  /**
   * Analyze recruitment messaging
   */
  async analyzeRecruitment(messaging: RecruitmentMessaging): Promise<void> {
    this.recruitment.set(messaging.contentId, messaging);
  }

  /**
   * Register counter narrative
   */
  async registerCounterNarrative(counter: CounterNarrative): Promise<void> {
    this.counterNarratives.set(counter.id, counter);
  }

  /**
   * Analyze language
   */
  async analyzeLanguage(analysis: LanguageAnalysis): Promise<void> {
    this.languageAnalysis.set(analysis.contentId, analysis);
  }

  /**
   * Analyze audience
   */
  async analyzeAudience(analysis: AudienceAnalysis): Promise<void> {
    this.audienceAnalysis.set(analysis.contentId, analysis);
  }

  /**
   * Track propaganda campaign
   */
  async trackCampaign(campaign: PropagandaCampaign): Promise<void> {
    this.campaigns.set(campaign.id, campaign);
  }

  /**
   * Query propaganda content
   */
  async query(query: AnalysisQuery): Promise<AnalysisResult> {
    let filtered = Array.from(this.content.values());

    if (query.organizations && query.organizations.length > 0) {
      filtered = filtered.filter(c =>
        c.organization && query.organizations!.includes(c.organization)
      );
    }

    if (query.contentTypes && query.contentTypes.length > 0) {
      filtered = filtered.filter(c => query.contentTypes!.includes(c.type));
    }

    if (query.themes && query.themes.length > 0) {
      filtered = filtered.filter(c =>
        c.narrative.themes.some(t => query.themes!.includes(t.type))
      );
    }

    if (query.languages && query.languages.length > 0) {
      filtered = filtered.filter(c => query.languages!.includes(c.language));
    }

    if (query.minReach !== undefined) {
      filtered = filtered.filter(c =>
        c.distribution.reach >= query.minReach!
      );
    }

    const opportunities = this.identifyCounterNarrativeOpportunities(filtered);

    return {
      content: filtered,
      totalCount: filtered.length,
      campaigns: Array.from(this.campaigns.values()),
      narratives: Array.from(this.narratives.values()),
      trends: this.calculateTrends(filtered),
      counterNarrativeOpportunities: opportunities
    };
  }

  /**
   * Get content by ID
   */
  async getContent(id: string): Promise<PropagandaContent | undefined> {
    return this.content.get(id);
  }

  /**
   * Get distribution network
   */
  async getDistributionNetwork(contentId: string) {
    const content = this.content.get(contentId);
    return content?.distribution.networks || [];
  }

  /**
   * Track content removal
   */
  async trackRemoval(contentId: string, platform: string): Promise<void> {
    const content = this.content.get(contentId);
    if (!content) return;

    const platformDist = content.distribution.platforms.find(
      p => p.platform === platform
    );
    if (platformDist) {
      platformDist.removed = new Date();
      platformDist.active = false;
    }
  }

  /**
   * Analyze narrative shift
   */
  async analyzeNarrativeShift(organization: string): Promise<{
    shifts: number;
    direction: string;
    recentChanges: string[];
  }> {
    const evolution = this.narratives.get(organization);
    if (!evolution) {
      return { shifts: 0, direction: 'UNKNOWN', recentChanges: [] };
    }

    const recentChanges = evolution.timeline
      .filter(t => {
        const daysAgo = (Date.now() - t.date.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 90;
      })
      .map(t => t.description);

    return {
      shifts: evolution.timeline.length,
      direction: evolution.trajectory,
      recentChanges
    };
  }

  /**
   * Assess propaganda effectiveness
   */
  async assessEffectiveness(contentId: string): Promise<{
    reach: number;
    engagement: number;
    impact: number;
    overall: number;
  }> {
    const content = this.content.get(contentId);
    if (!content) {
      return { reach: 0, engagement: 0, impact: 0, overall: 0 };
    }

    const reach = Math.min(content.distribution.reach / 100000, 1.0);
    const engagement =
      Math.min(content.distribution.engagement.views / 50000, 1.0);
    const impact = content.impact.influence;
    const overall = (reach * 0.3 + engagement * 0.3 + impact * 0.4);

    return { reach, engagement, impact, overall };
  }

  /**
   * Identify high-impact content
   */
  async identifyHighImpactContent(): Promise<PropagandaContent[]> {
    return Array.from(this.content.values())
      .filter(c => c.impact.influence >= 0.7)
      .sort((a, b) => b.impact.influence - a.impact.influence);
  }

  /**
   * Private helper methods
   */

  private async analyzeNarrative(content: PropagandaContent): Promise<void> {
    // Narrative analysis implementation
  }

  private async analyzeImpact(content: PropagandaContent): Promise<void> {
    // Impact analysis implementation
  }

  private identifyCounterNarrativeOpportunities(
    content: PropagandaContent[]
  ): CounterNarrativeOpportunity[] {
    const opportunities: CounterNarrativeOpportunity[] = [];

    for (const c of content) {
      if (c.impact.influence >= 0.6 && !c.removed) {
        opportunities.push({
          contentId: c.id,
          vulnerability: 'High reach with potential for counter-messaging',
          suggestedApproach: 'Develop targeted counter-narrative',
          priority: 'HIGH',
          targetAudience: {
            demographics: {
              ageRange: [18, 35],
              locations: [c.language],
              languages: [c.language]
            },
            psychographics: {
              interests: [],
              grievances: c.narrative.grievances,
              values: [],
              beliefs: []
            },
            vulnerabilities: ['Susceptible to extremist messaging']
          }
        });
      }
    }

    return opportunities;
  }

  private calculateTrends(content: PropagandaContent[]) {
    return [
      {
        type: 'Propaganda Production',
        direction: 'STABLE' as const,
        magnitude: content.length,
        period: '30-days',
        description: `${content.length} propaganda items analyzed`
      }
    ];
  }
}

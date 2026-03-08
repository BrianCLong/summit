"use strict";
/**
 * Propaganda Analyzer
 * Analyzes terrorist propaganda and messaging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropagandaAnalyzer = void 0;
class PropagandaAnalyzer {
    content = new Map();
    productions = new Map();
    spokespersons = new Map();
    narratives = new Map();
    recruitment = new Map();
    counterNarratives = new Map();
    languageAnalysis = new Map();
    audienceAnalysis = new Map();
    campaigns = new Map();
    /**
     * Analyze propaganda content
     */
    async analyzeContent(content) {
        this.content.set(content.id, content);
        await this.analyzeNarrative(content);
        await this.analyzeImpact(content);
    }
    /**
     * Track media production
     */
    async trackMediaProduction(production) {
        this.productions.set(production.id, production);
    }
    /**
     * Monitor spokesperson
     */
    async monitorSpokesperson(spokesperson) {
        this.spokespersons.set(spokesperson.id, spokesperson);
    }
    /**
     * Track narrative evolution
     */
    async trackNarrativeEvolution(evolution) {
        this.narratives.set(evolution.organization, evolution);
    }
    /**
     * Analyze recruitment messaging
     */
    async analyzeRecruitment(messaging) {
        this.recruitment.set(messaging.contentId, messaging);
    }
    /**
     * Register counter narrative
     */
    async registerCounterNarrative(counter) {
        this.counterNarratives.set(counter.id, counter);
    }
    /**
     * Analyze language
     */
    async analyzeLanguage(analysis) {
        this.languageAnalysis.set(analysis.contentId, analysis);
    }
    /**
     * Analyze audience
     */
    async analyzeAudience(analysis) {
        this.audienceAnalysis.set(analysis.contentId, analysis);
    }
    /**
     * Track propaganda campaign
     */
    async trackCampaign(campaign) {
        this.campaigns.set(campaign.id, campaign);
    }
    /**
     * Query propaganda content
     */
    async query(query) {
        let filtered = Array.from(this.content.values());
        if (query.organizations && query.organizations.length > 0) {
            filtered = filtered.filter(c => c.organization && query.organizations.includes(c.organization));
        }
        if (query.contentTypes && query.contentTypes.length > 0) {
            filtered = filtered.filter(c => query.contentTypes.includes(c.type));
        }
        if (query.themes && query.themes.length > 0) {
            filtered = filtered.filter(c => c.narrative.themes.some(t => query.themes.includes(t.type)));
        }
        if (query.languages && query.languages.length > 0) {
            filtered = filtered.filter(c => query.languages.includes(c.language));
        }
        if (query.minReach !== undefined) {
            filtered = filtered.filter(c => c.distribution.reach >= query.minReach);
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
    async getContent(id) {
        return this.content.get(id);
    }
    /**
     * Get distribution network
     */
    async getDistributionNetwork(contentId) {
        const content = this.content.get(contentId);
        return content?.distribution.networks || [];
    }
    /**
     * Track content removal
     */
    async trackRemoval(contentId, platform) {
        const content = this.content.get(contentId);
        if (!content) {
            return;
        }
        const platformDist = content.distribution.platforms.find(p => p.platform === platform);
        if (platformDist) {
            platformDist.removed = new Date();
            platformDist.active = false;
        }
    }
    /**
     * Analyze narrative shift
     */
    async analyzeNarrativeShift(organization) {
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
    async assessEffectiveness(contentId) {
        const content = this.content.get(contentId);
        if (!content) {
            return { reach: 0, engagement: 0, impact: 0, overall: 0 };
        }
        const reach = Math.min(content.distribution.reach / 100000, 1.0);
        const engagement = Math.min(content.distribution.engagement.views / 50000, 1.0);
        const impact = content.impact.influence;
        const overall = (reach * 0.3 + engagement * 0.3 + impact * 0.4);
        return { reach, engagement, impact, overall };
    }
    /**
     * Identify high-impact content
     */
    async identifyHighImpactContent() {
        return Array.from(this.content.values())
            .filter(c => c.impact.influence >= 0.7)
            .sort((a, b) => b.impact.influence - a.impact.influence);
    }
    /**
     * Private helper methods
     */
    async analyzeNarrative(content) {
        // Narrative analysis implementation
    }
    async analyzeImpact(content) {
        // Impact analysis implementation
    }
    identifyCounterNarrativeOpportunities(content) {
        const opportunities = [];
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
    calculateTrends(content) {
        return [
            {
                type: 'Propaganda Production',
                direction: 'STABLE',
                magnitude: content.length,
                period: '30-days',
                description: `${content.length} propaganda items analyzed`
            }
        ];
    }
}
exports.PropagandaAnalyzer = PropagandaAnalyzer;

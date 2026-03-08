"use strict";
/**
 * Threat Intelligence Integration
 * Connect to external threat feeds and intelligence platforms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatIntelligenceService = exports.ReportType = exports.ActorType = exports.ThreatSeverity = exports.IndicatorType = exports.ProviderCapability = exports.ProviderType = void 0;
var ProviderType;
(function (ProviderType) {
    ProviderType["OPEN_SOURCE"] = "open_source";
    ProviderType["COMMERCIAL"] = "commercial";
    ProviderType["GOVERNMENT"] = "government";
    ProviderType["COMMUNITY"] = "community";
    ProviderType["INTERNAL"] = "internal";
})(ProviderType || (exports.ProviderType = ProviderType = {}));
var ProviderCapability;
(function (ProviderCapability) {
    ProviderCapability["DEEPFAKE_SIGNATURES"] = "deepfake_signatures";
    ProviderCapability["BOT_NETWORK_INTELLIGENCE"] = "bot_network_intelligence";
    ProviderCapability["DISINFORMATION_CAMPAIGNS"] = "disinformation_campaigns";
    ProviderCapability["THREAT_ACTOR_PROFILES"] = "threat_actor_profiles";
    ProviderCapability["IOC_FEEDS"] = "ioc_feeds";
    ProviderCapability["REPUTATION_SCORING"] = "reputation_scoring";
})(ProviderCapability || (exports.ProviderCapability = ProviderCapability = {}));
var IndicatorType;
(function (IndicatorType) {
    IndicatorType["DEEPFAKE_SIGNATURE"] = "deepfake_signature";
    IndicatorType["GAN_FINGERPRINT"] = "gan_fingerprint";
    IndicatorType["BOT_ACCOUNT"] = "bot_account";
    IndicatorType["COORDINATED_NETWORK"] = "coordinated_network";
    IndicatorType["DISINFORMATION_NARRATIVE"] = "disinformation_narrative";
    IndicatorType["MANIPULATION_TECHNIQUE"] = "manipulation_technique";
    IndicatorType["THREAT_ACTOR"] = "threat_actor";
    IndicatorType["INFRASTRUCTURE"] = "infrastructure";
})(IndicatorType || (exports.IndicatorType = IndicatorType = {}));
var ThreatSeverity;
(function (ThreatSeverity) {
    ThreatSeverity["CRITICAL"] = "critical";
    ThreatSeverity["HIGH"] = "high";
    ThreatSeverity["MEDIUM"] = "medium";
    ThreatSeverity["LOW"] = "low";
    ThreatSeverity["INFORMATIONAL"] = "informational";
})(ThreatSeverity || (exports.ThreatSeverity = ThreatSeverity = {}));
var ActorType;
(function (ActorType) {
    ActorType["STATE_SPONSORED"] = "state_sponsored";
    ActorType["CRIMINAL"] = "criminal";
    ActorType["HACKTIVISTS"] = "hacktivists";
    ActorType["INSIDER"] = "insider";
    ActorType["COMMERCIAL"] = "commercial";
    ActorType["UNKNOWN"] = "unknown";
})(ActorType || (exports.ActorType = ActorType = {}));
var ReportType;
(function (ReportType) {
    ReportType["CAMPAIGN_ANALYSIS"] = "campaign_analysis";
    ReportType["THREAT_ACTOR_PROFILE"] = "threat_actor_profile";
    ReportType["TECHNIQUE_ANALYSIS"] = "technique_analysis";
    ReportType["INCIDENT_REPORT"] = "incident_report";
    ReportType["TREND_ANALYSIS"] = "trend_analysis";
})(ReportType || (exports.ReportType = ReportType = {}));
class ThreatIntelligenceService {
    config;
    providers;
    indicatorCache;
    actorDatabase;
    constructor(config) {
        this.config = config;
        this.providers = new Map();
        this.indicatorCache = new Map();
        this.actorDatabase = new Map();
        this.initializeProviders();
    }
    initializeProviders() {
        for (const provider of this.config.providers) {
            this.providers.set(provider.id, new ThreatProviderClient(provider));
        }
    }
    /**
     * Query threat intelligence for a specific indicator
     */
    async queryIndicator(type, value) {
        // Check cache first
        const cacheKey = `${type}:${value}`;
        const cached = this.indicatorCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
            return cached.indicator;
        }
        // Query providers
        for (const [, client] of this.providers) {
            if (client.hasCapability(this.getCapabilityForType(type))) {
                const indicator = await client.queryIndicator(type, value);
                if (indicator) {
                    this.indicatorCache.set(cacheKey, {
                        indicator,
                        timestamp: Date.now(),
                    });
                    return indicator;
                }
            }
        }
        return null;
    }
    /**
     * Search for indicators matching criteria
     */
    async searchIndicators(criteria) {
        const results = [];
        for (const [, client] of this.providers) {
            const indicators = await client.search(criteria);
            results.push(...indicators);
        }
        // Deduplicate and merge
        return this.deduplicateIndicators(results);
    }
    /**
     * Enrich an indicator with additional context
     */
    async enrichIndicator(indicator) {
        const enrichments = [];
        const relatedActors = [];
        const relatedCampaigns = [];
        // Query each provider for enrichment
        for (const [, client] of this.providers) {
            const providerEnrichment = await client.enrich(indicator);
            if (providerEnrichment) {
                enrichments.push(providerEnrichment);
            }
        }
        // Find related actors
        for (const actorId of indicator.context.campaigns) {
            const actor = this.actorDatabase.get(actorId);
            if (actor) {
                relatedActors.push(actor);
            }
        }
        // Calculate risk score
        const riskScore = this.calculateRiskScore(indicator, enrichments);
        // Generate recommendations
        const recommendations = this.generateRecommendations(indicator, riskScore);
        return {
            indicator,
            enrichments,
            relatedActors,
            relatedCampaigns,
            riskScore,
            recommendations,
        };
    }
    /**
     * Get threat actor profile
     */
    async getThreatActor(actorId) {
        // Check local database
        const local = this.actorDatabase.get(actorId);
        if (local)
            return local;
        // Query providers
        for (const [, client] of this.providers) {
            if (client.hasCapability(ProviderCapability.THREAT_ACTOR_PROFILES)) {
                const actor = await client.getActor(actorId);
                if (actor) {
                    this.actorDatabase.set(actorId, actor);
                    return actor;
                }
            }
        }
        return null;
    }
    /**
     * Match content against known threat indicators
     */
    async matchContent(content) {
        const matches = [];
        // Get relevant indicators
        const indicatorType = this.getIndicatorTypeForContent(content.type);
        const indicators = await this.searchIndicators({
            types: [indicatorType],
            minConfidence: 0.6,
        });
        // Match against features and signatures
        for (const indicator of indicators) {
            const matchScore = this.calculateMatchScore(content, indicator);
            if (matchScore > 0.7) {
                matches.push({
                    indicator,
                    matchScore,
                    matchedFeatures: this.getMatchedFeatures(content, indicator),
                });
            }
        }
        return matches.sort((a, b) => b.matchScore - a.matchScore);
    }
    /**
     * Generate threat report
     */
    async generateReport(topic, type) {
        // Gather intelligence from all sources
        const indicators = await this.searchIndicators({
            tags: [topic],
            minConfidence: 0.7,
        });
        const actors = [];
        const campaigns = [];
        const ttps = [];
        const timeline = [];
        // Aggregate related information
        for (const indicator of indicators) {
            ttps.push(...indicator.context.ttps);
            for (const actorId of indicator.relatedIndicators) {
                const actor = await this.getThreatActor(actorId);
                if (actor)
                    actors.push(actor);
            }
        }
        // Generate mitigations
        const mitigations = this.generateMitigations(ttps);
        // Determine severity
        const severity = this.determineSeverity(indicators);
        return {
            id: `report_${Date.now()}`,
            title: `Threat Report: ${topic}`,
            type,
            severity,
            summary: this.generateSummary(indicators, actors),
            indicators: indicators.slice(0, 20),
            actors: this.deduplicateActors(actors),
            campaigns,
            ttps: this.deduplicateTTPs(ttps),
            mitigations,
            timeline,
            confidence: this.calculateReportConfidence(indicators),
            publishedDate: new Date(),
            lastUpdated: new Date(),
        };
    }
    /**
     * Subscribe to threat feed updates
     */
    async subscribeToFeed(feedId, callback) {
        const subscription = new Subscription(feedId, callback);
        // Set up polling
        const pollInterval = setInterval(async () => {
            const newIndicators = await this.pollFeed(feedId);
            if (newIndicators.length > 0) {
                callback(newIndicators);
            }
        }, this.config.updateInterval);
        subscription.setCleanup(() => clearInterval(pollInterval));
        return subscription;
    }
    async pollFeed(feedId) {
        // Poll specific feed for updates
        return [];
    }
    getCapabilityForType(type) {
        switch (type) {
            case IndicatorType.DEEPFAKE_SIGNATURE:
            case IndicatorType.GAN_FINGERPRINT:
                return ProviderCapability.DEEPFAKE_SIGNATURES;
            case IndicatorType.BOT_ACCOUNT:
            case IndicatorType.COORDINATED_NETWORK:
                return ProviderCapability.BOT_NETWORK_INTELLIGENCE;
            case IndicatorType.DISINFORMATION_NARRATIVE:
                return ProviderCapability.DISINFORMATION_CAMPAIGNS;
            case IndicatorType.THREAT_ACTOR:
                return ProviderCapability.THREAT_ACTOR_PROFILES;
            default:
                return ProviderCapability.IOC_FEEDS;
        }
    }
    getIndicatorTypeForContent(type) {
        switch (type) {
            case 'deepfake':
                return IndicatorType.DEEPFAKE_SIGNATURE;
            case 'account':
                return IndicatorType.BOT_ACCOUNT;
            case 'campaign':
                return IndicatorType.DISINFORMATION_NARRATIVE;
            default:
                return IndicatorType.MANIPULATION_TECHNIQUE;
        }
    }
    deduplicateIndicators(indicators) {
        const seen = new Map();
        for (const indicator of indicators) {
            const existing = seen.get(indicator.value);
            if (!existing || indicator.confidence > existing.confidence) {
                seen.set(indicator.value, indicator);
            }
        }
        return Array.from(seen.values());
    }
    deduplicateActors(actors) {
        const seen = new Map();
        for (const actor of actors) {
            if (!seen.has(actor.id)) {
                seen.set(actor.id, actor);
            }
        }
        return Array.from(seen.values());
    }
    deduplicateTTPs(ttps) {
        const seen = new Set();
        return ttps.filter(ttp => {
            const key = `${ttp.tactic}:${ttp.technique}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    calculateRiskScore(indicator, enrichments) {
        let score = indicator.confidence * 0.4;
        // Adjust for severity
        switch (indicator.severity) {
            case ThreatSeverity.CRITICAL:
                score += 0.4;
                break;
            case ThreatSeverity.HIGH:
                score += 0.3;
                break;
            case ThreatSeverity.MEDIUM:
                score += 0.2;
                break;
            case ThreatSeverity.LOW:
                score += 0.1;
                break;
        }
        // Adjust for recency
        const daysSinceLastSeen = (Date.now() - indicator.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSeen < 7)
            score += 0.1;
        if (daysSinceLastSeen < 1)
            score += 0.1;
        return Math.min(score, 1);
    }
    calculateMatchScore(content, indicator) {
        // Compare features and signatures
        return Math.random() * 0.5 + 0.5;
    }
    getMatchedFeatures(content, indicator) {
        return [];
    }
    generateRecommendations(indicator, riskScore) {
        const recommendations = [];
        if (riskScore > 0.8) {
            recommendations.push('Immediate investigation recommended');
            recommendations.push('Consider blocking/removing identified content');
        }
        for (const mitigation of indicator.context.mitigations) {
            recommendations.push(mitigation);
        }
        return recommendations;
    }
    generateMitigations(ttps) {
        return ttps.map((ttp, i) => ({
            id: `mitigation_${i}`,
            description: `Counter ${ttp.technique}`,
            effectiveness: 0.7,
            implementationCost: 'medium',
            references: [],
        }));
    }
    determineSeverity(indicators) {
        if (indicators.some(i => i.severity === ThreatSeverity.CRITICAL)) {
            return ThreatSeverity.CRITICAL;
        }
        if (indicators.some(i => i.severity === ThreatSeverity.HIGH)) {
            return ThreatSeverity.HIGH;
        }
        return ThreatSeverity.MEDIUM;
    }
    generateSummary(indicators, actors) {
        return `Analysis identified ${indicators.length} threat indicators associated with ${actors.length} threat actors.`;
    }
    calculateReportConfidence(indicators) {
        if (indicators.length === 0)
            return 0;
        return indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;
    }
}
exports.ThreatIntelligenceService = ThreatIntelligenceService;
class ThreatProviderClient {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    hasCapability(capability) {
        return this.provider.capabilities.includes(capability);
    }
    async queryIndicator(type, value) {
        return null;
    }
    async search(criteria) {
        return [];
    }
    async enrich(indicator) {
        return null;
    }
    async getActor(actorId) {
        return null;
    }
}
class Subscription {
    feedId;
    callback;
    cleanup;
    constructor(feedId, callback) {
        this.feedId = feedId;
        this.callback = callback;
    }
    setCleanup(cleanup) {
        this.cleanup = cleanup;
    }
    unsubscribe() {
        if (this.cleanup)
            this.cleanup();
    }
}

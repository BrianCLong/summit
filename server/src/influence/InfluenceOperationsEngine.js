"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfluenceOperationsEngine = void 0;
const BehavioralAnalyzer_js_1 = require("./BehavioralAnalyzer.js");
const NarrativeTracker_js_1 = require("./NarrativeTracker.js");
const GraphDetector_js_1 = require("./GraphDetector.js");
const types_js_1 = require("./types.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class InfluenceOperationsEngine {
    behavioralAnalyzer;
    narrativeTracker;
    graphDetector;
    constructor(driver) {
        this.behavioralAnalyzer = new BehavioralAnalyzer_js_1.BehavioralAnalyzer();
        this.narrativeTracker = new NarrativeTracker_js_1.NarrativeTracker();
        this.graphDetector = new GraphDetector_js_1.GraphDetector(driver);
    }
    /**
     * Main entry point for detecting influence operations.
     * Analyzes a set of posts and actors for coordinated inauthentic behavior.
     */
    async detectCampaigns(posts, actors) {
        logger_js_1.default.info(`Starting influence operation detection for ${posts.length} posts and ${actors.length} actors`);
        const campaigns = [];
        // 1. Behavioral Analysis (Bot/Sockpuppet detection)
        const botSuspects = [];
        const postsByActor = new Map();
        // Group posts by actor
        for (const post of posts) {
            if (!postsByActor.has(post.authorId))
                postsByActor.set(post.authorId, []);
            postsByActor.get(post.authorId).push(post);
        }
        for (const actor of actors) {
            const actorPosts = postsByActor.get(actor.id) || [];
            const fingerprint = this.behavioralAnalyzer.generateFingerprint(actor, actorPosts);
            const botResult = this.behavioralAnalyzer.detectBot(fingerprint);
            if (botResult.isAnomalous) {
                botSuspects.push(actor.id);
            }
        }
        // 2. Temporal and Geo-Temporal Analysis
        const temporalResult = this.behavioralAnalyzer.detectTemporalCoordination(postsByActor);
        if (temporalResult.isAnomalous) {
            logger_js_1.default.warn('Temporal coordination detected:', temporalResult.reason);
        }
        const geoAnomalousActors = [];
        const geoEvidence = [];
        let geoScoreSum = 0;
        for (const [actorId, actorPosts] of postsByActor.entries()) {
            const result = this.behavioralAnalyzer.detectGeoTemporalAnomalies(actorPosts);
            if (result.isAnomalous) {
                geoAnomalousActors.push(actorId);
                geoEvidence.push(`Actor ${actorId}: ${result.reason}`);
                geoScoreSum += result.score;
            }
        }
        if (geoAnomalousActors.length > 0) {
            campaigns.push({
                id: `CAMPAIGN_${Date.now()}_${campaigns.length}`,
                type: types_js_1.CampaignType.COORDINATED_INAUTHENTIC_BEHAVIOR,
                actors: geoAnomalousActors,
                threatLevel: types_js_1.ThreatLevel.MEDIUM,
                narrative: 'Geo-Temporal Anomaly (Impossible Travel)',
                evidence: geoEvidence,
                detectedAt: new Date(),
                status: 'ACTIVE',
                confidenceScore: geoScoreSum / geoAnomalousActors.length,
            });
        }
        // 3. Narrative Analysis
        const narrativeClusters = this.narrativeTracker.clusterNarratives(posts);
        for (const cluster of narrativeClusters) {
            const ampResult = this.narrativeTracker.detectArtificialAmplification(cluster);
            if (ampResult.isAnomalous) {
                // Map exemplar posts to authors
                const involvedActors = new Set();
                cluster.exemplarPosts.forEach(postId => {
                    const post = posts.find(p => p.id === postId);
                    if (post)
                        involvedActors.add(post.authorId);
                });
                campaigns.push({
                    id: `CAMPAIGN_${Date.now()}_${campaigns.length}`,
                    type: types_js_1.CampaignType.ASTROTURFING,
                    actors: Array.from(involvedActors),
                    threatLevel: types_js_1.ThreatLevel.MEDIUM,
                    narrative: cluster.keywords.join(', '),
                    evidence: [ampResult.reason],
                    detectedAt: new Date(),
                    status: 'ACTIVE',
                    confidenceScore: ampResult.score,
                });
            }
        }
        // 4. Graph Analysis (Cliques)
        if (botSuspects.length > 2) {
            const cliqueResult = await this.graphDetector.detectCoordinatedCliques(botSuspects);
            if (cliqueResult.isAnomalous) {
                campaigns.push({
                    id: `CAMPAIGN_${Date.now()}_${campaigns.length}`,
                    type: types_js_1.CampaignType.COORDINATED_INAUTHENTIC_BEHAVIOR,
                    actors: botSuspects,
                    threatLevel: types_js_1.ThreatLevel.HIGH,
                    narrative: 'Coordinated Botnet Activity',
                    evidence: [cliqueResult.reason, temporalResult.reason],
                    detectedAt: new Date(),
                    status: 'ACTIVE',
                    confidenceScore: (cliqueResult.score + temporalResult.score) / 2,
                });
            }
        }
        return campaigns;
    }
    async getDashboardMetrics() {
        // Placeholder for dashboard data aggregation
        return {
            activeCampaigns: 0, // dynamic
            botnetActivity: 'Low',
            narrativeAlerts: [],
        };
    }
}
exports.InfluenceOperationsEngine = InfluenceOperationsEngine;

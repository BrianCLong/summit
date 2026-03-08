
import { Driver } from 'neo4j-driver';
import { BehavioralAnalyzer } from './BehavioralAnalyzer.js';
import { NarrativeTracker } from './NarrativeTracker.js';
import { GraphDetector } from './GraphDetector.js';
import { Actor, SocialPost, InfluenceCampaign, CampaignType, ThreatLevel } from './types.js';
import logger from '../utils/logger.js';

export class InfluenceOperationsEngine {
  private behavioralAnalyzer: BehavioralAnalyzer;
  private narrativeTracker: NarrativeTracker;
  private graphDetector: GraphDetector;

  constructor(driver: Driver) {
    this.behavioralAnalyzer = new BehavioralAnalyzer();
    this.narrativeTracker = new NarrativeTracker();
    this.graphDetector = new GraphDetector(driver);
  }

  /**
   * Main entry point for detecting influence operations.
   * Analyzes a set of posts and actors for coordinated inauthentic behavior.
   */
  public async detectCampaigns(posts: SocialPost[], actors: Actor[]): Promise<InfluenceCampaign[]> {
    logger.info(`Starting influence operation detection for ${posts.length} posts and ${actors.length} actors`);
    const campaigns: InfluenceCampaign[] = [];

    // 1. Behavioral Analysis (Bot/Sockpuppet detection)
    const botSuspects: string[] = [];
    const postsByActor = new Map<string, SocialPost[]>();

    // Group posts by actor
    for (const post of posts) {
        if (!postsByActor.has(post.authorId)) postsByActor.set(post.authorId, []);
        postsByActor.get(post.authorId)!.push(post);
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
        logger.warn('Temporal coordination detected:', temporalResult.reason);
    }

    const geoAnomalousActors: string[] = [];
    const geoEvidence: string[] = [];
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
            type: CampaignType.COORDINATED_INAUTHENTIC_BEHAVIOR,
            actors: geoAnomalousActors,
            threatLevel: ThreatLevel.MEDIUM,
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
            const involvedActors = new Set<string>();
            cluster.exemplarPosts.forEach(postId => {
                const post = posts.find(p => p.id === postId);
                if (post) involvedActors.add(post.authorId);
            });

            campaigns.push({
                id: `CAMPAIGN_${Date.now()}_${campaigns.length}`,
                type: CampaignType.ASTROTURFING,
                actors: Array.from(involvedActors),
                threatLevel: ThreatLevel.MEDIUM,
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
                type: CampaignType.COORDINATED_INAUTHENTIC_BEHAVIOR,
                actors: botSuspects,
                threatLevel: ThreatLevel.HIGH,
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

  public async getDashboardMetrics() {
      // Placeholder for dashboard data aggregation
      return {
          activeCampaigns: 0, // dynamic
          botnetActivity: 'Low',
          narrativeAlerts: [],
      };
  }
}

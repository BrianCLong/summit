/**
 * Campaign Detection Service
 *
 * Detects coordinated influence operations through multiple signal types:
 * - Temporal synchrony detection
 * - Cross-account content reuse
 * - Phrasing fingerprints
 * - Asset re-upload detection
 * - Network propagation anomalies
 * - Content laundering pathway detection
 */

import { randomUUID } from 'crypto';
import pino from 'pino';
import type { Driver, Session } from 'neo4j-driver';

import type {
  Campaign,
  CampaignThreatLevel,
  CampaignMetrics,
  CoordinationSignal,
  CoordinationSignalType,
  CoordinationEvidence,
  Claim,
  Actor,
  Channel,
  Narrative,
} from './types.js';
import { createCampaign } from './types.js';

const logger = (pino as any)({ name: 'campaign-detection-service' });

// ============================================================================
// Configuration
// ============================================================================

export interface CampaignDetectionConfig {
  /** Neo4j driver */
  neo4jDriver: Driver;
  /** Detection thresholds */
  thresholds?: DetectionThresholds;
  /** Enable real-time detection */
  realTimeEnabled?: boolean;
  /** Detection window (ms) */
  detectionWindowMs?: number;
}

export interface DetectionThresholds {
  /** Minimum temporal synchrony score (0-1) */
  temporalSynchrony: number;
  /** Minimum content similarity score (0-1) */
  contentSimilarity: number;
  /** Minimum network anomaly score (0-1) */
  networkAnomaly: number;
  /** Minimum coordination signals to form campaign */
  minSignalsForCampaign: number;
  /** Minimum actors for coordinated behavior */
  minActorsForCoordination: number;
  /** Time window for temporal synchrony (ms) */
  temporalWindowMs: number;
}

const DEFAULT_THRESHOLDS: DetectionThresholds = {
  temporalSynchrony: 0.7,
  contentSimilarity: 0.8,
  networkAnomaly: 0.6,
  minSignalsForCampaign: 3,
  minActorsForCoordination: 3,
  temporalWindowMs: 300000, // 5 minutes
};

// ============================================================================
// Campaign Detection Service
// ============================================================================

export class CampaignDetectionService {
  private readonly config: CampaignDetectionConfig;
  private readonly thresholds: DetectionThresholds;
  private signalBuffer: CoordinationSignal[] = [];

  constructor(config: CampaignDetectionConfig) {
    this.config = config;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds };
    logger.info('Campaign detection service initialized');
  }

  private getSession(): Session {
    return this.config.neo4jDriver.session();
  }

  // ==========================================================================
  // Signal Detection
  // ==========================================================================

  /**
   * Detect temporal synchrony across actors
   */
  async detectTemporalSynchrony(
    timeWindowMs: number = this.thresholds.temporalWindowMs,
  ): Promise<CoordinationSignal[]> {
    const session = this.getSession();
    try {
      // Find claims posted within a tight time window by different actors
      const result = await session.run(
        `
        MATCH (c:CogSecClaim)
        WHERE c.firstObservedAt >= datetime() - duration({milliseconds: $windowMs})
        WITH c
        ORDER BY c.firstObservedAt
        WITH collect(c) AS claims
        UNWIND range(0, size(claims) - 2) AS i
        WITH claims[i] AS c1, claims[i + 1] AS c2
        WHERE duration.between(c1.firstObservedAt, c2.firstObservedAt).milliseconds < $burstMs
          AND c1.actorIds <> c2.actorIds
        WITH c1, c2, duration.between(c1.firstObservedAt, c2.firstObservedAt).milliseconds AS delayMs
        RETURN c1, c2, delayMs
        ORDER BY delayMs ASC
        LIMIT 100
        `,
        {
          windowMs: timeWindowMs,
          burstMs: 60000, // 1 minute burst window
        },
      );

      const signals: CoordinationSignal[] = [];
      const processedPairs = new Set<string>();

      for (const record of result.records) {
        const c1 = record.get('c1').properties;
        const c2 = record.get('c2').properties;
        const delayMs = record.get('delayMs');

        const pairKey = [c1.id, c2.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Calculate synchrony score based on delay
        const synchronyScore = Math.exp(-delayMs / 30000); // Exponential decay

        if (synchronyScore >= this.thresholds.temporalSynchrony) {
          signals.push({
            id: randomUUID(),
            type: 'TEMPORAL_SYNCHRONY',
            detectedAt: new Date().toISOString(),
            confidence: synchronyScore,
            description: `Claims posted within ${Math.round(delayMs / 1000)}s by different actors`,
            actorIds: [...(c1.actorIds || []), ...(c2.actorIds || [])],
            claimIds: [c1.id, c2.id],
            channelIds: [...(c1.channelIds || []), ...(c2.channelIds || [])],
            evidence: {
              temporalPattern: {
                timestamps: [c1.firstObservedAt, c2.firstObservedAt],
                synchronyScore,
                avgDelayMs: delayMs,
              },
            },
          });
        }
      }

      logger.info(
        { signalCount: signals.length },
        'Detected temporal synchrony signals',
      );

      return signals;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect cross-account content reuse
   */
  async detectContentReuse(): Promise<CoordinationSignal[]> {
    const session = this.getSession();
    try {
      // Find claims with very similar canonical text across different actors
      const result = await session.run(
        `
        MATCH (c1:CogSecClaim), (c2:CogSecClaim)
        WHERE c1.id < c2.id
          AND c1.actorIds <> c2.actorIds
          AND c1.canonicalText = c2.canonicalText
        RETURN c1, c2
        LIMIT 50
        `,
      );

      const signals: CoordinationSignal[] = [];

      for (const record of result.records) {
        const c1 = record.get('c1').properties;
        const c2 = record.get('c2').properties;

        signals.push({
          id: randomUUID(),
          type: 'CROSS_ACCOUNT_REUSE',
          detectedAt: new Date().toISOString(),
          confidence: 0.95, // High confidence for exact match
          description: 'Identical content posted by different accounts',
          actorIds: [...(c1.actorIds || []), ...(c2.actorIds || [])],
          claimIds: [c1.id, c2.id],
          channelIds: [...(c1.channelIds || []), ...(c2.channelIds || [])],
          evidence: {
            contentFingerprint: {
              contentHash: c1.canonicalText,
              similarityScores: [1.0],
              ngramOverlap: 1.0,
            },
          },
        });
      }

      logger.info(
        { signalCount: signals.length },
        'Detected content reuse signals',
      );

      return signals;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect phrasing fingerprints (stylometric similarity)
   */
  async detectPhrasingFingerprints(
    claimIds?: string[],
  ): Promise<CoordinationSignal[]> {
    const session = this.getSession();
    try {
      // Use n-gram overlap to detect similar phrasing patterns
      let query = `
        MATCH (c:CogSecClaim)
        ${claimIds ? 'WHERE c.id IN $claimIds' : ''}
        WITH c, split(c.canonicalText, ' ') AS words
        WITH c, [i IN range(0, size(words) - 3) | words[i] + ' ' + words[i+1] + ' ' + words[i+2]] AS trigrams
        WITH c, trigrams
        MATCH (c2:CogSecClaim)
        WHERE c.id < c2.id
          AND c.actorIds <> c2.actorIds
        WITH c, c2, trigrams, split(c2.canonicalText, ' ') AS words2
        WITH c, c2, trigrams, [i IN range(0, size(words2) - 3) | words2[i] + ' ' + words2[i+1] + ' ' + words2[i+2]] AS trigrams2
        WITH c, c2, trigrams, trigrams2,
             size([t IN trigrams WHERE t IN trigrams2]) AS overlap
        WHERE overlap >= 3
        RETURN c, c2, overlap, size(trigrams) AS t1Size, size(trigrams2) AS t2Size
        LIMIT 50
      `;

      const result = await session.run(query, { claimIds });

      const signals: CoordinationSignal[] = [];

      for (const record of result.records) {
        const c1 = record.get('c1').properties;
        const c2 = record.get('c2').properties;
        const overlap = record.get('overlap');
        const t1Size = record.get('t1Size');
        const t2Size = record.get('t2Size');

        // Calculate Jaccard similarity for trigrams
        const jaccardSimilarity = overlap / (t1Size + t2Size - overlap);

        if (jaccardSimilarity >= 0.3) {
          // Threshold for stylistic similarity
          signals.push({
            id: randomUUID(),
            type: 'PHRASING_FINGERPRINT',
            detectedAt: new Date().toISOString(),
            confidence: Math.min(0.9, jaccardSimilarity + 0.3),
            description: `Similar phrasing patterns detected (${Math.round(jaccardSimilarity * 100)}% overlap)`,
            actorIds: [...(c1.actorIds || []), ...(c2.actorIds || [])],
            claimIds: [c1.id, c2.id],
            channelIds: [...(c1.channelIds || []), ...(c2.channelIds || [])],
            evidence: {
              contentFingerprint: {
                contentHash: '',
                similarityScores: [jaccardSimilarity],
                ngramOverlap: jaccardSimilarity,
              },
            },
          });
        }
      }

      logger.info(
        { signalCount: signals.length },
        'Detected phrasing fingerprint signals',
      );

      return signals;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect network propagation anomalies
   */
  async detectNetworkAnomalies(): Promise<CoordinationSignal[]> {
    const session = this.getSession();
    try {
      // Find unusual clustering patterns in actor-channel networks
      const result = await session.run(
        `
        MATCH (a:CogSecActor)-[:MADE_CLAIM]->(c:CogSecClaim)-[:APPEARED_IN]->(ch:CogSecChannel)
        WITH a, ch, count(c) AS claimCount
        WHERE claimCount >= 3
        WITH ch, collect(a) AS actors, count(DISTINCT a) AS actorCount
        WHERE actorCount >= 3
        MATCH (a1)-[:MADE_CLAIM]->(:CogSecClaim)-[:APPEARED_IN]->(ch)
        MATCH (a2)-[:MADE_CLAIM]->(:CogSecClaim)-[:APPEARED_IN]->(ch)
        WHERE a1 IN actors AND a2 IN actors AND a1.id < a2.id
        WITH ch, actors, actorCount,
             count(DISTINCT [a1, a2]) AS connections,
             actorCount * (actorCount - 1) / 2 AS maxConnections
        WITH ch, actors, actorCount,
             toFloat(connections) / maxConnections AS clusteringCoef
        WHERE clusteringCoef > 0.7
        RETURN ch, actors, actorCount, clusteringCoef
        LIMIT 20
        `,
      );

      const signals: CoordinationSignal[] = [];

      for (const record of result.records) {
        const ch = record.get('ch').properties;
        const actors = record.get('actors').map((a: any) => a.properties);
        const clusteringCoef = record.get('clusteringCoef');

        signals.push({
          id: randomUUID(),
          type: 'NETWORK_ANOMALY',
          detectedAt: new Date().toISOString(),
          confidence: clusteringCoef,
          description: `Highly connected actor cluster in channel "${ch.name}"`,
          actorIds: actors.map((a: any) => a.id),
          claimIds: [],
          channelIds: [ch.id],
          evidence: {
            networkAnomaly: {
              clusteringCoefficient: clusteringCoef,
              betweennessCentrality: 0, // Would require full graph analysis
              anomalyScore: clusteringCoef,
            },
          },
        });
      }

      logger.info(
        { signalCount: signals.length },
        'Detected network anomaly signals',
      );

      return signals;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect content laundering pathways
   */
  async detectContentLaundering(): Promise<CoordinationSignal[]> {
    const session = this.getSession();
    try {
      // Find claims that propagate from low-credibility to high-credibility channels
      const result = await session.run(
        `
        MATCH path = (c:CogSecClaim)-[:APPEARED_IN*2..5]->(ch:CogSecChannel)
        WHERE ch.credibilityScore > 0.7
        WITH c, path, nodes(path) AS channels
        WHERE channels[0].credibilityScore < 0.3
        WITH c, channels,
             [n IN channels | n.credibilityScore] AS scores,
             [n IN channels | n.name] AS names
        WHERE all(i IN range(0, size(scores) - 2) WHERE scores[i] < scores[i+1])
        RETURN c, channels, names
        LIMIT 20
        `,
      );

      const signals: CoordinationSignal[] = [];

      for (const record of result.records) {
        const claim = record.get('c').properties;
        const channels = record.get('channels').map((ch: any) => ch.properties);
        const names = record.get('names');

        // Calculate time to mainstream
        const firstChannel = channels[0];
        const lastChannel = channels[channels.length - 1];

        signals.push({
          id: randomUUID(),
          type: 'CONTENT_LAUNDERING',
          detectedAt: new Date().toISOString(),
          confidence: 0.8,
          description: `Claim propagated from "${names[0]}" to "${names[names.length - 1]}"`,
          actorIds: claim.actorIds || [],
          claimIds: [claim.id],
          channelIds: channels.map((ch: any) => ch.id),
          evidence: {
            launderingPath: {
              channelPath: channels.map((ch: any) => ch.id),
              timeToMainstream: 0, // Would need timestamp tracking
            },
          },
        });

        // Mark channels as laundering nodes
        await this.markLaunderingNodes(channels.map((ch: any) => ch.id));
      }

      logger.info(
        { signalCount: signals.length },
        'Detected content laundering signals',
      );

      return signals;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect amplification bursts
   */
  async detectAmplificationBursts(
    timeWindowMs: number = 3600000, // 1 hour
  ): Promise<CoordinationSignal[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (c:CogSecClaim)
        WITH c, size(c.actorIds) AS shares
        WHERE c.firstObservedAt >= datetime() - duration({milliseconds: $windowMs})
        WITH c, shares,
             duration.between(c.firstObservedAt, datetime()).minutes AS ageMinutes
        WHERE ageMinutes > 0
        WITH c, shares, toFloat(shares) / ageMinutes AS shareRate
        WHERE shareRate > 10 // More than 10 shares per minute
        RETURN c, shares, shareRate
        ORDER BY shareRate DESC
        LIMIT 20
        `,
        { windowMs: timeWindowMs },
      );

      const signals: CoordinationSignal[] = [];

      for (const record of result.records) {
        const claim = record.get('c').properties;
        const shares = record.get('shares');
        const shareRate = record.get('shareRate');

        signals.push({
          id: randomUUID(),
          type: 'AMPLIFICATION_BURST',
          detectedAt: new Date().toISOString(),
          confidence: Math.min(0.95, shareRate / 100),
          description: `Unusual amplification: ${shares} shares at ${Math.round(shareRate)}/min`,
          actorIds: claim.actorIds || [],
          claimIds: [claim.id],
          channelIds: claim.channelIds || [],
          evidence: {
            temporalPattern: {
              timestamps: [claim.firstObservedAt],
              synchronyScore: Math.min(1, shareRate / 50),
              avgDelayMs: Math.round(60000 / shareRate),
            },
          },
        });
      }

      logger.info(
        { signalCount: signals.length },
        'Detected amplification burst signals',
      );

      return signals;
    } finally {
      await session.close();
    }
  }

  /**
   * Mark channels as content laundering nodes
   */
  private async markLaunderingNodes(channelIds: string[]): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        UNWIND $channelIds AS channelId
        MATCH (ch:CogSecChannel {id: channelId})
        SET ch.isLaunderingNode = true
        `,
        { channelIds },
      );
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Campaign Formation
  // ==========================================================================

  /**
   * Run full detection pipeline
   */
  async runDetectionPipeline(): Promise<CoordinationSignal[]> {
    logger.info('Starting detection pipeline');

    const [
      temporalSignals,
      reuseSignals,
      phrasingSingals,
      networkSignals,
      launderingSignals,
      burstSignals,
    ] = await Promise.all([
      this.detectTemporalSynchrony(),
      this.detectContentReuse(),
      this.detectPhrasingFingerprints(),
      this.detectNetworkAnomalies(),
      this.detectContentLaundering(),
      this.detectAmplificationBursts(),
    ]);

    const allSignals = [
      ...temporalSignals,
      ...reuseSignals,
      ...phrasingSingals,
      ...networkSignals,
      ...launderingSignals,
      ...burstSignals,
    ];

    // Persist signals
    for (const signal of allSignals) {
      await this.persistSignal(signal);
    }

    logger.info(
      { totalSignals: allSignals.length },
      'Detection pipeline completed',
    );

    return allSignals;
  }

  /**
   * Cluster signals into campaigns
   */
  async clusterIntoCampaigns(
    signals: CoordinationSignal[],
  ): Promise<Campaign[]> {
    if (signals.length < this.thresholds.minSignalsForCampaign) {
      return [];
    }

    // Group signals by overlapping actors
    const actorGroups = new Map<string, CoordinationSignal[]>();

    for (const signal of signals) {
      for (const actorId of signal.actorIds) {
        const group = actorGroups.get(actorId) || [];
        group.push(signal);
        actorGroups.set(actorId, group);
      }
    }

    // Find connected components of actors through signals
    const campaigns: Campaign[] = [];
    const processedSignals = new Set<string>();

    for (const [actorId, actorSignals] of actorGroups) {
      // Skip if already processed
      if (actorSignals.every((s) => processedSignals.has(s.id))) {
        continue;
      }

      // Find all connected signals through actor overlap
      const connectedSignals = this.findConnectedSignals(
        actorSignals[0],
        signals,
        processedSignals,
      );

      if (connectedSignals.length >= this.thresholds.minSignalsForCampaign) {
        // Create campaign
        const campaign = await this.createCampaignFromSignals(connectedSignals);
        campaigns.push(campaign);

        // Mark signals as processed
        for (const signal of connectedSignals) {
          processedSignals.add(signal.id);
          signal.campaignId = campaign.id;
          await this.updateSignalCampaign(signal.id, campaign.id);
        }
      }
    }

    logger.info(
      { campaignCount: campaigns.length },
      'Clustered signals into campaigns',
    );

    return campaigns;
  }

  /**
   * Find all signals connected through actor overlap
   */
  private findConnectedSignals(
    startSignal: CoordinationSignal,
    allSignals: CoordinationSignal[],
    processed: Set<string>,
  ): CoordinationSignal[] {
    const connected: CoordinationSignal[] = [startSignal];
    const toProcess = [startSignal];
    const seen = new Set([startSignal.id]);

    while (toProcess.length > 0) {
      const current = toProcess.pop()!;

      for (const signal of allSignals) {
        if (seen.has(signal.id) || processed.has(signal.id)) continue;

        // Check for actor overlap
        const hasOverlap = current.actorIds.some((a) =>
          signal.actorIds.includes(a),
        );

        if (hasOverlap) {
          seen.add(signal.id);
          connected.push(signal);
          toProcess.push(signal);
        }
      }
    }

    return connected;
  }

  /**
   * Create campaign from clustered signals
   */
  private async createCampaignFromSignals(
    signals: CoordinationSignal[],
  ): Promise<Campaign> {
    // Aggregate data from signals
    const allActors = new Set<string>();
    const allClaims = new Set<string>();
    const allChannels = new Set<string>();

    for (const signal of signals) {
      signal.actorIds.forEach((id) => allActors.add(id));
      signal.claimIds.forEach((id) => allClaims.add(id));
      signal.channelIds.forEach((id) => allChannels.add(id));
    }

    // Determine threat level based on signal types and confidence
    const threatLevel = this.calculateThreatLevel(signals);

    // Create campaign
    const campaign = createCampaign(
      `Campaign-${new Date().toISOString().split('T')[0]}-${randomUUID().slice(0, 8)}`,
      threatLevel,
    );

    campaign.coordinationSignalIds = signals.map((s) => s.id);
    campaign.actorIds = Array.from(allActors);
    campaign.claimIds = Array.from(allClaims);
    campaign.channelIds = Array.from(allChannels);
    campaign.status = 'SUSPECTED';

    // Calculate metrics
    campaign.metrics = await this.calculateCampaignMetrics(campaign);

    // Persist campaign
    await this.persistCampaign(campaign);

    logger.info(
      { campaignId: campaign.id, threatLevel, signalCount: signals.length },
      'Created campaign from signals',
    );

    return campaign;
  }

  /**
   * Calculate threat level from signals
   */
  private calculateThreatLevel(
    signals: CoordinationSignal[],
  ): CampaignThreatLevel {
    const avgConfidence =
      signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const hasLaundering = signals.some((s) => s.type === 'CONTENT_LAUNDERING');
    const hasNetworkAnomaly = signals.some((s) => s.type === 'NETWORK_ANOMALY');
    const hasBotNetwork = signals.some((s) => s.type === 'BOT_NETWORK');

    let score = avgConfidence * 50;

    if (hasLaundering) score += 20;
    if (hasNetworkAnomaly) score += 15;
    if (hasBotNetwork) score += 25;
    if (signals.length > 10) score += 10;

    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'INFORMATIONAL';
  }

  /**
   * Calculate campaign metrics
   */
  private async calculateCampaignMetrics(
    campaign: Campaign,
  ): Promise<CampaignMetrics> {
    const session = this.getSession();
    try {
      // Get claim details
      const result = await session.run(
        `
        UNWIND $claimIds AS claimId
        MATCH (c:CogSecClaim {id: claimId})
        OPTIONAL MATCH (c)-[:APPEARED_IN]->(ch:CogSecChannel)
        RETURN
          count(DISTINCT c) AS claimCount,
          count(DISTINCT ch) AS channelCount,
          count(DISTINCT ch.platform) AS platformCount,
          collect(DISTINCT c.language) AS languages
        `,
        { claimIds: campaign.claimIds },
      );

      const record = result.records[0];

      return {
        totalClaims: campaign.claimIds.length,
        totalActors: campaign.actorIds.length,
        totalChannels: campaign.channelIds.length,
        estimatedReach: campaign.actorIds.length * 1000, // Rough estimate
        platformSpread: record?.get('platformCount') || 1,
        languageCount: (record?.get('languages') as string[])?.length || 1,
        coordinationScore:
          campaign.coordinationSignalIds.length / campaign.claimIds.length,
        velocity: 0, // Would need time-series data
        engagementRate: 0, // Would need engagement data
      };
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Campaign Operations
  // ==========================================================================

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<Campaign | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH (camp:CogSecCampaign {id: $campaignId}) RETURN camp',
        { campaignId },
      );

      if (result.records.length === 0) return null;

      return this.recordToCampaign(result.records[0].get('camp'));
    } finally {
      await session.close();
    }
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    campaignId: string,
    status: Campaign['status'],
  ): Promise<Campaign> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (camp:CogSecCampaign {id: $campaignId})
        SET camp.status = $status,
            camp.updatedAt = datetime()
        RETURN camp
        `,
        { campaignId, status },
      );

      if (result.records.length === 0) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      return this.recordToCampaign(result.records[0].get('camp'));
    } finally {
      await session.close();
    }
  }

  /**
   * List active campaigns
   */
  async listActiveCampaigns(limit = 20): Promise<Campaign[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (camp:CogSecCampaign)
        WHERE camp.status IN ['ACTIVE', 'SUSPECTED', 'CONFIRMED']
        RETURN camp
        ORDER BY camp.lastActivityAt DESC
        LIMIT $limit
        `,
        { limit },
      );

      return result.records.map((r: any) =>
        this.recordToCampaign(r.get('camp')),
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get signals for campaign
   */
  async getCampaignSignals(campaignId: string): Promise<CoordinationSignal[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (s:CogSecCoordinationSignal {campaignId: $campaignId})
        RETURN s
        ORDER BY s.detectedAt DESC
        `,
        { campaignId },
      );

      return result.records.map((r: any) =>
        this.recordToSignal(r.get('s')),
      );
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  private async persistSignal(signal: CoordinationSignal): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        CREATE (s:CogSecCoordinationSignal {
          id: $id,
          type: $type,
          detectedAt: datetime($detectedAt),
          confidence: $confidence,
          description: $description,
          actorIds: $actorIds,
          claimIds: $claimIds,
          channelIds: $channelIds,
          evidence: $evidence,
          campaignId: $campaignId
        })
        `,
        {
          ...signal,
          evidence: JSON.stringify(signal.evidence),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async persistCampaign(campaign: Campaign): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        CREATE (camp:CogSecCampaign {
          id: $id,
          name: $name,
          description: $description,
          threatLevel: $threatLevel,
          status: $status,
          firstDetectedAt: datetime($firstDetectedAt),
          lastActivityAt: datetime($lastActivityAt),
          narrativeIds: $narrativeIds,
          actorIds: $actorIds,
          channelIds: $channelIds,
          coordinationSignalIds: $coordinationSignalIds,
          claimIds: $claimIds,
          targetAudienceIds: $targetAudienceIds,
          ttps: $ttps,
          attributionConfidence: $attributionConfidence,
          suspectedOrigin: $suspectedOrigin,
          responsePlaybookIds: $responsePlaybookIds,
          incidentId: $incidentId,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt),
          metrics: $metrics
        })
        `,
        {
          ...campaign,
          metrics: JSON.stringify(campaign.metrics),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async updateSignalCampaign(
    signalId: string,
    campaignId: string,
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (s:CogSecCoordinationSignal {id: $signalId})
        SET s.campaignId = $campaignId
        `,
        { signalId, campaignId },
      );
    } finally {
      await session.close();
    }
  }

  private recordToCampaign(node: any): Campaign {
    const props = node.properties || node;
    return {
      id: props.id,
      name: props.name,
      description: props.description,
      threatLevel: props.threatLevel,
      status: props.status,
      firstDetectedAt: props.firstDetectedAt?.toString() || props.firstDetectedAt,
      lastActivityAt: props.lastActivityAt?.toString() || props.lastActivityAt,
      narrativeIds: props.narrativeIds || [],
      actorIds: props.actorIds || [],
      channelIds: props.channelIds || [],
      coordinationSignalIds: props.coordinationSignalIds || [],
      claimIds: props.claimIds || [],
      targetAudienceIds: props.targetAudienceIds || [],
      ttps: props.ttps || [],
      attributionConfidence: props.attributionConfidence,
      suspectedOrigin: props.suspectedOrigin,
      responsePlaybookIds: props.responsePlaybookIds || [],
      incidentId: props.incidentId,
      createdAt: props.createdAt?.toString() || props.createdAt,
      updatedAt: props.updatedAt?.toString() || props.updatedAt,
      metrics:
        typeof props.metrics === 'string'
          ? JSON.parse(props.metrics)
          : props.metrics,
    };
  }

  private recordToSignal(node: any): CoordinationSignal {
    const props = node.properties || node;
    return {
      id: props.id,
      type: props.type,
      detectedAt: props.detectedAt?.toString() || props.detectedAt,
      confidence: props.confidence,
      description: props.description,
      actorIds: props.actorIds || [],
      claimIds: props.claimIds || [],
      channelIds: props.channelIds || [],
      evidence:
        typeof props.evidence === 'string'
          ? JSON.parse(props.evidence)
          : props.evidence,
      campaignId: props.campaignId,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    const session = this.getSession();
    try {
      await session.run('RETURN 1');
      return {
        healthy: true,
        details: {
          neo4jConnected: true,
          realTimeEnabled: this.config.realTimeEnabled,
          thresholds: this.thresholds,
        },
      };
    } catch (error: any) {
      return {
        healthy: false,
        details: {
          neo4jConnected: false,
          error: error instanceof Error ? error.message : 'Unknown',
        },
      };
    } finally {
      await session.close();
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let serviceInstance: CampaignDetectionService | null = null;

export function createCampaignDetectionService(
  config: CampaignDetectionConfig,
): CampaignDetectionService {
  return new CampaignDetectionService(config);
}

export function initializeCampaignDetectionService(
  config: CampaignDetectionConfig,
): CampaignDetectionService {
  serviceInstance = new CampaignDetectionService(config);
  return serviceInstance;
}

export function getCampaignDetectionService(): CampaignDetectionService {
  if (!serviceInstance) {
    throw new Error('Campaign detection service not initialized');
  }
  return serviceInstance;
}

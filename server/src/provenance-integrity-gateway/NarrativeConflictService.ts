/**
 * Narrative Conflict Service
 *
 * Monitors and analyzes narrative clusters impacting the organization,
 * tracking disinformation campaigns and providing systemic risk dashboards
 * aligned with EU DSA governance requirements.
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { Counter, Gauge, Histogram } from 'prom-client';
import pino from 'pino';
import { pool } from '../db/pg.js';
import { provenanceLedger } from '../provenance/ledger.js';
import type {
  NarrativeCluster,
  NarrativeContentItem,
  NarrativeRiskAssessment,
  RiskFactor,
  DSASystemicRisk,
  DSARiskType,
  SourceAnalysis,
} from './types.js';

const logger = (pino as any)({ name: 'NarrativeConflictService' });

// =============================================================================
// Metrics
// =============================================================================

const narrativeClustersTotal = new Gauge({
  name: 'pig_narrative_clusters_total',
  help: 'Total narrative clusters by status',
  labelNames: ['tenant_id', 'status', 'risk_category'],
});

const narrativeRiskScore = new Histogram({
  name: 'pig_narrative_risk_score',
  help: 'Distribution of narrative risk scores',
  buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  labelNames: ['tenant_id'],
});

const narrativeDetectionTotal = new Counter({
  name: 'pig_narrative_detection_total',
  help: 'Total narrative detections',
  labelNames: ['tenant_id', 'detection_method'],
});

const systemicRiskIndicators = new Gauge({
  name: 'pig_dsa_systemic_risk_indicators',
  help: 'DSA systemic risk indicators',
  labelNames: ['tenant_id', 'risk_type'],
});

// =============================================================================
// Configuration
// =============================================================================

export interface NarrativeConflictConfig {
  /** Enable real-time monitoring */
  enableRealTimeMonitoring: boolean;

  /** Platforms to monitor */
  monitoredPlatforms: string[];

  /** Keywords to track */
  trackingKeywords: string[];

  /** Entity names to monitor */
  monitoredEntities: string[];

  /** Domains to monitor */
  monitoredDomains: string[];

  /** Risk score threshold for escalation */
  escalationThreshold: number;

  /** Enable DSA systemic risk tracking */
  enableDSATracking: boolean;

  /** Clustering algorithm settings */
  clusteringConfig: ClusteringConfig;

  /** Notification settings */
  notifications: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    webhookUrl?: string;
  };

  /** Data retention (days) */
  retentionDays: number;
}

interface ClusteringConfig {
  /** Similarity threshold for clustering */
  similarityThreshold: number;

  /** Minimum items for a cluster */
  minClusterSize: number;

  /** Time window for clustering (hours) */
  timeWindowHours: number;

  /** Update frequency (minutes) */
  updateFrequencyMinutes: number;
}

export const defaultNarrativeConfig: NarrativeConflictConfig = {
  enableRealTimeMonitoring: true,
  monitoredPlatforms: ['twitter', 'facebook', 'linkedin', 'reddit', 'news'],
  trackingKeywords: [],
  monitoredEntities: [],
  monitoredDomains: [],
  escalationThreshold: 70,
  enableDSATracking: true,
  clusteringConfig: {
    similarityThreshold: 0.7,
    minClusterSize: 5,
    timeWindowHours: 72,
    updateFrequencyMinutes: 15,
  },
  notifications: {
    email: true,
    slack: false,
    webhook: false,
  },
  retentionDays: 90,
};

// =============================================================================
// Narrative Conflict Service
// =============================================================================

export class NarrativeConflictService extends EventEmitter {
  private config: NarrativeConflictConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private initialized = false;

  constructor(config: Partial<NarrativeConflictConfig> = {}) {
    super();
    this.config = { ...defaultNarrativeConfig, ...config };
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Start monitoring if enabled
      if (this.config.enableRealTimeMonitoring) {
        this.startMonitoring();
      }

      this.initialized = true;
      logger.info('NarrativeConflictService initialized');
    } catch (error: any) {
      logger.error({ error }, 'Failed to initialize NarrativeConflictService');
      throw error;
    }
  }

  // ===========================================================================
  // Cluster Management
  // ===========================================================================

  /**
   * Get or create a narrative cluster
   */
  async getOrCreateCluster(
    tenantId: string,
    theme: string,
    keywords: string[]
  ): Promise<NarrativeCluster> {
    await this.ensureInitialized();

    // Try to find existing cluster
    const existing = await this.findSimilarCluster(tenantId, theme, keywords);

    if (existing) {
      return existing;
    }

    // Create new cluster
    const clusterId = `nc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const cluster: NarrativeCluster = {
      id: clusterId,
      tenantId,
      theme,
      keywords,
      sentiment: 0,
      contentItems: [],
      firstDetected: new Date(),
      lastActivity: new Date(),
      velocity: 0,
      estimatedReach: 0,
      riskAssessment: {
        overallScore: 0,
        category: 'low',
        factors: [],
        impactAreas: [],
        coordinatedBehavior: false,
      },
      relatedEntities: [],
      sourceAnalysis: {
        sourceDistribution: [],
        geoDistribution: [],
        accountAgeDistribution: [],
        automationIndicators: {
          suspectedBotPercentage: 0,
          coordinatedPostingPatterns: false,
          unusualEngagementPatterns: false,
        },
        amplificationPatterns: {
          superSpreadersCount: 0,
          averageRepostDepth: 0,
        },
      },
      status: 'active',
    };

    await this.storeCluster(cluster);

    narrativeDetectionTotal.inc({
      tenant_id: tenantId,
      detection_method: 'new_cluster',
    });

    this.emit('narrative:detected', { cluster });

    return cluster;
  }

  /**
   * Add content item to a cluster
   */
  async addContentToCluster(
    clusterId: string,
    tenantId: string,
    item: Omit<NarrativeContentItem, 'id'>
  ): Promise<NarrativeCluster> {
    await this.ensureInitialized();

    const cluster = await this.getCluster(clusterId, tenantId);

    if (!cluster) {
      throw new Error(`Cluster not found: ${clusterId}`);
    }

    const newItem: NarrativeContentItem = {
      id: `nci_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      ...item,
    };

    cluster.contentItems.push(newItem);
    cluster.lastActivity = new Date();

    // Update velocity (items per hour over last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentItems = cluster.contentItems.filter(i => i.timestamp >= last24h);
    cluster.velocity = recentItems.length / 24;

    // Update estimated reach
    cluster.estimatedReach = cluster.contentItems.reduce((sum, i) => {
      return sum + (i.engagement.views || i.engagement.likes || 0);
    }, 0);

    // Update sentiment
    cluster.sentiment = await this.calculateSentiment(cluster.contentItems);

    // Recalculate risk
    cluster.riskAssessment = await this.assessClusterRisk(cluster);

    await this.updateCluster(cluster);

    // Check for escalation
    if (cluster.riskAssessment.overallScore >= this.config.escalationThreshold) {
      this.emit('narrative:escalated', {
        cluster,
        reason: `Risk score ${cluster.riskAssessment.overallScore} exceeds threshold ${this.config.escalationThreshold}`,
      });
    }

    return cluster;
  }

  /**
   * Get a cluster by ID
   */
  async getCluster(clusterId: string, tenantId: string): Promise<NarrativeCluster | null> {
    await this.ensureInitialized();

    const result = await pool.query(
      `SELECT * FROM pig_narrative_clusters WHERE id = $1 AND tenant_id = $2`,
      [clusterId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCluster(result.rows[0]);
  }

  /**
   * List clusters for a tenant
   */
  async listClusters(
    tenantId: string,
    options: {
      status?: NarrativeCluster['status'][];
      minRiskScore?: number;
      maxRiskScore?: number;
      theme?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ clusters: NarrativeCluster[]; total: number }> {
    await this.ensureInitialized();

    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (options.status && options.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex})`);
      params.push(options.status);
      paramIndex++;
    }

    if (options.minRiskScore !== undefined) {
      conditions.push(`risk_score >= $${paramIndex}`);
      params.push(options.minRiskScore);
      paramIndex++;
    }

    if (options.maxRiskScore !== undefined) {
      conditions.push(`risk_score <= $${paramIndex}`);
      params.push(options.maxRiskScore);
      paramIndex++;
    }

    if (options.theme) {
      conditions.push(`theme ILIKE $${paramIndex}`);
      params.push(`%${options.theme}%`);
      paramIndex++;
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM pig_narrative_clusters WHERE ${conditions.join(' AND ')}`,
      params
    );

    const dataResult = await pool.query(
      `SELECT * FROM pig_narrative_clusters
       WHERE ${conditions.join(' AND ')}
       ORDER BY risk_score DESC, last_activity DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return {
      clusters: dataResult.rows.map((row: any) => this.mapRowToCluster(row)),
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Update cluster status
   */
  async updateClusterStatus(
    clusterId: string,
    tenantId: string,
    status: NarrativeCluster['status'],
    userId: string
  ): Promise<NarrativeCluster> {
    await this.ensureInitialized();

    const cluster = await this.getCluster(clusterId, tenantId);

    if (!cluster) {
      throw new Error(`Cluster not found: ${clusterId}`);
    }

    const previousStatus = cluster.status;
    cluster.status = status;

    await this.updateCluster(cluster);

    // Record status change
    await provenanceLedger.appendEntry({
      tenantId,
      timestamp: new Date(),
      actionType: 'NARRATIVE_STATUS_CHANGED',
      resourceType: 'NarrativeCluster',
      resourceId: clusterId,
      actorId: userId,
      actorType: 'user',
      payload: {
        mutationType: 'UPDATE',
        entityId: clusterId,
        entityType: 'NarrativeCluster',
        previousState: {
          id: clusterId,
          type: 'NarrativeCluster',
          version: 1,
          data: { status: previousStatus },
          metadata: {},
        },
        newState: {
          id: clusterId,
          type: 'NarrativeCluster',
          version: 1,
          data: { status },
          metadata: {},
        },
      },
      metadata: {
        purpose: 'narrative-management',
      },
    });

    return cluster;
  }

  // ===========================================================================
  // Risk Assessment
  // ===========================================================================

  /**
   * Assess risk for a narrative cluster
   */
  async assessClusterRisk(cluster: NarrativeCluster): Promise<NarrativeRiskAssessment> {
    const factors: RiskFactor[] = [];
    let overallScore = 0;

    // Factor: Velocity (growth rate)
    const velocityScore = Math.min(100, cluster.velocity * 10);
    factors.push({
      name: 'Velocity',
      weight: 0.2,
      score: velocityScore,
      explanation: `${cluster.velocity.toFixed(1)} items/hour`,
    });
    overallScore += velocityScore * 0.2;

    // Factor: Reach
    const reachScore = Math.min(100, Math.log10(cluster.estimatedReach + 1) * 20);
    factors.push({
      name: 'Reach',
      weight: 0.25,
      score: reachScore,
      explanation: `Estimated reach: ${cluster.estimatedReach.toLocaleString()}`,
    });
    overallScore += reachScore * 0.25;

    // Factor: Sentiment (negative sentiment = higher risk)
    const sentimentScore = Math.max(0, (1 - cluster.sentiment) * 50);
    factors.push({
      name: 'Negative Sentiment',
      weight: 0.15,
      score: sentimentScore,
      explanation: `Sentiment: ${cluster.sentiment.toFixed(2)}`,
    });
    overallScore += sentimentScore * 0.15;

    // Factor: Coordinated behavior
    const coordScore = cluster.sourceAnalysis.automationIndicators.coordinatedPostingPatterns ? 80 : 0;
    factors.push({
      name: 'Coordinated Behavior',
      weight: 0.2,
      score: coordScore,
      explanation: coordScore > 0 ? 'Coordinated patterns detected' : 'No coordination detected',
    });
    overallScore += coordScore * 0.2;

    // Factor: Bot activity
    const botScore = cluster.sourceAnalysis.automationIndicators.suspectedBotPercentage;
    factors.push({
      name: 'Bot Activity',
      weight: 0.2,
      score: botScore,
      explanation: `${botScore.toFixed(0)}% suspected bot activity`,
    });
    overallScore += botScore * 0.2;

    // Determine category
    const category = this.scoreToCategory(overallScore);

    // Identify impact areas
    const impactAreas = this.identifyImpactAreas(cluster);

    // Check for DSA systemic risk
    let dsaSystemicRisk: DSASystemicRisk | undefined;
    if (this.config.enableDSATracking) {
      dsaSystemicRisk = await this.evaluateDSASystemicRisk(cluster);
    }

    return {
      overallScore: Math.round(overallScore),
      category,
      factors,
      impactAreas,
      coordinatedBehavior: cluster.sourceAnalysis.automationIndicators.coordinatedPostingPatterns,
      dsaSystemicRisk,
    };
  }

  /**
   * Evaluate DSA Article 34 systemic risk
   */
  async evaluateDSASystemicRisk(cluster: NarrativeCluster): Promise<DSASystemicRisk> {
    const riskTypes: DSARiskType[] = [];
    const mitigationMeasures: string[] = [];

    // Check for electoral process risks
    const electoralKeywords = ['election', 'vote', 'ballot', 'candidate', 'poll'];
    if (cluster.keywords.some(k => electoralKeywords.some(ek => k.toLowerCase().includes(ek)))) {
      riskTypes.push('electoral_processes_negative_effects');
    }

    // Check for public health risks
    const healthKeywords = ['vaccine', 'covid', 'health', 'medical', 'disease'];
    if (cluster.keywords.some(k => healthKeywords.some(hk => k.toLowerCase().includes(hk)))) {
      riskTypes.push('public_health_negative_effects');
    }

    // Check for public security risks
    const securityKeywords = ['terrorism', 'attack', 'violence', 'threat', 'security'];
    if (cluster.keywords.some(k => securityKeywords.some(sk => k.toLowerCase().includes(sk)))) {
      riskTypes.push('public_security_negative_effects');
    }

    // Check for civic discourse risks
    if (cluster.sentiment < -0.5 && cluster.riskAssessment.coordinatedBehavior) {
      riskTypes.push('civic_discourse_negative_effects');
    }

    // Add mitigation measures if risks detected
    if (riskTypes.length > 0) {
      mitigationMeasures.push('Content flagging enabled');
      mitigationMeasures.push('Monitoring intensified');

      if (cluster.riskAssessment.overallScore >= 70) {
        mitigationMeasures.push('Escalated to incident response');
      }
    }

    // Update metrics
    for (const riskType of riskTypes) {
      systemicRiskIndicators.set({
        tenant_id: cluster.tenantId,
        risk_type: riskType,
      }, 1);
    }

    return {
      indicated: riskTypes.length > 0,
      riskTypes,
      mitigationMeasures,
    };
  }

  // ===========================================================================
  // Dashboard Data
  // ===========================================================================

  /**
   * Get dashboard summary for a tenant
   */
  async getDashboardSummary(tenantId: string): Promise<NarrativeDashboard> {
    await this.ensureInitialized();

    const [
      activeClusters,
      highRiskClusters,
      recentActivity,
      topThemes,
      riskTrend,
    ] = await Promise.all([
      this.getActiveClusterCount(tenantId),
      this.getHighRiskClusterCount(tenantId),
      this.getRecentActivity(tenantId),
      this.getTopThemes(tenantId),
      this.getRiskTrend(tenantId),
    ]);

    // Get DSA systemic risk summary
    const dsaRiskSummary = this.config.enableDSATracking
      ? await this.getDSARiskSummary(tenantId)
      : undefined;

    return {
      tenantId,
      generatedAt: new Date(),
      activeClusters,
      highRiskClusters,
      recentActivity,
      topThemes,
      riskTrend,
      dsaRiskSummary,
    };
  }

  /**
   * Get heatmap data for geographic distribution
   */
  async getGeoHeatmap(tenantId: string): Promise<GeoHeatmapData[]> {
    await this.ensureInitialized();

    const result = await pool.query(
      `SELECT
        (source_analysis->'geoDistribution') as geo_data,
        risk_score
       FROM pig_narrative_clusters
       WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    const heatmap: Map<string, { count: number; avgRisk: number }> = new Map();

    for (const row of result.rows) {
      const geoData = row.geo_data || [];
      for (const geo of geoData) {
        const existing = heatmap.get(geo.country) || { count: 0, avgRisk: 0 };
        existing.count += 1;
        existing.avgRisk = (existing.avgRisk * (existing.count - 1) + row.risk_score) / existing.count;
        heatmap.set(geo.country, existing);
      }
    }

    return Array.from(heatmap.entries()).map(([country, data]) => ({
      country,
      count: data.count,
      avgRisk: Math.round(data.avgRisk),
    }));
  }

  /**
   * Get timeline data for a cluster
   */
  async getClusterTimeline(
    clusterId: string,
    tenantId: string,
    options: { granularity?: 'hour' | 'day' } = {}
  ): Promise<TimelineDataPoint[]> {
    await this.ensureInitialized();

    const cluster = await this.getCluster(clusterId, tenantId);

    if (!cluster) {
      throw new Error(`Cluster not found: ${clusterId}`);
    }

    const granularity = options.granularity || 'hour';
    const intervalMs = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const timeline: Map<number, { count: number; engagement: number }> = new Map();

    for (const item of cluster.contentItems) {
      const bucket = Math.floor(item.timestamp.getTime() / intervalMs) * intervalMs;
      const existing = timeline.get(bucket) || { count: 0, engagement: 0 };
      existing.count += 1;
      existing.engagement += (item.engagement.likes || 0) + (item.engagement.shares || 0);
      timeline.set(bucket, existing);
    }

    return Array.from(timeline.entries())
      .map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        count: data.count,
        engagement: data.engagement,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // ===========================================================================
  // Monitoring
  // ===========================================================================

  /**
   * Start real-time monitoring
   */
  private startMonitoring(): void {
    const intervalMs = this.config.clusteringConfig.updateFrequencyMinutes * 60 * 1000;

    this.monitoringInterval = setInterval(() => {
      this.runMonitoringCycle().catch(error => {
        logger.error({ error }, 'Monitoring cycle failed');
      });
    }, intervalMs);

    logger.info({ intervalMs }, 'Started narrative monitoring');
  }

  /**
   * Run a monitoring cycle
   */
  private async runMonitoringCycle(): Promise<void> {
    // Would integrate with external monitoring platforms
    // For now, update cluster metrics

    const result = await pool.query(
      `SELECT tenant_id, status, risk_score, COUNT(*) as count
       FROM pig_narrative_clusters
       GROUP BY tenant_id, status, risk_score`
    );

    for (const row of result.rows) {
      narrativeClustersTotal.set({
        tenant_id: row.tenant_id,
        status: row.status,
        risk_category: this.scoreToCategory(row.risk_score || 0),
      }, parseInt(row.count));
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Find similar existing cluster
   */
  private async findSimilarCluster(
    tenantId: string,
    theme: string,
    keywords: string[]
  ): Promise<NarrativeCluster | null> {
    const timeWindow = new Date(
      Date.now() - this.config.clusteringConfig.timeWindowHours * 60 * 60 * 1000
    );

    const result = await pool.query(
      `SELECT * FROM pig_narrative_clusters
       WHERE tenant_id = $1
       AND status = 'active'
       AND last_activity >= $2
       AND (theme ILIKE $3 OR keywords && $4)
       ORDER BY last_activity DESC
       LIMIT 1`,
      [tenantId, timeWindow, `%${theme}%`, keywords]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCluster(result.rows[0]);
  }

  /**
   * Calculate sentiment for content items
   */
  private async calculateSentiment(items: NarrativeContentItem[]): Promise<number> {
    // Would use sentiment analysis model
    // For now, return neutral
    return 0;
  }

  /**
   * Identify impact areas from cluster content
   */
  private identifyImpactAreas(cluster: NarrativeCluster): string[] {
    const areas: string[] = [];

    if (cluster.relatedEntities.length > 0) {
      areas.push('Brand/Reputation');
    }

    if (cluster.estimatedReach > 10000) {
      areas.push('Public Perception');
    }

    if (cluster.riskAssessment.coordinatedBehavior) {
      areas.push('Security');
    }

    return areas;
  }

  /**
   * Score to category mapping
   */
  private scoreToCategory(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Store cluster in database
   */
  private async storeCluster(cluster: NarrativeCluster): Promise<void> {
    await pool.query(
      `INSERT INTO pig_narrative_clusters (
        id, tenant_id, theme, keywords, sentiment, content_items,
        first_detected, last_activity, velocity, estimated_reach,
        risk_score, risk_assessment, related_entities,
        source_analysis, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        cluster.id,
        cluster.tenantId,
        cluster.theme,
        cluster.keywords,
        cluster.sentiment,
        JSON.stringify(cluster.contentItems),
        cluster.firstDetected,
        cluster.lastActivity,
        cluster.velocity,
        cluster.estimatedReach,
        cluster.riskAssessment.overallScore,
        JSON.stringify(cluster.riskAssessment),
        cluster.relatedEntities,
        JSON.stringify(cluster.sourceAnalysis),
        cluster.status,
      ]
    );
  }

  /**
   * Update cluster in database
   */
  private async updateCluster(cluster: NarrativeCluster): Promise<void> {
    await pool.query(
      `UPDATE pig_narrative_clusters SET
        theme = $3,
        keywords = $4,
        sentiment = $5,
        content_items = $6,
        last_activity = $7,
        velocity = $8,
        estimated_reach = $9,
        risk_score = $10,
        risk_assessment = $11,
        related_entities = $12,
        source_analysis = $13,
        status = $14
      WHERE id = $1 AND tenant_id = $2`,
      [
        cluster.id,
        cluster.tenantId,
        cluster.theme,
        cluster.keywords,
        cluster.sentiment,
        JSON.stringify(cluster.contentItems),
        cluster.lastActivity,
        cluster.velocity,
        cluster.estimatedReach,
        cluster.riskAssessment.overallScore,
        JSON.stringify(cluster.riskAssessment),
        cluster.relatedEntities,
        JSON.stringify(cluster.sourceAnalysis),
        cluster.status,
      ]
    );

    // Update metrics
    narrativeRiskScore.observe(
      { tenant_id: cluster.tenantId },
      cluster.riskAssessment.overallScore
    );
  }

  /**
   * Map database row to NarrativeCluster
   */
  private mapRowToCluster(row: any): NarrativeCluster {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      theme: row.theme,
      keywords: row.keywords,
      sentiment: row.sentiment,
      contentItems: this.parseJSON(row.content_items) || [],
      firstDetected: row.first_detected,
      lastActivity: row.last_activity,
      velocity: row.velocity,
      estimatedReach: row.estimated_reach,
      riskAssessment: this.parseJSON(row.risk_assessment) || {
        overallScore: row.risk_score || 0,
        category: 'low',
        factors: [],
        impactAreas: [],
        coordinatedBehavior: false,
      },
      relatedEntities: row.related_entities || [],
      sourceAnalysis: this.parseJSON(row.source_analysis) || {
        sourceDistribution: [],
        geoDistribution: [],
        accountAgeDistribution: [],
        automationIndicators: {
          suspectedBotPercentage: 0,
          coordinatedPostingPatterns: false,
          unusualEngagementPatterns: false,
        },
        amplificationPatterns: {
          superSpreadersCount: 0,
          averageRepostDepth: 0,
        },
      },
      status: row.status,
    };
  }

  /**
   * Parse JSON safely
   */
  private parseJSON(value: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Get active cluster count
   */
  private async getActiveClusterCount(tenantId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) FROM pig_narrative_clusters WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get high risk cluster count
   */
  private async getHighRiskClusterCount(tenantId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) FROM pig_narrative_clusters
       WHERE tenant_id = $1 AND status = 'active' AND risk_score >= 70`,
      [tenantId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity(tenantId: string): Promise<RecentActivityItem[]> {
    const result = await pool.query(
      `SELECT id, theme, last_activity, risk_score
       FROM pig_narrative_clusters
       WHERE tenant_id = $1
       ORDER BY last_activity DESC
       LIMIT 10`,
      [tenantId]
    );

    return result.rows.map((row: any) => ({
      clusterId: row.id,
      theme: row.theme,
      lastActivity: row.last_activity,
      riskScore: row.risk_score,
    }));
  }

  /**
   * Get top themes
   */
  private async getTopThemes(tenantId: string): Promise<ThemeSummary[]> {
    const result = await pool.query(
      `SELECT theme, COUNT(*) as count, AVG(risk_score) as avg_risk
       FROM pig_narrative_clusters
       WHERE tenant_id = $1 AND status = 'active'
       GROUP BY theme
       ORDER BY count DESC
       LIMIT 10`,
      [tenantId]
    );

    return result.rows.map((row: any) => ({
      theme: row.theme,
      count: parseInt(row.count),
      avgRisk: Math.round(parseFloat(row.avg_risk)),
    }));
  }

  /**
   * Get risk trend
   */
  private async getRiskTrend(tenantId: string): Promise<RiskTrendPoint[]> {
    const result = await pool.query(
      `SELECT
        DATE_TRUNC('day', last_activity) as day,
        AVG(risk_score) as avg_risk,
        COUNT(*) as count
       FROM pig_narrative_clusters
       WHERE tenant_id = $1 AND last_activity >= NOW() - INTERVAL '30 days'
       GROUP BY DATE_TRUNC('day', last_activity)
       ORDER BY day ASC`,
      [tenantId]
    );

    return result.rows.map((row: any) => ({
      date: row.day,
      avgRisk: Math.round(parseFloat(row.avg_risk)),
      clusterCount: parseInt(row.count),
    }));
  }

  /**
   * Get DSA risk summary
   */
  private async getDSARiskSummary(tenantId: string): Promise<DSARiskSummary> {
    const result = await pool.query(
      `SELECT risk_assessment
       FROM pig_narrative_clusters
       WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    const riskTypeCounts: Record<string, number> = {};

    for (const row of result.rows) {
      const assessment = this.parseJSON(row.risk_assessment);
      if (assessment?.dsaSystemicRisk?.riskTypes) {
        for (const riskType of assessment.dsaSystemicRisk.riskTypes) {
          riskTypeCounts[riskType] = (riskTypeCounts[riskType] || 0) + 1;
        }
      }
    }

    return {
      totalSystemicRisks: Object.values(riskTypeCounts).reduce((a, b) => a + b, 0),
      risksByType: riskTypeCounts,
    };
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

// =============================================================================
// Types
// =============================================================================

interface NarrativeDashboard {
  tenantId: string;
  generatedAt: Date;
  activeClusters: number;
  highRiskClusters: number;
  recentActivity: RecentActivityItem[];
  topThemes: ThemeSummary[];
  riskTrend: RiskTrendPoint[];
  dsaRiskSummary?: DSARiskSummary;
}

interface RecentActivityItem {
  clusterId: string;
  theme: string;
  lastActivity: Date;
  riskScore: number;
}

interface ThemeSummary {
  theme: string;
  count: number;
  avgRisk: number;
}

interface RiskTrendPoint {
  date: Date;
  avgRisk: number;
  clusterCount: number;
}

interface DSARiskSummary {
  totalSystemicRisks: number;
  risksByType: Record<string, number>;
}

interface GeoHeatmapData {
  country: string;
  count: number;
  avgRisk: number;
}

interface TimelineDataPoint {
  timestamp: Date;
  count: number;
  engagement: number;
}

// Export default instance
export const narrativeConflictService = new NarrativeConflictService();

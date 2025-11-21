/**
 * Anomaly Correlation Service
 *
 * Multi-source anomaly detection and correlation engine that connects the dots
 * across disparate data streams to identify threat patterns and insider risks.
 */

import { randomUUID } from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'AnomalyCorrelationService' });

// Core Anomaly Types
export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: SeverityLevel;
  confidence: number;
  source: DataSource;
  timestamp: Date;
  entityId?: string;
  description: string;
  indicators: AnomalyIndicator[];
  context: AnomalyContext;
  status: AnomalyStatus;
  correlations: string[]; // IDs of correlated anomalies
}

export type AnomalyType =
  | 'BEHAVIORAL_DEVIATION'
  | 'ACCESS_ANOMALY'
  | 'COMMUNICATION_PATTERN'
  | 'TEMPORAL_ANOMALY'
  | 'GEOSPATIAL_ANOMALY'
  | 'NETWORK_ANOMALY'
  | 'DATA_EXFILTRATION'
  | 'PRIVILEGE_ESCALATION'
  | 'AUTHENTICATION_ANOMALY'
  | 'SOCIAL_ENGINEERING'
  | 'INSIDER_THREAT_INDICATOR'
  | 'FOREIGN_CONTACT'
  | 'FINANCIAL_ANOMALY'
  | 'TRAVEL_ANOMALY';

export type SeverityLevel = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AnomalyStatus = 'NEW' | 'INVESTIGATING' | 'CORRELATED' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface DataSource {
  type: SourceType;
  name: string;
  reliability: number;
  lastSync: Date;
}

export type SourceType =
  | 'SIEM'
  | 'DLP'
  | 'IAM'
  | 'NETWORK'
  | 'ENDPOINT'
  | 'EMAIL'
  | 'HR_SYSTEM'
  | 'BADGE_ACCESS'
  | 'TRAVEL'
  | 'FINANCIAL'
  | 'OSINT'
  | 'HUMINT'
  | 'SIGINT';

export interface AnomalyIndicator {
  name: string;
  value: string | number;
  baseline?: string | number;
  deviation: number;
  weight: number;
}

export interface AnomalyContext {
  entityProfile?: EntityProfile;
  historicalBaseline?: HistoricalBaseline;
  peerComparison?: PeerComparison;
  environmentalFactors?: EnvironmentalFactor[];
  relatedEvents?: RelatedEvent[];
}

export interface EntityProfile {
  entityId: string;
  entityType: 'PERSON' | 'SYSTEM' | 'ORGANIZATION';
  riskScore: number;
  clearanceLevel?: string;
  accessGroups: string[];
  behavioralBaseline: BehavioralBaseline;
  recentChanges: ProfileChange[];
}

export interface BehavioralBaseline {
  workingHours: { start: number; end: number };
  typicalLocations: string[];
  communicationPatterns: CommunicationPattern[];
  accessPatterns: AccessPattern[];
  dataHandlingProfile: DataHandlingProfile;
}

export interface CommunicationPattern {
  channel: string;
  frequency: number;
  typicalContacts: string[];
  volumeBaseline: { mean: number; stdDev: number };
}

export interface AccessPattern {
  resource: string;
  frequency: number;
  typicalTimes: number[];
  volumeBaseline: { mean: number; stdDev: number };
}

export interface DataHandlingProfile {
  typicalDataTypes: string[];
  averageVolume: number;
  typicalDestinations: string[];
  encryptionUsage: number;
}

export interface ProfileChange {
  timestamp: Date;
  field: string;
  oldValue: string;
  newValue: string;
  source: string;
}

export interface HistoricalBaseline {
  period: string;
  metrics: BaselineMetric[];
  seasonalFactors: SeasonalFactor[];
}

export interface BaselineMetric {
  name: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
}

export interface SeasonalFactor {
  period: string;
  multiplier: number;
  notes: string;
}

export interface PeerComparison {
  peerGroup: string;
  peerCount: number;
  percentileRank: number;
  significantDeviations: string[];
}

export interface EnvironmentalFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface RelatedEvent {
  eventId: string;
  type: string;
  timestamp: Date;
  relevance: number;
}

// Correlation Types
export interface CorrelationCluster {
  id: string;
  name: string;
  anomalies: Anomaly[];
  pattern: ThreatPattern;
  confidence: number;
  severity: SeverityLevel;
  timeline: ClusterTimeline;
  entities: string[];
  hypothesis: ThreatHypothesis;
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ThreatPattern {
  type: ThreatPatternType;
  name: string;
  description: string;
  stages: PatternStage[];
  indicators: string[];
  mitreMapping: string[];
}

export type ThreatPatternType =
  | 'INSIDER_THREAT'
  | 'EXTERNAL_INTRUSION'
  | 'APT_CAMPAIGN'
  | 'DATA_THEFT'
  | 'SABOTAGE'
  | 'ESPIONAGE'
  | 'FRAUD'
  | 'RECRUITMENT'
  | 'RADICALIZATION';

export interface PatternStage {
  name: string;
  order: number;
  requiredAnomalies: AnomalyType[];
  optionalAnomalies: AnomalyType[];
  timeWindow: number; // hours
}

export interface ClusterTimeline {
  start: Date;
  end: Date;
  events: TimelineEvent[];
  velocity: number; // events per hour
  acceleration: number; // change in velocity
}

export interface TimelineEvent {
  timestamp: Date;
  anomalyId: string;
  type: AnomalyType;
  description: string;
}

export interface ThreatHypothesis {
  primary: string;
  confidence: number;
  alternatives: AlternativeHypothesis[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  gaps: string[];
}

export interface AlternativeHypothesis {
  hypothesis: string;
  probability: number;
  requiredEvidence: string[];
}

// Risk Scoring
export interface RiskScore {
  entityId: string;
  overallScore: number;
  components: RiskComponent[];
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  percentileRank: number;
  lastUpdated: Date;
  contributingAnomalies: string[];
}

export interface RiskComponent {
  category: RiskCategory;
  score: number;
  weight: number;
  indicators: string[];
}

export type RiskCategory =
  | 'BEHAVIORAL'
  | 'ACCESS'
  | 'TECHNICAL'
  | 'PERSONAL'
  | 'FINANCIAL'
  | 'FOREIGN_NEXUS'
  | 'SECURITY_POSTURE';

// Alert Types
export interface CorrelationAlert {
  id: string;
  type: AlertType;
  severity: SeverityLevel;
  cluster: CorrelationCluster;
  title: string;
  summary: string;
  actionRequired: boolean;
  assignedTo?: string;
  status: AlertStatus;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolution?: AlertResolution;
}

export type AlertType =
  | 'PATTERN_MATCH'
  | 'THRESHOLD_BREACH'
  | 'ANOMALY_CORRELATION'
  | 'RISK_ESCALATION'
  | 'BEHAVIOR_CHANGE'
  | 'POLICY_VIOLATION';

export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED';

export interface AlertResolution {
  outcome: 'CONFIRMED_THREAT' | 'FALSE_POSITIVE' | 'POLICY_EXCEPTION' | 'REMEDIATED';
  notes: string;
  actions: string[];
  resolvedBy: string;
}

export class AnomalyCorrelationService {
  private anomalies: Map<string, Anomaly> = new Map();
  private clusters: Map<string, CorrelationCluster> = new Map();
  private riskScores: Map<string, RiskScore> = new Map();
  private threatPatterns: ThreatPattern[] = [];
  private alerts: Map<string, CorrelationAlert> = new Map();

  constructor() {
    this.initializeThreatPatterns();
    logger.info('Anomaly Correlation Service initialized');
  }

  private initializeThreatPatterns(): void {
    this.threatPatterns = [
      {
        type: 'INSIDER_THREAT',
        name: 'Data Exfiltration Pattern',
        description: 'Pattern indicating potential unauthorized data removal',
        stages: [
          {
            name: 'Reconnaissance',
            order: 1,
            requiredAnomalies: ['ACCESS_ANOMALY'],
            optionalAnomalies: ['BEHAVIORAL_DEVIATION'],
            timeWindow: 168, // 1 week
          },
          {
            name: 'Collection',
            order: 2,
            requiredAnomalies: ['DATA_EXFILTRATION'],
            optionalAnomalies: ['ACCESS_ANOMALY', 'TEMPORAL_ANOMALY'],
            timeWindow: 72,
          },
          {
            name: 'Exfiltration',
            order: 3,
            requiredAnomalies: ['DATA_EXFILTRATION', 'NETWORK_ANOMALY'],
            optionalAnomalies: ['TEMPORAL_ANOMALY'],
            timeWindow: 24,
          },
        ],
        indicators: [
          'Unusual data access volume',
          'After-hours activity',
          'USB device usage',
          'Cloud upload activity',
          'Email to personal accounts',
        ],
        mitreMapping: ['T1020', 'T1041', 'T1048', 'T1567'],
      },
      {
        type: 'ESPIONAGE',
        name: 'Foreign Recruitment Pattern',
        description: 'Pattern indicating potential foreign intelligence recruitment',
        stages: [
          {
            name: 'Spotting',
            order: 1,
            requiredAnomalies: ['FOREIGN_CONTACT'],
            optionalAnomalies: ['TRAVEL_ANOMALY'],
            timeWindow: 720, // 30 days
          },
          {
            name: 'Assessment',
            order: 2,
            requiredAnomalies: ['COMMUNICATION_PATTERN', 'FOREIGN_CONTACT'],
            optionalAnomalies: ['FINANCIAL_ANOMALY'],
            timeWindow: 336, // 14 days
          },
          {
            name: 'Development',
            order: 3,
            requiredAnomalies: ['BEHAVIORAL_DEVIATION'],
            optionalAnomalies: ['FINANCIAL_ANOMALY', 'TRAVEL_ANOMALY'],
            timeWindow: 168,
          },
        ],
        indicators: [
          'Undisclosed foreign contacts',
          'Unusual travel patterns',
          'Financial stress indicators',
          'Access to sensitive information',
          'Ideological indicators',
        ],
        mitreMapping: [],
      },
      {
        type: 'APT_CAMPAIGN',
        name: 'Advanced Persistent Threat',
        description: 'Pattern indicating sophisticated external intrusion',
        stages: [
          {
            name: 'Initial Access',
            order: 1,
            requiredAnomalies: ['AUTHENTICATION_ANOMALY'],
            optionalAnomalies: ['SOCIAL_ENGINEERING'],
            timeWindow: 24,
          },
          {
            name: 'Persistence',
            order: 2,
            requiredAnomalies: ['PRIVILEGE_ESCALATION'],
            optionalAnomalies: ['NETWORK_ANOMALY'],
            timeWindow: 72,
          },
          {
            name: 'Lateral Movement',
            order: 3,
            requiredAnomalies: ['ACCESS_ANOMALY', 'NETWORK_ANOMALY'],
            optionalAnomalies: ['AUTHENTICATION_ANOMALY'],
            timeWindow: 168,
          },
          {
            name: 'Collection & Exfiltration',
            order: 4,
            requiredAnomalies: ['DATA_EXFILTRATION'],
            optionalAnomalies: ['NETWORK_ANOMALY'],
            timeWindow: 48,
          },
        ],
        indicators: [
          'Unusual authentication patterns',
          'Lateral movement indicators',
          'C2 traffic patterns',
          'Living-off-the-land techniques',
          'Data staging behavior',
        ],
        mitreMapping: ['T1078', 'T1068', 'T1021', 'T1074', 'T1041'],
      },
    ];
  }

  /**
   * Ingest and process a new anomaly
   */
  async ingestAnomaly(input: AnomalyInput): Promise<Anomaly> {
    const anomaly: Anomaly = {
      id: randomUUID(),
      type: input.type,
      severity: this.calculateSeverity(input),
      confidence: input.confidence || 0.7,
      source: input.source,
      timestamp: input.timestamp || new Date(),
      entityId: input.entityId,
      description: input.description,
      indicators: input.indicators || [],
      context: await this.buildContext(input),
      status: 'NEW',
      correlations: [],
    };

    this.anomalies.set(anomaly.id, anomaly);

    // Update entity risk score
    if (anomaly.entityId) {
      await this.updateRiskScore(anomaly.entityId, anomaly);
    }

    // Attempt correlation
    await this.correlateAnomaly(anomaly);

    logger.info(`Ingested anomaly: ${anomaly.type} (${anomaly.id}) - Severity: ${anomaly.severity}`);

    return anomaly;
  }

  /**
   * Correlate anomalies across multiple dimensions
   */
  async correlateAnomalies(): Promise<CorrelationCluster[]> {
    const newClusters: CorrelationCluster[] = [];
    const uncorrelated = Array.from(this.anomalies.values())
      .filter(a => a.status === 'NEW' || a.status === 'INVESTIGATING');

    // Temporal correlation
    const temporalGroups = this.groupByTimeWindow(uncorrelated, 24 * 60 * 60 * 1000); // 24 hours

    for (const group of temporalGroups) {
      if (group.length < 2) continue;

      // Entity correlation
      const entityGroups = this.groupByEntity(group);

      for (const [entityId, entityAnomalies] of Object.entries(entityGroups)) {
        if (entityAnomalies.length < 2) continue;

        // Pattern matching
        const matchedPattern = this.matchThreatPattern(entityAnomalies);

        if (matchedPattern) {
          const cluster = await this.createCluster(entityAnomalies, matchedPattern);
          newClusters.push(cluster);

          // Update anomaly statuses
          for (const anomaly of entityAnomalies) {
            anomaly.status = 'CORRELATED';
            anomaly.correlations.push(cluster.id);
          }

          // Generate alert if severity warrants
          if (cluster.severity === 'HIGH' || cluster.severity === 'CRITICAL') {
            await this.generateAlert(cluster);
          }
        }
      }
    }

    // Cross-entity correlation for coordinated threats
    const crossEntityClusters = await this.detectCrossEntityPatterns(uncorrelated);
    newClusters.push(...crossEntityClusters);

    return newClusters;
  }

  /**
   * Calculate composite risk score for an entity
   */
  async calculateRiskScore(entityId: string): Promise<RiskScore> {
    const entityAnomalies = Array.from(this.anomalies.values())
      .filter(a => a.entityId === entityId);

    const components: RiskComponent[] = [
      this.calculateBehavioralRisk(entityAnomalies),
      this.calculateAccessRisk(entityAnomalies),
      this.calculateTechnicalRisk(entityAnomalies),
      this.calculatePersonalRisk(entityAnomalies),
      this.calculateFinancialRisk(entityAnomalies),
      this.calculateForeignNexusRisk(entityAnomalies),
    ];

    const overallScore = components.reduce((sum, c) => sum + c.score * c.weight, 0) /
                         components.reduce((sum, c) => sum + c.weight, 0);

    const previousScore = this.riskScores.get(entityId);
    const trend = previousScore
      ? overallScore > previousScore.overallScore + 5 ? 'INCREASING'
        : overallScore < previousScore.overallScore - 5 ? 'DECREASING'
        : 'STABLE'
      : 'STABLE';

    const riskScore: RiskScore = {
      entityId,
      overallScore,
      components,
      trend,
      percentileRank: this.calculatePercentileRank(overallScore),
      lastUpdated: new Date(),
      contributingAnomalies: entityAnomalies.map(a => a.id),
    };

    this.riskScores.set(entityId, riskScore);

    return riskScore;
  }

  /**
   * Query anomalies with complex filters
   */
  queryAnomalies(query: AnomalyQuery): Anomaly[] {
    let results = Array.from(this.anomalies.values());

    if (query.types) {
      results = results.filter(a => query.types!.includes(a.type));
    }

    if (query.severities) {
      results = results.filter(a => query.severities!.includes(a.severity));
    }

    if (query.entityIds) {
      results = results.filter(a => a.entityId && query.entityIds!.includes(a.entityId));
    }

    if (query.sources) {
      results = results.filter(a => query.sources!.includes(a.source.type));
    }

    if (query.startDate) {
      results = results.filter(a => a.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter(a => a.timestamp <= query.endDate!);
    }

    if (query.minConfidence) {
      results = results.filter(a => a.confidence >= query.minConfidence!);
    }

    if (query.statuses) {
      results = results.filter(a => query.statuses!.includes(a.status));
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get high-risk entities requiring attention
   */
  getHighRiskEntities(threshold: number = 70): RiskScore[] {
    return Array.from(this.riskScores.values())
      .filter(r => r.overallScore >= threshold)
      .sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Generate threat intelligence from correlation data
   */
  async generateThreatIntelligence(): Promise<ThreatIntelligenceReport> {
    const activeClusters = Array.from(this.clusters.values())
      .filter(c => c.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    const topThreats = activeClusters
      .filter(c => c.severity === 'HIGH' || c.severity === 'CRITICAL')
      .slice(0, 10);

    const trendAnalysis = this.analyzeTrends();
    const emergingPatterns = this.detectEmergingPatterns();

    return {
      generatedAt: new Date(),
      period: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      summary: {
        totalAnomalies: this.anomalies.size,
        criticalClusters: activeClusters.filter(c => c.severity === 'CRITICAL').length,
        highRiskEntities: this.getHighRiskEntities(80).length,
        activeInvestigations: Array.from(this.alerts.values()).filter(a => a.status === 'INVESTIGATING').length,
      },
      topThreats: topThreats.map(c => ({
        clusterId: c.id,
        name: c.name,
        pattern: c.pattern.type,
        severity: c.severity,
        confidence: c.confidence,
        entities: c.entities,
        recommendation: c.recommendations[0],
      })),
      trendAnalysis,
      emergingPatterns,
      recommendations: this.generateStrategicRecommendations(activeClusters, trendAnalysis),
    };
  }

  // Private helper methods
  private calculateSeverity(input: AnomalyInput): SeverityLevel {
    const weights: Record<AnomalyType, number> = {
      BEHAVIORAL_DEVIATION: 40,
      ACCESS_ANOMALY: 50,
      COMMUNICATION_PATTERN: 30,
      TEMPORAL_ANOMALY: 20,
      GEOSPATIAL_ANOMALY: 30,
      NETWORK_ANOMALY: 50,
      DATA_EXFILTRATION: 80,
      PRIVILEGE_ESCALATION: 70,
      AUTHENTICATION_ANOMALY: 60,
      SOCIAL_ENGINEERING: 50,
      INSIDER_THREAT_INDICATOR: 90,
      FOREIGN_CONTACT: 70,
      FINANCIAL_ANOMALY: 40,
      TRAVEL_ANOMALY: 30,
    };

    const baseScore = weights[input.type] || 50;
    const confidenceAdjusted = baseScore * (input.confidence || 0.7);

    if (confidenceAdjusted >= 80) return 'CRITICAL';
    if (confidenceAdjusted >= 60) return 'HIGH';
    if (confidenceAdjusted >= 40) return 'MEDIUM';
    if (confidenceAdjusted >= 20) return 'LOW';
    return 'INFO';
  }

  private async buildContext(input: AnomalyInput): Promise<AnomalyContext> {
    const context: AnomalyContext = {};

    if (input.entityId) {
      context.entityProfile = await this.getEntityProfile(input.entityId);
      context.historicalBaseline = await this.getHistoricalBaseline(input.entityId, input.type);
      context.peerComparison = await this.getPeerComparison(input.entityId, input.type);
    }

    context.environmentalFactors = this.getEnvironmentalFactors();
    context.relatedEvents = await this.findRelatedEvents(input);

    return context;
  }

  private async getEntityProfile(entityId: string): Promise<EntityProfile | undefined> {
    // Would integrate with entity management system
    return undefined;
  }

  private async getHistoricalBaseline(entityId: string, type: AnomalyType): Promise<HistoricalBaseline | undefined> {
    return undefined;
  }

  private async getPeerComparison(entityId: string, type: AnomalyType): Promise<PeerComparison | undefined> {
    return undefined;
  }

  private getEnvironmentalFactors(): EnvironmentalFactor[] {
    return [];
  }

  private async findRelatedEvents(input: AnomalyInput): Promise<RelatedEvent[]> {
    return [];
  }

  private async correlateAnomaly(anomaly: Anomaly): Promise<void> {
    // Find recent anomalies for same entity
    if (!anomaly.entityId) return;

    const relatedAnomalies = Array.from(this.anomalies.values())
      .filter(a =>
        a.id !== anomaly.id &&
        a.entityId === anomaly.entityId &&
        a.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

    if (relatedAnomalies.length === 0) return;

    const allAnomalies = [anomaly, ...relatedAnomalies];
    const matchedPattern = this.matchThreatPattern(allAnomalies);

    if (matchedPattern) {
      const existingCluster = Array.from(this.clusters.values())
        .find(c => c.entities.includes(anomaly.entityId!) && c.pattern.type === matchedPattern.type);

      if (existingCluster) {
        this.updateCluster(existingCluster, anomaly);
      } else {
        const cluster = await this.createCluster(allAnomalies, matchedPattern);
        if (cluster.severity === 'HIGH' || cluster.severity === 'CRITICAL') {
          await this.generateAlert(cluster);
        }
      }
    }
  }

  private groupByTimeWindow(anomalies: Anomaly[], windowMs: number): Anomaly[][] {
    const sorted = [...anomalies].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const groups: Anomaly[][] = [];
    let currentGroup: Anomaly[] = [];

    for (const anomaly of sorted) {
      if (currentGroup.length === 0) {
        currentGroup.push(anomaly);
      } else {
        const lastTimestamp = currentGroup[currentGroup.length - 1].timestamp.getTime();
        if (anomaly.timestamp.getTime() - lastTimestamp <= windowMs) {
          currentGroup.push(anomaly);
        } else {
          groups.push(currentGroup);
          currentGroup = [anomaly];
        }
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private groupByEntity(anomalies: Anomaly[]): Record<string, Anomaly[]> {
    const groups: Record<string, Anomaly[]> = {};

    for (const anomaly of anomalies) {
      if (anomaly.entityId) {
        if (!groups[anomaly.entityId]) {
          groups[anomaly.entityId] = [];
        }
        groups[anomaly.entityId].push(anomaly);
      }
    }

    return groups;
  }

  private matchThreatPattern(anomalies: Anomaly[]): ThreatPattern | null {
    const anomalyTypes = new Set(anomalies.map(a => a.type));

    for (const pattern of this.threatPatterns) {
      let stagesMatched = 0;

      for (const stage of pattern.stages) {
        const requiredMatched = stage.requiredAnomalies.every(t => anomalyTypes.has(t));
        const optionalMatched = stage.optionalAnomalies.some(t => anomalyTypes.has(t));

        if (requiredMatched || (stage.optionalAnomalies.length > 0 && optionalMatched)) {
          stagesMatched++;
        }
      }

      // Require at least 2 stages to match
      if (stagesMatched >= 2) {
        return pattern;
      }
    }

    return null;
  }

  private async createCluster(anomalies: Anomaly[], pattern: ThreatPattern): Promise<CorrelationCluster> {
    const entities = [...new Set(anomalies.filter(a => a.entityId).map(a => a.entityId!))];
    const timestamps = anomalies.map(a => a.timestamp.getTime());

    const cluster: CorrelationCluster = {
      id: randomUUID(),
      name: `${pattern.name} - ${entities.join(', ').substring(0, 50)}`,
      anomalies,
      pattern,
      confidence: this.calculateClusterConfidence(anomalies, pattern),
      severity: this.calculateClusterSeverity(anomalies),
      timeline: {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps)),
        events: anomalies.map(a => ({
          timestamp: a.timestamp,
          anomalyId: a.id,
          type: a.type,
          description: a.description,
        })),
        velocity: anomalies.length / ((Math.max(...timestamps) - Math.min(...timestamps)) / 3600000 || 1),
        acceleration: 0,
      },
      entities,
      hypothesis: this.generateHypothesis(anomalies, pattern),
      recommendations: this.generateClusterRecommendations(pattern, anomalies),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.clusters.set(cluster.id, cluster);

    logger.info(`Created correlation cluster: ${cluster.name} (${cluster.id})`);

    return cluster;
  }

  private updateCluster(cluster: CorrelationCluster, anomaly: Anomaly): void {
    cluster.anomalies.push(anomaly);
    cluster.timeline.events.push({
      timestamp: anomaly.timestamp,
      anomalyId: anomaly.id,
      type: anomaly.type,
      description: anomaly.description,
    });
    cluster.timeline.end = anomaly.timestamp;
    cluster.updatedAt = new Date();

    // Recalculate confidence and severity
    cluster.confidence = this.calculateClusterConfidence(cluster.anomalies, cluster.pattern);
    cluster.severity = this.calculateClusterSeverity(cluster.anomalies);

    anomaly.status = 'CORRELATED';
    anomaly.correlations.push(cluster.id);
  }

  private calculateClusterConfidence(anomalies: Anomaly[], pattern: ThreatPattern): number {
    const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
    const stagesCovered = this.countStagesCovered(anomalies, pattern);
    const stageCoverage = stagesCovered / pattern.stages.length;

    return avgConfidence * 0.6 + stageCoverage * 0.4;
  }

  private countStagesCovered(anomalies: Anomaly[], pattern: ThreatPattern): number {
    const types = new Set(anomalies.map(a => a.type));
    return pattern.stages.filter(s => s.requiredAnomalies.some(t => types.has(t))).length;
  }

  private calculateClusterSeverity(anomalies: Anomaly[]): SeverityLevel {
    const severityOrder: SeverityLevel[] = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const maxSeverity = anomalies.reduce((max, a) => {
      const current = severityOrder.indexOf(a.severity);
      const maxIdx = severityOrder.indexOf(max);
      return current > maxIdx ? a.severity : max;
    }, 'INFO' as SeverityLevel);

    // Escalate if multiple high-severity anomalies
    const highSeverityCount = anomalies.filter(a =>
      a.severity === 'HIGH' || a.severity === 'CRITICAL'
    ).length;

    if (highSeverityCount >= 3 && maxSeverity === 'HIGH') {
      return 'CRITICAL';
    }

    return maxSeverity;
  }

  private generateHypothesis(anomalies: Anomaly[], pattern: ThreatPattern): ThreatHypothesis {
    return {
      primary: `Potential ${pattern.type.toLowerCase().replace(/_/g, ' ')} activity detected`,
      confidence: 0.7,
      alternatives: [
        {
          hypothesis: 'Legitimate business activity',
          probability: 0.2,
          requiredEvidence: ['Business justification', 'Management approval'],
        },
        {
          hypothesis: 'Technical misconfiguration',
          probability: 0.1,
          requiredEvidence: ['System logs', 'Configuration audit'],
        },
      ],
      evidenceFor: anomalies.map(a => a.description),
      evidenceAgainst: [],
      gaps: ['User interview', 'Full timeline reconstruction', 'Data classification review'],
    };
  }

  private generateClusterRecommendations(pattern: ThreatPattern, anomalies: Anomaly[]): string[] {
    const recommendations: string[] = [];

    switch (pattern.type) {
      case 'INSIDER_THREAT':
        recommendations.push('Initiate insider threat investigation protocol');
        recommendations.push('Review subject access logs for past 90 days');
        recommendations.push('Coordinate with HR for personnel review');
        recommendations.push('Consider enhanced monitoring');
        break;
      case 'ESPIONAGE':
        recommendations.push('Engage counterintelligence team');
        recommendations.push('Review foreign contact disclosures');
        recommendations.push('Assess access to classified information');
        recommendations.push('Coordinate with security officer');
        break;
      case 'APT_CAMPAIGN':
        recommendations.push('Isolate affected systems');
        recommendations.push('Engage incident response team');
        recommendations.push('Preserve forensic evidence');
        recommendations.push('Assess lateral movement scope');
        break;
      default:
        recommendations.push('Review anomaly details');
        recommendations.push('Assess business context');
        recommendations.push('Determine if escalation needed');
    }

    return recommendations;
  }

  private async detectCrossEntityPatterns(anomalies: Anomaly[]): Promise<CorrelationCluster[]> {
    // Detect coordinated activity across multiple entities
    return [];
  }

  private async generateAlert(cluster: CorrelationCluster): Promise<void> {
    const alert: CorrelationAlert = {
      id: randomUUID(),
      type: 'PATTERN_MATCH',
      severity: cluster.severity,
      cluster,
      title: `${cluster.severity} - ${cluster.pattern.name}`,
      summary: `Detected ${cluster.pattern.type} pattern involving ${cluster.entities.length} entities with ${cluster.anomalies.length} correlated anomalies`,
      actionRequired: cluster.severity === 'HIGH' || cluster.severity === 'CRITICAL',
      status: 'NEW',
      createdAt: new Date(),
    };

    this.alerts.set(alert.id, alert);

    logger.warn(`Generated alert: ${alert.title} (${alert.id})`);
  }

  private async updateRiskScore(entityId: string, anomaly: Anomaly): Promise<void> {
    await this.calculateRiskScore(entityId);
  }

  private calculateBehavioralRisk(anomalies: Anomaly[]): RiskComponent {
    const relevant = anomalies.filter(a =>
      a.type === 'BEHAVIORAL_DEVIATION' || a.type === 'TEMPORAL_ANOMALY'
    );
    return {
      category: 'BEHAVIORAL',
      score: Math.min(100, relevant.length * 15),
      weight: 0.2,
      indicators: relevant.map(a => a.description),
    };
  }

  private calculateAccessRisk(anomalies: Anomaly[]): RiskComponent {
    const relevant = anomalies.filter(a =>
      a.type === 'ACCESS_ANOMALY' || a.type === 'PRIVILEGE_ESCALATION'
    );
    return {
      category: 'ACCESS',
      score: Math.min(100, relevant.length * 20),
      weight: 0.25,
      indicators: relevant.map(a => a.description),
    };
  }

  private calculateTechnicalRisk(anomalies: Anomaly[]): RiskComponent {
    const relevant = anomalies.filter(a =>
      a.type === 'NETWORK_ANOMALY' || a.type === 'DATA_EXFILTRATION' || a.type === 'AUTHENTICATION_ANOMALY'
    );
    return {
      category: 'TECHNICAL',
      score: Math.min(100, relevant.length * 25),
      weight: 0.25,
      indicators: relevant.map(a => a.description),
    };
  }

  private calculatePersonalRisk(anomalies: Anomaly[]): RiskComponent {
    const relevant = anomalies.filter(a =>
      a.type === 'INSIDER_THREAT_INDICATOR'
    );
    return {
      category: 'PERSONAL',
      score: Math.min(100, relevant.length * 30),
      weight: 0.1,
      indicators: relevant.map(a => a.description),
    };
  }

  private calculateFinancialRisk(anomalies: Anomaly[]): RiskComponent {
    const relevant = anomalies.filter(a => a.type === 'FINANCIAL_ANOMALY');
    return {
      category: 'FINANCIAL',
      score: Math.min(100, relevant.length * 20),
      weight: 0.1,
      indicators: relevant.map(a => a.description),
    };
  }

  private calculateForeignNexusRisk(anomalies: Anomaly[]): RiskComponent {
    const relevant = anomalies.filter(a =>
      a.type === 'FOREIGN_CONTACT' || a.type === 'TRAVEL_ANOMALY'
    );
    return {
      category: 'FOREIGN_NEXUS',
      score: Math.min(100, relevant.length * 25),
      weight: 0.1,
      indicators: relevant.map(a => a.description),
    };
  }

  private calculatePercentileRank(score: number): number {
    const allScores = Array.from(this.riskScores.values()).map(r => r.overallScore);
    if (allScores.length === 0) return 50;
    const belowCount = allScores.filter(s => s < score).length;
    return (belowCount / allScores.length) * 100;
  }

  private analyzeTrends(): TrendAnalysis {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const recentAnomalies = Array.from(this.anomalies.values())
      .filter(a => a.timestamp.getTime() > weekAgo);

    const typeDistribution: Record<string, number> = {};
    for (const anomaly of recentAnomalies) {
      typeDistribution[anomaly.type] = (typeDistribution[anomaly.type] || 0) + 1;
    }

    return {
      anomalyVolume: {
        current: recentAnomalies.length,
        previous: 0, // Would compare to previous period
        change: 0,
      },
      typeDistribution,
      severityDistribution: this.calculateSeverityDistribution(recentAnomalies),
      topEntities: this.getTopEntitiesByRisk(5),
    };
  }

  private calculateSeverityDistribution(anomalies: Anomaly[]): Record<SeverityLevel, number> {
    const distribution: Record<SeverityLevel, number> = {
      INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
    };
    for (const anomaly of anomalies) {
      distribution[anomaly.severity]++;
    }
    return distribution;
  }

  private getTopEntitiesByRisk(count: number): string[] {
    return Array.from(this.riskScores.entries())
      .sort((a, b) => b[1].overallScore - a[1].overallScore)
      .slice(0, count)
      .map(([entityId]) => entityId);
  }

  private detectEmergingPatterns(): EmergingPattern[] {
    return [];
  }

  private generateStrategicRecommendations(
    clusters: CorrelationCluster[],
    trends: TrendAnalysis
  ): string[] {
    const recommendations: string[] = [];

    if (clusters.filter(c => c.severity === 'CRITICAL').length > 2) {
      recommendations.push('Consider elevated threat posture');
    }

    if (trends.anomalyVolume.change > 50) {
      recommendations.push('Review detection coverage for potential gaps');
    }

    return recommendations;
  }
}

// Input Types
export interface AnomalyInput {
  type: AnomalyType;
  description: string;
  source: DataSource;
  entityId?: string;
  timestamp?: Date;
  confidence?: number;
  indicators?: AnomalyIndicator[];
  rawData?: Record<string, unknown>;
}

export interface AnomalyQuery {
  types?: AnomalyType[];
  severities?: SeverityLevel[];
  entityIds?: string[];
  sources?: SourceType[];
  startDate?: Date;
  endDate?: Date;
  minConfidence?: number;
  statuses?: AnomalyStatus[];
  offset?: number;
  limit?: number;
}

export interface ThreatIntelligenceReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    totalAnomalies: number;
    criticalClusters: number;
    highRiskEntities: number;
    activeInvestigations: number;
  };
  topThreats: {
    clusterId: string;
    name: string;
    pattern: ThreatPatternType;
    severity: SeverityLevel;
    confidence: number;
    entities: string[];
    recommendation: string;
  }[];
  trendAnalysis: TrendAnalysis;
  emergingPatterns: EmergingPattern[];
  recommendations: string[];
}

export interface TrendAnalysis {
  anomalyVolume: { current: number; previous: number; change: number };
  typeDistribution: Record<string, number>;
  severityDistribution: Record<SeverityLevel, number>;
  topEntities: string[];
}

export interface EmergingPattern {
  name: string;
  description: string;
  indicators: string[];
  confidence: number;
}

// Export singleton
export const anomalyCorrelationService = new AnomalyCorrelationService();

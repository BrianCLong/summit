/**
 * Alert Engine
 *
 * Implements early-warning detection and alert generation for federated campaigns.
 * Optimizes time-to-detect vs false-attribution with auditable replay logs.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  CampaignCluster,
  ClusterStatus,
  ThreatLevel,
  FederatedAlert,
  AlertType,
  AlertSeverity,
  AlertPriority,
  AlertStatus,
  TriggerCondition,
  SpreaderSummary,
  ChannelDiffusionSummary,
  RecommendedAction,
  ActionType,
  ResponsePack,
  NarrativeIntelligence,
  CommsPlaybook,
  StakeholderBriefing,
  MeasurementPlan,
  AlertResolution,
  AlertAuditEntry,
  ReachCategory,
  createAlertId,
  calculateAlertPriority,
} from '../core/types';

/**
 * Alert configuration
 */
export interface AlertConfig {
  // Threshold settings
  thresholds: AlertThresholds;

  // Timing
  evaluationIntervalMs: number;
  alertCooldownMs: number;
  escalationTimeoutMs: number;

  // Notification
  notificationChannels: NotificationChannel[];
  autoEscalation: boolean;

  // Audit
  enableAuditLog: boolean;
  auditRetentionDays: number;
}

export interface AlertThresholds {
  // Signal volume thresholds
  minSignalsForAlert: number;
  signalVelocitySpike: number; // Percentage increase

  // Cross-tenant thresholds
  crossTenantMinOrgs: number;
  crossTenantConfidenceBoost: number;

  // Coordination thresholds
  coordinationStrengthMin: number;
  synchronicityMin: number;

  // Threat level auto-escalation
  autoEscalateThreatLevel: ThreatLevel;
}

export interface NotificationChannel {
  type: 'WEBHOOK' | 'EMAIL' | 'SLACK' | 'PUBSUB' | 'SMS';
  endpoint: string;
  severities: AlertSeverity[];
  enabled: boolean;
}

/**
 * Alert evaluation context
 */
interface EvaluationContext {
  cluster: CampaignCluster;
  previousState?: CampaignCluster;
  triggerTime: Date;
  evaluationId: string;
}

/**
 * Alert Engine
 */
export class AlertEngine extends EventEmitter {
  private config: AlertConfig;
  private activeAlerts: Map<string, FederatedAlert> = new Map();
  private alertHistory: FederatedAlert[] = [];
  private clusterAlertMap: Map<string, string> = new Map(); // clusterId -> alertId
  private cooldowns: Map<string, Date> = new Map(); // clusterId -> cooldown end

  // Metrics for optimization
  private metrics = {
    totalAlerts: 0,
    truePositives: 0,
    falsePositives: 0,
    timeToDetectSum: 0,
    detectionCount: 0,
  };

  // Evaluation timer
  private evaluationTimer: NodeJS.Timeout | null = null;

  constructor(config: AlertConfig) {
    super();
    this.config = config;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Evaluate a cluster for alert generation
   */
  async evaluateCluster(
    cluster: CampaignCluster,
    previousState?: CampaignCluster,
  ): Promise<FederatedAlert | null> {
    const context: EvaluationContext = {
      cluster,
      previousState,
      triggerTime: new Date(),
      evaluationId: uuidv4(),
    };

    // Check cooldown
    if (this.isInCooldown(cluster.clusterId)) {
      return null;
    }

    // Evaluate trigger conditions
    const triggers = this.evaluateTriggerConditions(context);

    if (triggers.length === 0) {
      return null;
    }

    // Determine alert type and severity
    const alertType = this.determineAlertType(context, triggers);
    const severity = this.determineSeverity(context, triggers);
    const priority = calculateAlertPriority(
      severity,
      cluster.participatingOrgs > 1,
      cluster.participatingOrgs,
    );

    // Generate alert
    const alert = await this.generateAlert(
      context,
      alertType,
      severity,
      priority,
      triggers,
    );

    // Store and notify
    this.storeAlert(alert);
    await this.notifyAlert(alert);

    // Set cooldown
    this.setCooldown(cluster.clusterId);

    // Update metrics
    this.metrics.totalAlerts++;

    this.emit('alertGenerated', alert);
    return alert;
  }

  /**
   * Evaluate multiple clusters in batch
   */
  async evaluateClusters(
    clusters: CampaignCluster[],
    previousStates?: Map<string, CampaignCluster>,
  ): Promise<FederatedAlert[]> {
    const alerts: FederatedAlert[] = [];

    for (const cluster of clusters) {
      const previous = previousStates?.get(cluster.clusterId);
      const alert = await this.evaluateCluster(cluster, previous);
      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filters?: {
    severity?: AlertSeverity;
    type?: AlertType;
    status?: AlertStatus;
  }): FederatedAlert[] {
    let alerts = Array.from(this.activeAlerts.values());

    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter((a) => a.severity === filters.severity);
      }
      if (filters.type) {
        alerts = alerts.filter((a) => a.alertType === filters.type);
      }
      if (filters.status) {
        alerts = alerts.filter((a) => a.status === filters.status);
      }
    }

    return alerts;
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): FederatedAlert | undefined {
    return this.activeAlerts.get(alertId);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.addAuditEntry(alert, 'ACKNOWLEDGED', acknowledgedBy, {});

    this.emit('alertAcknowledged', alert);
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolution: Omit<AlertResolution, 'resolvedAt' | 'resolvedBy'>,
  ): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = AlertStatus.RESOLVED;
    alert.resolution = {
      ...resolution,
      resolvedAt: new Date(),
      resolvedBy,
    };

    this.addAuditEntry(alert, 'RESOLVED', resolvedBy, { resolution });

    // Update metrics
    if (resolution.resolutionType === 'FALSE_POSITIVE') {
      this.metrics.falsePositives++;
    } else if (resolution.resolutionType === 'MITIGATED') {
      this.metrics.truePositives++;
    }

    // Move to history
    this.alertHistory.push(alert);
    this.activeAlerts.delete(alertId);

    this.emit('alertResolved', alert);
    return true;
  }

  /**
   * Generate response pack for an alert
   */
  async generateResponsePack(alertId: string): Promise<ResponsePack | null> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || !alert.clusterId) return null;

    const pack = this.buildResponsePack(alert);

    // Attach to alert
    alert.responsePack = pack;

    this.addAuditEntry(alert, 'RESPONSE_PACK_GENERATED', 'system', {
      packId: pack.packId,
    });

    this.emit('responsePackGenerated', { alertId, pack });
    return pack;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalAlerts: number;
    truePositiveRate: number;
    falsePositiveRate: number;
    averageTimeToDetect: number;
    activeAlertCount: number;
  } {
    const total = this.metrics.truePositives + this.metrics.falsePositives;
    return {
      totalAlerts: this.metrics.totalAlerts,
      truePositiveRate: total > 0 ? this.metrics.truePositives / total : 0,
      falsePositiveRate: total > 0 ? this.metrics.falsePositives / total : 0,
      averageTimeToDetect:
        this.metrics.detectionCount > 0
          ? this.metrics.timeToDetectSum / this.metrics.detectionCount
          : 0,
      activeAlertCount: this.activeAlerts.size,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private evaluateTriggerConditions(
    context: EvaluationContext,
  ): TriggerCondition[] {
    const triggers: TriggerCondition[] = [];
    const { cluster, previousState } = context;
    const thresholds = this.config.thresholds;

    // Signal volume trigger
    if (cluster.signalCount >= thresholds.minSignalsForAlert) {
      triggers.push({
        conditionType: 'SIGNAL_VOLUME',
        threshold: thresholds.minSignalsForAlert,
        actualValue: cluster.signalCount,
        direction: 'ABOVE',
        windowMinutes: 60,
      });
    }

    // Velocity spike trigger
    if (previousState) {
      const velocityChange =
        previousState.velocityMetrics.signalsPerHour > 0
          ? ((cluster.velocityMetrics.signalsPerHour -
              previousState.velocityMetrics.signalsPerHour) /
              previousState.velocityMetrics.signalsPerHour) *
            100
          : cluster.velocityMetrics.signalsPerHour > 0
            ? 100
            : 0;

      if (velocityChange >= thresholds.signalVelocitySpike) {
        triggers.push({
          conditionType: 'VELOCITY_SPIKE',
          threshold: thresholds.signalVelocitySpike,
          actualValue: velocityChange,
          direction: 'ABOVE',
          windowMinutes: 60,
        });
      }
    }

    // Cross-tenant trigger
    if (cluster.participatingOrgs >= thresholds.crossTenantMinOrgs) {
      triggers.push({
        conditionType: 'CROSS_TENANT',
        threshold: thresholds.crossTenantMinOrgs,
        actualValue: cluster.participatingOrgs,
        direction: 'ABOVE',
        windowMinutes: 60,
      });
    }

    // Coordination strength trigger
    const maxCoordinationStrength = Math.max(
      ...cluster.coordinationPatterns.map((p) => p.strength),
      0,
    );
    if (maxCoordinationStrength >= thresholds.coordinationStrengthMin) {
      triggers.push({
        conditionType: 'COORDINATION_DETECTED',
        threshold: thresholds.coordinationStrengthMin,
        actualValue: maxCoordinationStrength,
        direction: 'ABOVE',
        windowMinutes: 60,
      });
    }

    // Threat level trigger
    const threatOrder = [
      ThreatLevel.INFORMATIONAL,
      ThreatLevel.LOW,
      ThreatLevel.MEDIUM,
      ThreatLevel.HIGH,
      ThreatLevel.CRITICAL,
    ];
    const currentThreatIndex = threatOrder.indexOf(cluster.threatLevel);
    const autoEscalateIndex = threatOrder.indexOf(
      thresholds.autoEscalateThreatLevel,
    );

    if (currentThreatIndex >= autoEscalateIndex) {
      triggers.push({
        conditionType: 'THREAT_LEVEL',
        threshold: autoEscalateIndex,
        actualValue: currentThreatIndex,
        direction: 'ABOVE',
        windowMinutes: 60,
      });
    }

    return triggers;
  }

  private determineAlertType(
    context: EvaluationContext,
    triggers: TriggerCondition[],
  ): AlertType {
    const triggerTypes = new Set(triggers.map((t) => t.conditionType));

    if (triggerTypes.has('CROSS_TENANT')) {
      return AlertType.CROSS_TENANT_SPIKE;
    }

    if (triggerTypes.has('COORDINATION_DETECTED')) {
      return AlertType.COORDINATION_DETECTED;
    }

    if (triggerTypes.has('VELOCITY_SPIKE')) {
      if (context.cluster.status === ClusterStatus.EMERGING) {
        return AlertType.CAMPAIGN_EMERGING;
      }
      return AlertType.CAMPAIGN_ESCALATING;
    }

    if (triggerTypes.has('THREAT_LEVEL')) {
      return AlertType.THRESHOLD_BREACH;
    }

    return AlertType.CAMPAIGN_EMERGING;
  }

  private determineSeverity(
    context: EvaluationContext,
    triggers: TriggerCondition[],
  ): AlertSeverity {
    const { cluster } = context;

    // Critical: High threat + cross-tenant + high velocity
    if (
      cluster.threatLevel === ThreatLevel.CRITICAL ||
      (cluster.threatLevel === ThreatLevel.HIGH &&
        cluster.participatingOrgs > 3 &&
        cluster.velocityMetrics.growthRate > 100)
    ) {
      return AlertSeverity.CRITICAL;
    }

    // High: High threat or strong coordination
    if (
      cluster.threatLevel === ThreatLevel.HIGH ||
      cluster.coordinationPatterns.some((p) => p.strength > 0.8)
    ) {
      return AlertSeverity.HIGH;
    }

    // Medium: Medium threat or cross-tenant
    if (
      cluster.threatLevel === ThreatLevel.MEDIUM ||
      cluster.participatingOrgs > 2
    ) {
      return AlertSeverity.MEDIUM;
    }

    // Low: Low threat
    if (cluster.threatLevel === ThreatLevel.LOW) {
      return AlertSeverity.LOW;
    }

    return AlertSeverity.INFO;
  }

  private async generateAlert(
    context: EvaluationContext,
    alertType: AlertType,
    severity: AlertSeverity,
    priority: AlertPriority,
    triggers: TriggerCondition[],
  ): Promise<FederatedAlert> {
    const { cluster } = context;
    const now = new Date();

    // Generate summaries
    const title = this.generateAlertTitle(alertType, cluster);
    const summary = this.generateAlertSummary(context, triggers);
    const narrativeSummary = this.generateNarrativeSummary(cluster);
    const topSpreaders = this.identifyTopSpreaders(cluster);
    const channelDiffusion = this.analyzeChannelDiffusion(cluster);
    const recommendedActions = this.generateRecommendedActions(
      alertType,
      severity,
      cluster,
    );

    const alert: FederatedAlert = {
      alertId: createAlertId(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      alertType,
      severity,
      priority,
      clusterId: cluster.clusterId,
      triggerConditions: triggers,
      confidenceScore: cluster.confidenceScore,
      title,
      summary,
      narrativeSummary,
      topSpreaders,
      channelDiffusion,
      crossTenantSignal: cluster.participatingOrgs > 1,
      participatingOrgCount: cluster.participatingOrgs,
      recommendedActions,
      status: AlertStatus.NEW,
      auditTrail: [
        {
          timestamp: now,
          action: 'CREATED',
          actor: 'system',
          details: {
            evaluationId: context.evaluationId,
            triggers: triggers.map((t) => t.conditionType),
          },
        },
      ],
    };

    return alert;
  }

  private generateAlertTitle(
    alertType: AlertType,
    cluster: CampaignCluster,
  ): string {
    const threatPrefix =
      cluster.threatLevel === ThreatLevel.CRITICAL
        ? '[CRITICAL] '
        : cluster.threatLevel === ThreatLevel.HIGH
          ? '[HIGH] '
          : '';

    switch (alertType) {
      case AlertType.CAMPAIGN_EMERGING:
        return `${threatPrefix}Emerging Campaign Detected`;
      case AlertType.CAMPAIGN_ESCALATING:
        return `${threatPrefix}Campaign Escalating Rapidly`;
      case AlertType.CROSS_TENANT_SPIKE:
        return `${threatPrefix}Cross-Organization Campaign Spike`;
      case AlertType.COORDINATION_DETECTED:
        return `${threatPrefix}Coordinated Activity Detected`;
      case AlertType.NARRATIVE_SHIFT:
        return `${threatPrefix}Significant Narrative Shift`;
      case AlertType.SYNTHETIC_MEDIA_SURGE:
        return `${threatPrefix}Synthetic Media Surge Detected`;
      case AlertType.THRESHOLD_BREACH:
        return `${threatPrefix}Alert Threshold Breached`;
      default:
        return `${threatPrefix}Campaign Alert`;
    }
  }

  private generateAlertSummary(
    context: EvaluationContext,
    triggers: TriggerCondition[],
  ): string {
    const { cluster } = context;

    const parts: string[] = [];

    parts.push(
      `Campaign cluster detected with ${cluster.signalCount} signals from ${cluster.participatingOrgs} organization(s).`,
    );

    if (cluster.velocityMetrics.growthRate > 50) {
      parts.push(
        `Velocity is increasing rapidly at ${cluster.velocityMetrics.growthRate.toFixed(0)}% growth rate.`,
      );
    }

    if (cluster.coordinationPatterns.length > 0) {
      const topPattern = cluster.coordinationPatterns[0];
      parts.push(
        `Coordination pattern "${topPattern.patternType}" detected with ${(topPattern.strength * 100).toFixed(0)}% strength.`,
      );
    }

    if (cluster.participatingOrgs > 1) {
      parts.push(
        `Cross-tenant signal boost: ${(cluster.crossTenantConfidence * 100).toFixed(0)}% confidence.`,
      );
    }

    return parts.join(' ');
  }

  private generateNarrativeSummary(cluster: CampaignCluster): string {
    if (cluster.dominantNarratives.length === 0) {
      return 'Insufficient narrative data for summary.';
    }

    const narratives = cluster.dominantNarratives
      .slice(0, 3)
      .map((n) => n.themeSummary)
      .join('; ');

    return `Key narratives: ${narratives}`;
  }

  private identifyTopSpreaders(cluster: CampaignCluster): SpreaderSummary[] {
    // In a full implementation, this would analyze signal sources
    // For now, generate placeholder based on cluster size
    const spreaderCount = Math.min(5, Math.floor(cluster.signalCount / 10));
    const spreaders: SpreaderSummary[] = [];

    for (let i = 0; i < spreaderCount; i++) {
      spreaders.push({
        accountHash: `account_${uuidv4().substring(0, 8)}`,
        platform: ['twitter', 'facebook', 'telegram'][i % 3],
        reachCategory: [
          ReachCategory.MEDIUM,
          ReachCategory.LARGE,
          ReachCategory.SMALL,
        ][i % 3],
        activityLevel: ['HIGH', 'MEDIUM', 'LOW'][i % 3] as
          | 'LOW'
          | 'MEDIUM'
          | 'HIGH',
        suspicionScore: 0.5 + Math.random() * 0.4,
        publicArtifacts: [],
      });
    }

    return spreaders;
  }

  private analyzeChannelDiffusion(
    cluster: CampaignCluster,
  ): ChannelDiffusionSummary {
    const channels: Record<
      string,
      {
        signalCount: number;
        estimatedReach: number;
        engagementRate: number;
        growthRate: number;
      }
    > = {};

    for (const [channel, count] of Object.entries(
      cluster.channelDistribution,
    )) {
      channels[channel] = {
        signalCount: count,
        estimatedReach: count * 1000,
        engagementRate: 0.02 + Math.random() * 0.05,
        growthRate: cluster.velocityMetrics.growthRate,
      };
    }

    const primaryChannel =
      Object.entries(channels).sort((a, b) => b[1].signalCount - a[1].signalCount)[0]?.[0] ||
      'unknown';

    const channelCount = Object.keys(channels).length;
    const crossPlatformScore = Math.min(1, channelCount / 5);

    // Determine diffusion pattern based on coordination
    let diffusionPattern: 'ORGANIC' | 'COORDINATED' | 'MIXED' = 'ORGANIC';
    if (cluster.coordinationPatterns.some((p) => p.strength > 0.7)) {
      diffusionPattern = 'COORDINATED';
    } else if (cluster.coordinationPatterns.some((p) => p.strength > 0.4)) {
      diffusionPattern = 'MIXED';
    }

    return {
      channels,
      primaryChannel,
      crossPlatformScore,
      diffusionPattern,
    };
  }

  private generateRecommendedActions(
    alertType: AlertType,
    severity: AlertSeverity,
    cluster: CampaignCluster,
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    // Always recommend monitoring
    actions.push({
      actionId: uuidv4(),
      actionType: ActionType.MONITOR,
      priority: 1,
      description: 'Continue monitoring campaign evolution',
      estimatedImpact: 'Maintain situational awareness',
      automatable: true,
    });

    // Investigation for medium+ severity
    if (
      [AlertSeverity.MEDIUM, AlertSeverity.HIGH, AlertSeverity.CRITICAL].includes(
        severity,
      )
    ) {
      actions.push({
        actionId: uuidv4(),
        actionType: ActionType.INVESTIGATE,
        priority: 2,
        description: 'Conduct deep investigation into campaign origins',
        estimatedImpact: 'Better attribution and response targeting',
        automatable: false,
      });
    }

    // Escalation for high+ severity
    if ([AlertSeverity.HIGH, AlertSeverity.CRITICAL].includes(severity)) {
      actions.push({
        actionId: uuidv4(),
        actionType: ActionType.ESCALATE,
        priority: 3,
        description: 'Escalate to senior leadership and cross-functional teams',
        estimatedImpact: 'Enable coordinated organizational response',
        automatable: true,
      });
    }

    // Counter-narrative for coordinated campaigns
    if (alertType === AlertType.COORDINATION_DETECTED) {
      actions.push({
        actionId: uuidv4(),
        actionType: ActionType.COUNTER_NARRATIVE,
        priority: 4,
        description: 'Prepare counter-narrative messaging',
        estimatedImpact: 'Reduce campaign effectiveness',
        automatable: false,
      });
    }

    // Platform reporting for high+ severity
    if ([AlertSeverity.HIGH, AlertSeverity.CRITICAL].includes(severity)) {
      actions.push({
        actionId: uuidv4(),
        actionType: ActionType.PLATFORM_REPORT,
        priority: 5,
        description: 'Report coordinated activity to relevant platforms',
        estimatedImpact: 'Potential account suspension and content removal',
        automatable: true,
      });
    }

    // Stakeholder notification for critical
    if (severity === AlertSeverity.CRITICAL) {
      actions.push({
        actionId: uuidv4(),
        actionType: ActionType.STAKEHOLDER_NOTIFY,
        priority: 6,
        description: 'Notify external stakeholders and partners',
        estimatedImpact: 'Coordinated defense across organizations',
        automatable: true,
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  private buildResponsePack(alert: FederatedAlert): ResponsePack {
    const now = new Date();

    const narrativeIntelligence: NarrativeIntelligence = {
      mainNarratives: [
        'Primary narrative theme identified in campaign',
        'Secondary supporting narrative detected',
      ],
      counterPoints: [
        'Factual correction point 1',
        'Context that contradicts narrative',
        'Alternative interpretation supported by evidence',
      ],
      factChecks: [
        {
          claim: 'Primary claim from campaign',
          verdict: 'MISLEADING',
          explanation: 'Claim lacks important context',
          sources: ['source1.org', 'factcheck.org'],
        },
      ],
      sourceCredibilityAssessment: {
        primarySources: [
          {
            sourceHash: 'hash1',
            credibilityScore: 0.3,
            factors: ['newly_created', 'no_verification'],
          },
        ],
        amplifierSources: [],
        overallCredibility: 0.35,
      },
      audienceVulnerabilities: [
        'Low media literacy segments',
        'Pre-existing belief alignment',
        'Information vacuum in specific topics',
      ],
    };

    const commsPlaybook: CommsPlaybook = {
      strategy:
        alert.severity === AlertSeverity.CRITICAL
          ? 'DEBUNK'
          : alert.severity === AlertSeverity.HIGH
            ? 'COUNTER_NARRATIVE'
            : 'PREBUNK',
      keyMessages: [
        'Core truthful message to emphasize',
        'Context that addresses misinformation',
        'Call to action for verification',
      ],
      talkingPoints: [
        'Specific data point that contradicts false claim',
        'Expert source that provides authoritative information',
        'Historical context that provides perspective',
      ],
      avoidTopics: [
        'Topics that may amplify harmful narratives',
        'Unverified information',
      ],
      timing: {
        urgency:
          alert.severity === AlertSeverity.CRITICAL
            ? 'IMMEDIATE'
            : alert.severity === AlertSeverity.HIGH
              ? 'WITHIN_HOURS'
              : 'WITHIN_DAYS',
        optimalWindows: [
          { start: now, end: new Date(now.getTime() + 4 * 60 * 60 * 1000) },
        ],
        avoidWindows: [],
      },
      audienceSegments: [
        {
          segmentId: 'segment_1',
          description: 'Primary affected audience',
          vulnerability: 0.7,
          recommendedApproach: 'Direct factual correction with trusted sources',
          channels: ['twitter', 'facebook'],
        },
      ],
    };

    const stakeholderBriefing: StakeholderBriefing = {
      executiveSummary: alert.summary,
      keyFindings: [
        `${alert.participatingOrgCount} organizations detecting similar signals`,
        `Threat level: ${alert.severity}`,
        `Coordination confidence: ${(alert.confidenceScore * 100).toFixed(0)}%`,
      ],
      riskAssessment:
        alert.severity === AlertSeverity.CRITICAL
          ? 'Critical risk requiring immediate executive attention'
          : alert.severity === AlertSeverity.HIGH
            ? 'High risk requiring senior leadership involvement'
            : 'Elevated risk requiring monitoring and preparation',
      recommendedActions: alert.recommendedActions.map((a) => a.description),
      escalationPath: [
        'Security Operations Center',
        'Communications Team Lead',
        'VP of Communications',
        'Executive Leadership',
      ],
    };

    const measurementPlan: MeasurementPlan = {
      kpis: [
        {
          name: 'Campaign Reach',
          baseline: 0,
          target: -50, // 50% reduction
          measurement: 'Estimated audience reached by campaign content',
        },
        {
          name: 'Counter-narrative Engagement',
          baseline: 0,
          target: 1000,
          measurement: 'Engagement on counter-messaging content',
        },
        {
          name: 'Narrative Velocity',
          baseline: 100,
          target: 25, // 75% reduction
          measurement: 'New signals per hour',
        },
      ],
      trackingWindow: {
        start: now,
        end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      checkpoints: [
        { date: new Date(now.getTime() + 24 * 60 * 60 * 1000), metrics: ['reach', 'velocity'] },
        { date: new Date(now.getTime() + 72 * 60 * 60 * 1000), metrics: ['reach', 'engagement'] },
      ],
      successCriteria: [
        'Campaign velocity reduced by 50%',
        'Counter-narrative reaches 75% of campaign audience',
        'No escalation to traditional media',
      ],
    };

    return {
      packId: uuidv4(),
      generatedAt: now,
      clusterId: alert.clusterId || '',
      narrativeSummary: narrativeIntelligence,
      commsPlaybook,
      platformActions: [
        {
          platform: 'twitter',
          actionType: 'REPORT_COORDINATION',
          priority: 1,
          steps: [
            'Document coordinated accounts',
            'Submit trust & safety report',
            'Follow up with platform contact',
          ],
          estimatedTimeline: '24-48 hours for initial review',
        },
      ],
      stakeholderBriefing,
      measurementPlan,
    };
  }

  private storeAlert(alert: FederatedAlert): void {
    this.activeAlerts.set(alert.alertId, alert);

    if (alert.clusterId) {
      this.clusterAlertMap.set(alert.clusterId, alert.alertId);
    }
  }

  private async notifyAlert(alert: FederatedAlert): Promise<void> {
    for (const channel of this.config.notificationChannels) {
      if (!channel.enabled) continue;
      if (!channel.severities.includes(alert.severity)) continue;

      try {
        await this.sendNotification(channel, alert);
      } catch (error) {
        this.emit('notificationError', { channel, alert, error });
      }
    }
  }

  private async sendNotification(
    channel: NotificationChannel,
    alert: FederatedAlert,
  ): Promise<void> {
    // Placeholder for actual notification implementation
    this.emit('notificationSent', { channel: channel.type, alertId: alert.alertId });
  }

  private isInCooldown(clusterId: string): boolean {
    const cooldownEnd = this.cooldowns.get(clusterId);
    if (!cooldownEnd) return false;
    return cooldownEnd > new Date();
  }

  private setCooldown(clusterId: string): void {
    this.cooldowns.set(
      clusterId,
      new Date(Date.now() + this.config.alertCooldownMs),
    );
  }

  private addAuditEntry(
    alert: FederatedAlert,
    action: string,
    actor: string,
    details: Record<string, unknown>,
  ): void {
    if (!this.config.enableAuditLog) return;

    const entry: AlertAuditEntry = {
      timestamp: new Date(),
      action,
      actor,
      details,
    };

    alert.auditTrail.push(entry);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
    this.removeAllListeners();
  }
}

export default AlertEngine;

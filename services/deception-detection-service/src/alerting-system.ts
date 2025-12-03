/**
 * Real-Time Alerting System
 * Monitor detections and trigger automated responses
 */

import { EventEmitter } from 'events';

export interface AlertConfig {
  channels: AlertChannel[];
  rules: AlertRule[];
  escalationPolicy: EscalationPolicy;
  suppressionRules: SuppressionRule[];
  batchingConfig: BatchingConfig;
}

export interface AlertChannel {
  id: string;
  name: string;
  type: ChannelType;
  config: ChannelConfig;
  enabled: boolean;
  severity: AlertSeverity[];
}

export enum ChannelType {
  WEBHOOK = 'webhook',
  EMAIL = 'email',
  SLACK = 'slack',
  PAGERDUTY = 'pagerduty',
  TEAMS = 'teams',
  SMS = 'sms',
  KAFKA = 'kafka',
  SYSLOG = 'syslog',
}

export interface ChannelConfig {
  url?: string;
  apiKey?: string;
  recipients?: string[];
  template?: string;
  retryConfig?: RetryConfig;
}

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: string[];
  actions: AlertAction[];
  cooldownMs: number;
  enabled: boolean;
}

export interface AlertCondition {
  type: ConditionType;
  metric?: string;
  threshold?: number;
  operator?: ComparisonOperator;
  windowMs?: number;
  aggregation?: AggregationType;
  filters?: ConditionFilter[];
}

export enum ConditionType {
  THRESHOLD = 'threshold',
  ANOMALY = 'anomaly',
  PATTERN = 'pattern',
  RATE_LIMIT = 'rate_limit',
  COMPOSITE = 'composite',
}

export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EQUAL = 'eq',
  NOT_EQUAL = 'neq',
  GREATER_EQUAL = 'gte',
  LESS_EQUAL = 'lte',
}

export enum AggregationType {
  COUNT = 'count',
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  RATE = 'rate',
  P95 = 'p95',
  P99 = 'p99',
}

export interface ConditionFilter {
  field: string;
  operator: ComparisonOperator;
  value: any;
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export interface AlertAction {
  type: ActionType;
  config: ActionConfig;
}

export enum ActionType {
  NOTIFY = 'notify',
  BLOCK_CONTENT = 'block_content',
  SUSPEND_ACCOUNT = 'suspend_account',
  RATE_LIMIT = 'rate_limit',
  QUARANTINE = 'quarantine',
  CREATE_TICKET = 'create_ticket',
  TRIGGER_WORKFLOW = 'trigger_workflow',
  ENRICH = 'enrich',
}

export interface ActionConfig {
  target?: string;
  parameters?: Record<string, any>;
  async?: boolean;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  onCallSchedule?: OnCallSchedule;
}

export interface EscalationLevel {
  level: number;
  delayMs: number;
  channels: string[];
  notifyOnCall: boolean;
}

export interface OnCallSchedule {
  scheduleId: string;
  rotationHours: number;
  participants: OnCallParticipant[];
}

export interface OnCallParticipant {
  userId: string;
  contactInfo: ContactInfo;
  priority: number;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  slack?: string;
}

export interface SuppressionRule {
  id: string;
  condition: AlertCondition;
  duration: number;
  reason: string;
}

export interface BatchingConfig {
  enabled: boolean;
  windowMs: number;
  maxBatchSize: number;
  groupBy: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: AlertSource;
  timestamp: Date;
  status: AlertStatus;
  assignee?: string;
  labels: Record<string, string>;
  annotations: Record<string, any>;
  relatedAlerts: string[];
  timeline: AlertEvent[];
  metrics: AlertMetrics;
}

export interface AlertSource {
  type: 'deepfake' | 'bot' | 'disinformation' | 'manipulation';
  detectionId: string;
  confidence: number;
  evidence: any;
}

export enum AlertStatus {
  FIRING = 'firing',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
}

export interface AlertEvent {
  timestamp: Date;
  type: string;
  actor?: string;
  details?: any;
}

export interface AlertMetrics {
  firstOccurrence: Date;
  lastOccurrence: Date;
  occurrenceCount: number;
  meanTimeBetweenOccurrences: number;
  impactScore: number;
}

export interface AlertSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<AlertStatus, number>;
  bySource: Record<string, number>;
  recentAlerts: Alert[];
  trends: AlertTrend[];
}

export interface AlertTrend {
  timestamp: Date;
  count: number;
  severity: AlertSeverity;
}

export class RealTimeAlertingSystem extends EventEmitter {
  private config: AlertConfig;
  private channels: Map<string, AlertChannelHandler>;
  private activeAlerts: Map<string, Alert>;
  private alertHistory: Alert[];
  private cooldowns: Map<string, number>;
  private batchBuffer: Map<string, Alert[]>;

  constructor(config: AlertConfig) {
    super();
    this.config = config;
    this.channels = new Map();
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.cooldowns = new Map();
    this.batchBuffer = new Map();
    this.initializeChannels();
    this.startBatchProcessor();
  }

  private initializeChannels(): void {
    for (const channel of this.config.channels) {
      if (channel.enabled) {
        this.channels.set(channel.id, new AlertChannelHandler(channel));
      }
    }
  }

  private startBatchProcessor(): void {
    if (!this.config.batchingConfig.enabled) return;

    setInterval(() => {
      this.processBatches();
    }, this.config.batchingConfig.windowMs);
  }

  /**
   * Process a detection and generate alerts if conditions are met
   */
  async processDetection(detection: {
    type: 'deepfake' | 'bot' | 'disinformation' | 'manipulation';
    id: string;
    confidence: number;
    result: any;
    metadata?: any;
  }): Promise<Alert[]> {
    const generatedAlerts: Alert[] = [];

    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (this.isInCooldown(rule.id)) continue;

      // Evaluate condition
      const conditionMet = await this.evaluateCondition(rule.condition, detection);
      if (!conditionMet) continue;

      // Check suppression
      if (this.isSuppressed(detection)) continue;

      // Create alert
      const alert = this.createAlert(rule, detection);

      // Handle batching
      if (this.config.batchingConfig.enabled) {
        this.addToBatch(rule.id, alert);
      } else {
        await this.processAlert(alert, rule);
      }

      generatedAlerts.push(alert);
      this.setCooldown(rule.id, rule.cooldownMs);
    }

    return generatedAlerts;
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateCondition(
    condition: AlertCondition,
    detection: any
  ): Promise<boolean> {
    switch (condition.type) {
      case ConditionType.THRESHOLD:
        return this.evaluateThreshold(condition, detection);

      case ConditionType.ANOMALY:
        return this.evaluateAnomaly(condition, detection);

      case ConditionType.PATTERN:
        return this.evaluatePattern(condition, detection);

      case ConditionType.RATE_LIMIT:
        return this.evaluateRateLimit(condition, detection);

      case ConditionType.COMPOSITE:
        return this.evaluateComposite(condition, detection);

      default:
        return false;
    }
  }

  private evaluateThreshold(condition: AlertCondition, detection: any): boolean {
    const value = this.extractMetricValue(condition.metric!, detection);
    const threshold = condition.threshold!;

    switch (condition.operator) {
      case ComparisonOperator.GREATER_THAN:
        return value > threshold;
      case ComparisonOperator.LESS_THAN:
        return value < threshold;
      case ComparisonOperator.EQUAL:
        return value === threshold;
      case ComparisonOperator.NOT_EQUAL:
        return value !== threshold;
      case ComparisonOperator.GREATER_EQUAL:
        return value >= threshold;
      case ComparisonOperator.LESS_EQUAL:
        return value <= threshold;
      default:
        return false;
    }
  }

  private evaluateAnomaly(condition: AlertCondition, detection: any): boolean {
    // Statistical anomaly detection
    const value = this.extractMetricValue(condition.metric!, detection);
    const history = this.getMetricHistory(condition.metric!);

    if (history.length < 10) return false;

    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);

    const zscore = Math.abs((value - mean) / stdDev);
    return zscore > (condition.threshold || 3);
  }

  private evaluatePattern(condition: AlertCondition, detection: any): boolean {
    // Pattern matching on recent detections
    return false;
  }

  private evaluateRateLimit(condition: AlertCondition, detection: any): boolean {
    const windowMs = condition.windowMs || 60000;
    const recentCount = this.countRecentDetections(detection.type, windowMs);
    return recentCount > (condition.threshold || 100);
  }

  private evaluateComposite(condition: AlertCondition, detection: any): boolean {
    // Combine multiple conditions
    return false;
  }

  private extractMetricValue(metric: string, detection: any): number {
    switch (metric) {
      case 'confidence':
        return detection.confidence;
      case 'severity':
        return detection.result?.severity || 0;
      default:
        return detection.result?.[metric] || 0;
    }
  }

  private getMetricHistory(metric: string): number[] {
    return this.alertHistory
      .slice(-100)
      .map(a => a.source.confidence);
  }

  private countRecentDetections(type: string, windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    return this.alertHistory.filter(
      a => a.source.type === type && a.timestamp.getTime() > cutoff
    ).length;
  }

  /**
   * Create alert from detection
   */
  private createAlert(rule: AlertRule, detection: any): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      severity: rule.severity,
      title: this.generateAlertTitle(rule, detection),
      description: this.generateAlertDescription(rule, detection),
      source: {
        type: detection.type,
        detectionId: detection.id,
        confidence: detection.confidence,
        evidence: detection.result,
      },
      timestamp: new Date(),
      status: AlertStatus.FIRING,
      labels: this.generateLabels(detection),
      annotations: this.generateAnnotations(detection),
      relatedAlerts: this.findRelatedAlerts(detection),
      timeline: [{
        timestamp: new Date(),
        type: 'created',
        details: { rule: rule.name },
      }],
      metrics: {
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        occurrenceCount: 1,
        meanTimeBetweenOccurrences: 0,
        impactScore: this.calculateImpactScore(detection),
      },
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.emit('alert:created', alert);

    return alert;
  }

  private generateAlertTitle(rule: AlertRule, detection: any): string {
    return `[${rule.severity.toUpperCase()}] ${detection.type} detected with ${(detection.confidence * 100).toFixed(1)}% confidence`;
  }

  private generateAlertDescription(rule: AlertRule, detection: any): string {
    return `${rule.description}\n\nDetection ID: ${detection.id}\nConfidence: ${(detection.confidence * 100).toFixed(1)}%`;
  }

  private generateLabels(detection: any): Record<string, string> {
    return {
      type: detection.type,
      confidence_tier: detection.confidence > 0.9 ? 'high' : detection.confidence > 0.7 ? 'medium' : 'low',
    };
  }

  private generateAnnotations(detection: any): Record<string, any> {
    return {
      detection: detection.result,
      metadata: detection.metadata,
    };
  }

  private findRelatedAlerts(detection: any): string[] {
    return this.alertHistory
      .filter(a =>
        a.source.type === detection.type &&
        Date.now() - a.timestamp.getTime() < 3600000
      )
      .map(a => a.id)
      .slice(-5);
  }

  private calculateImpactScore(detection: any): number {
    // Calculate based on detection type and confidence
    return detection.confidence * 0.7 + 0.3;
  }

  /**
   * Process alert - send notifications and execute actions
   */
  private async processAlert(alert: Alert, rule: AlertRule): Promise<void> {
    // Send to channels
    for (const channelId of rule.channels) {
      const handler = this.channels.get(channelId);
      if (handler) {
        await handler.send(alert);
      }
    }

    // Execute actions
    for (const action of rule.actions) {
      await this.executeAction(action, alert);
    }

    // Start escalation if needed
    if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.HIGH) {
      this.startEscalation(alert);
    }
  }

  /**
   * Execute alert action
   */
  private async executeAction(action: AlertAction, alert: Alert): Promise<void> {
    this.emit('action:executing', { action, alert });

    switch (action.type) {
      case ActionType.BLOCK_CONTENT:
        await this.blockContent(alert.source.detectionId, action.config);
        break;

      case ActionType.SUSPEND_ACCOUNT:
        await this.suspendAccount(action.config.target!, action.config);
        break;

      case ActionType.RATE_LIMIT:
        await this.applyRateLimit(action.config.target!, action.config);
        break;

      case ActionType.QUARANTINE:
        await this.quarantineContent(alert.source.detectionId, action.config);
        break;

      case ActionType.CREATE_TICKET:
        await this.createTicket(alert, action.config);
        break;

      case ActionType.TRIGGER_WORKFLOW:
        await this.triggerWorkflow(action.config.target!, { alert, ...action.config.parameters });
        break;

      case ActionType.ENRICH:
        await this.enrichAlert(alert);
        break;
    }

    alert.timeline.push({
      timestamp: new Date(),
      type: 'action_executed',
      details: { actionType: action.type },
    });

    this.emit('action:completed', { action, alert });
  }

  private async blockContent(contentId: string, config: ActionConfig): Promise<void> {
    console.log(`Blocking content: ${contentId}`);
  }

  private async suspendAccount(accountId: string, config: ActionConfig): Promise<void> {
    console.log(`Suspending account: ${accountId}`);
  }

  private async applyRateLimit(target: string, config: ActionConfig): Promise<void> {
    console.log(`Applying rate limit to: ${target}`);
  }

  private async quarantineContent(contentId: string, config: ActionConfig): Promise<void> {
    console.log(`Quarantining content: ${contentId}`);
  }

  private async createTicket(alert: Alert, config: ActionConfig): Promise<void> {
    console.log(`Creating ticket for alert: ${alert.id}`);
  }

  private async triggerWorkflow(workflowId: string, data: any): Promise<void> {
    console.log(`Triggering workflow: ${workflowId}`);
  }

  private async enrichAlert(alert: Alert): Promise<void> {
    // Enrich with additional context
  }

  /**
   * Handle escalation
   */
  private startEscalation(alert: Alert): void {
    let currentLevel = 0;

    const escalate = async () => {
      if (alert.status === AlertStatus.RESOLVED || alert.status === AlertStatus.ACKNOWLEDGED) {
        return;
      }

      const level = this.config.escalationPolicy.levels[currentLevel];
      if (!level) return;

      // Notify channels at this level
      for (const channelId of level.channels) {
        const handler = this.channels.get(channelId);
        if (handler) {
          await handler.send(alert, { escalationLevel: level.level });
        }
      }

      // Notify on-call if configured
      if (level.notifyOnCall && this.config.escalationPolicy.onCallSchedule) {
        await this.notifyOnCall(alert);
      }

      alert.timeline.push({
        timestamp: new Date(),
        type: 'escalated',
        details: { level: level.level },
      });

      currentLevel++;
      if (currentLevel < this.config.escalationPolicy.levels.length) {
        setTimeout(escalate, level.delayMs);
      }
    };

    setTimeout(escalate, this.config.escalationPolicy.levels[0]?.delayMs || 300000);
  }

  private async notifyOnCall(alert: Alert): Promise<void> {
    const schedule = this.config.escalationPolicy.onCallSchedule;
    if (!schedule) return;

    // Find current on-call person
    const currentOnCall = schedule.participants[0];
    if (currentOnCall) {
      console.log(`Notifying on-call: ${currentOnCall.userId}`);
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.assignee = userId;
    alert.timeline.push({
      timestamp: new Date(),
      type: 'acknowledged',
      actor: userId,
    });

    this.emit('alert:acknowledged', alert);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string, resolution?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = AlertStatus.RESOLVED;
    alert.timeline.push({
      timestamp: new Date(),
      type: 'resolved',
      actor: userId,
      details: { resolution },
    });

    this.activeAlerts.delete(alertId);
    this.emit('alert:resolved', alert);
  }

  /**
   * Get alert summary
   */
  getSummary(): AlertSummary {
    const alerts = Array.from(this.activeAlerts.values());

    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.LOW]: 0,
      [AlertSeverity.INFO]: 0,
    };

    const byStatus: Record<AlertStatus, number> = {
      [AlertStatus.FIRING]: 0,
      [AlertStatus.ACKNOWLEDGED]: 0,
      [AlertStatus.RESOLVED]: 0,
      [AlertStatus.SUPPRESSED]: 0,
    };

    const bySource: Record<string, number> = {};

    for (const alert of alerts) {
      bySeverity[alert.severity]++;
      byStatus[alert.status]++;
      bySource[alert.source.type] = (bySource[alert.source.type] || 0) + 1;
    }

    return {
      total: alerts.length,
      bySeverity,
      byStatus,
      bySource,
      recentAlerts: alerts.slice(-10),
      trends: this.calculateTrends(),
    };
  }

  private calculateTrends(): AlertTrend[] {
    // Calculate hourly trends for the past 24 hours
    const trends: AlertTrend[] = [];
    const now = Date.now();

    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i + 1) * 3600000;
      const hourEnd = now - i * 3600000;

      const hourAlerts = this.alertHistory.filter(
        a => a.timestamp.getTime() >= hourStart && a.timestamp.getTime() < hourEnd
      );

      trends.push({
        timestamp: new Date(hourEnd),
        count: hourAlerts.length,
        severity: AlertSeverity.MEDIUM,
      });
    }

    return trends;
  }

  // Cooldown management
  private isInCooldown(ruleId: string): boolean {
    const cooldownEnd = this.cooldowns.get(ruleId);
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  }

  private setCooldown(ruleId: string, durationMs: number): void {
    this.cooldowns.set(ruleId, Date.now() + durationMs);
  }

  // Suppression
  private isSuppressed(detection: any): boolean {
    for (const rule of this.config.suppressionRules) {
      if (this.evaluateCondition(rule.condition, detection)) {
        return true;
      }
    }
    return false;
  }

  // Batching
  private addToBatch(ruleId: string, alert: Alert): void {
    const batch = this.batchBuffer.get(ruleId) || [];
    batch.push(alert);
    this.batchBuffer.set(ruleId, batch);

    if (batch.length >= this.config.batchingConfig.maxBatchSize) {
      this.processBatchForRule(ruleId);
    }
  }

  private processBatches(): void {
    for (const [ruleId, batch] of this.batchBuffer) {
      if (batch.length > 0) {
        this.processBatchForRule(ruleId);
      }
    }
  }

  private processBatchForRule(ruleId: string): void {
    const batch = this.batchBuffer.get(ruleId) || [];
    if (batch.length === 0) return;

    const rule = this.config.rules.find(r => r.id === ruleId);
    if (rule) {
      // Create batch summary alert
      const summaryAlert = this.createBatchSummary(batch, rule);
      this.processAlert(summaryAlert, rule);
    }

    this.batchBuffer.set(ruleId, []);
  }

  private createBatchSummary(batch: Alert[], rule: AlertRule): Alert {
    return {
      ...batch[0],
      id: `batch_${Date.now()}`,
      title: `[BATCH] ${batch.length} ${rule.name} alerts`,
      description: `Batch of ${batch.length} alerts in ${this.config.batchingConfig.windowMs}ms window`,
      relatedAlerts: batch.map(a => a.id),
      metrics: {
        ...batch[0].metrics,
        occurrenceCount: batch.length,
      },
    };
  }
}

class AlertChannelHandler {
  private channel: AlertChannel;

  constructor(channel: AlertChannel) {
    this.channel = channel;
  }

  async send(alert: Alert, context?: any): Promise<void> {
    if (!this.channel.severity.includes(alert.severity)) return;

    switch (this.channel.type) {
      case ChannelType.WEBHOOK:
        await this.sendWebhook(alert, context);
        break;
      case ChannelType.SLACK:
        await this.sendSlack(alert, context);
        break;
      case ChannelType.EMAIL:
        await this.sendEmail(alert, context);
        break;
      default:
        console.log(`Sending to ${this.channel.type}: ${alert.title}`);
    }
  }

  private async sendWebhook(alert: Alert, context?: any): Promise<void> {
    // POST to webhook URL
    console.log(`Webhook: ${alert.title}`);
  }

  private async sendSlack(alert: Alert, context?: any): Promise<void> {
    // Send Slack message
    console.log(`Slack: ${alert.title}`);
  }

  private async sendEmail(alert: Alert, context?: any): Promise<void> {
    // Send email
    console.log(`Email: ${alert.title}`);
  }
}

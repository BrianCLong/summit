/**
 * Agentic Alerting System
 *
 * Intelligent alert management for anomaly detection with:
 * - Priority-based triage
 * - Deduplication and throttling
 * - Escalation rules
 * - Multi-channel delivery (Redis, webhooks, queues)
 */

import { createClient, RedisClientType } from 'redis';
import {
  DetectedAnomaly,
  AnomalyAlert,
  AlertPriority,
  AnomalySeverity,
  AlertingConfig,
  EscalationRule,
  AlertChannel,
} from './types.js';

interface AlertState {
  alert: AnomalyAlert;
  createdAt: number;
  lastNotified: number;
  notificationCount: number;
  escalationLevel: number;
}

type AlertHandler = (alert: AnomalyAlert) => Promise<void>;

export class AlertingAgent {
  private config: AlertingConfig;
  private redis: RedisClientType | null = null;
  private alertStates: Map<string, AlertState> = new Map();
  private entityThrottles: Map<string, number> = new Map();
  private handlers: Map<string, AlertHandler> = new Map();
  private isRunning = false;

  constructor(config: Partial<AlertingConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      deduplicationWindowMs: config.deduplicationWindowMs ?? 300000, // 5 minutes
      throttlePerEntityMs: config.throttlePerEntityMs ?? 60000, // 1 minute
      escalationRules: config.escalationRules ?? this.defaultEscalationRules(),
      channels: config.channels ?? this.defaultChannels(),
    };
  }

  private defaultEscalationRules(): EscalationRule[] {
    return [
      {
        condition: { severity: ['critical'], ageMinutes: 5 },
        action: 'escalate',
        target: 'on-call',
      },
      {
        condition: { severity: ['high'], ageMinutes: 15 },
        action: 'escalate',
        target: 'team-lead',
      },
      {
        condition: { severity: ['critical', 'high'] },
        action: 'notify',
        target: 'security-team',
      },
      {
        condition: { priority: ['p0', 'p1'] },
        action: 'auto_investigate',
        target: 'copilot',
      },
    ];
  }

  private defaultChannels(): AlertChannel[] {
    return [
      {
        type: 'redis',
        endpoint: 'alerts:anomaly',
        enabled: true,
      },
      {
        type: 'queue',
        endpoint: 'anomaly-alerts',
        enabled: true,
        filters: { minSeverity: 'medium' },
      },
    ];
  }

  /**
   * Initialize the alerting agent
   */
  async initialize(redisUrl?: string): Promise<void> {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = createClient({ url });

    this.redis.on('error', (err) => {
      console.error('[AlertingAgent] Redis error:', err);
    });

    await this.redis.connect();
    this.isRunning = true;

    // Start background tasks
    this.startEscalationChecker();
    this.startCleanupTask();

    console.log('[AlertingAgent] Initialized');
  }

  /**
   * Register a custom alert handler
   */
  registerHandler(channel: string, handler: AlertHandler): void {
    this.handlers.set(channel, handler);
  }

  /**
   * Process detected anomaly and generate alert if warranted
   */
  async processAnomaly(anomaly: DetectedAnomaly): Promise<AnomalyAlert | null> {
    if (!this.config.enabled) return null;

    // Check throttling
    if (this.isThrottled(anomaly.entityId)) {
      console.debug(`[AlertingAgent] Throttled alert for entity ${anomaly.entityId}`);
      return null;
    }

    // Check deduplication
    const existingAlert = this.findDuplicateAlert(anomaly);
    if (existingAlert) {
      await this.updateExistingAlert(existingAlert, anomaly);
      return existingAlert.alert;
    }

    // Create new alert
    const alert = this.createAlert(anomaly);

    // Store alert state
    this.alertStates.set(alert.id, {
      alert,
      createdAt: Date.now(),
      lastNotified: Date.now(),
      notificationCount: 1,
      escalationLevel: 0,
    });

    // Update throttle
    this.entityThrottles.set(anomaly.entityId, Date.now());

    // Deliver alert
    await this.deliverAlert(alert);

    return alert;
  }

  /**
   * Process multiple anomalies in batch
   */
  async processBatch(anomalies: DetectedAnomaly[]): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    for (const anomaly of anomalies) {
      const alert = await this.processAnomaly(anomaly);
      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  }

  private isThrottled(entityId: string): boolean {
    const lastAlert = this.entityThrottles.get(entityId);
    if (!lastAlert) return false;

    return Date.now() - lastAlert < this.config.throttlePerEntityMs;
  }

  private findDuplicateAlert(anomaly: DetectedAnomaly): AlertState | null {
    const windowStart = Date.now() - this.config.deduplicationWindowMs;

    for (const state of this.alertStates.values()) {
      if (
        state.createdAt > windowStart &&
        state.alert.entityId === anomaly.entityId &&
        state.alert.severity === anomaly.severity &&
        state.alert.status !== 'resolved' &&
        state.alert.status !== 'dismissed'
      ) {
        return state;
      }
    }

    return null;
  }

  private async updateExistingAlert(
    state: AlertState,
    anomaly: DetectedAnomaly,
  ): Promise<void> {
    state.alert.updatedAt = new Date();
    state.alert.metadata.updateCount =
      ((state.alert.metadata.updateCount as number) || 0) + 1;
    state.alert.metadata.latestAnomalyId = anomaly.id;
    state.alert.metadata.latestScore = anomaly.score;

    // Update severity if new anomaly is more severe
    if (this.compareSeverity(anomaly.severity, state.alert.severity) > 0) {
      state.alert.severity = anomaly.severity;
      state.alert.priority = this.severityToPriority(anomaly.severity);
    }

    console.debug(
      `[AlertingAgent] Updated existing alert ${state.alert.id} for entity ${anomaly.entityId}`,
    );
  }

  private createAlert(anomaly: DetectedAnomaly): AnomalyAlert {
    const priority = this.severityToPriority(anomaly.severity);

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      anomalyId: anomaly.id,
      priority,
      severity: anomaly.severity,
      title: this.generateAlertTitle(anomaly),
      description: anomaly.description,
      entityId: anomaly.entityId,
      entityType: anomaly.entityType,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      ttl: this.getTTL(anomaly.severity),
      metadata: {
        score: anomaly.score,
        confidence: anomaly.confidence,
        anomalyType: anomaly.anomalyType,
        evidence: anomaly.evidence,
        suggestedActions: anomaly.suggestedActions,
        sourceData: anomaly.sourceData,
      },
    };
  }

  private generateAlertTitle(anomaly: DetectedAnomaly): string {
    const typeLabel = anomaly.anomalyType.replace('_', ' ').toUpperCase();
    const severityLabel = anomaly.severity.toUpperCase();

    return `[${severityLabel}] ${typeLabel} anomaly detected on ${anomaly.entityType} ${anomaly.entityId}`;
  }

  private severityToPriority(severity: AnomalySeverity): AlertPriority {
    switch (severity) {
      case 'critical':
        return 'p0';
      case 'high':
        return 'p1';
      case 'medium':
        return 'p2';
      case 'low':
        return 'p3';
      default:
        return 'p4';
    }
  }

  private compareSeverity(a: AnomalySeverity, b: AnomalySeverity): number {
    const order: Record<AnomalySeverity, number> = {
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    };
    return order[a] - order[b];
  }

  private getTTL(severity: AnomalySeverity): number {
    switch (severity) {
      case 'critical':
        return 86400000; // 24 hours
      case 'high':
        return 43200000; // 12 hours
      case 'medium':
        return 21600000; // 6 hours
      case 'low':
        return 10800000; // 3 hours
      default:
        return 3600000; // 1 hour
    }
  }

  private async deliverAlert(alert: AnomalyAlert): Promise<void> {
    const enabledChannels = this.config.channels.filter((ch) => ch.enabled);

    for (const channel of enabledChannels) {
      // Check channel filters
      if (channel.filters) {
        if (
          channel.filters.minSeverity &&
          this.compareSeverity(alert.severity, channel.filters.minSeverity) < 0
        ) {
          continue;
        }
        if (
          channel.filters.entityTypes &&
          !channel.filters.entityTypes.includes(alert.entityType)
        ) {
          continue;
        }
      }

      try {
        await this.deliverToChannel(channel, alert);
      } catch (err) {
        console.error(
          `[AlertingAgent] Failed to deliver to channel ${channel.type}:`,
          err,
        );
      }
    }

    // Check for immediate escalation rules
    await this.checkEscalationRules(alert);
  }

  private async deliverToChannel(
    channel: AlertChannel,
    alert: AnomalyAlert,
  ): Promise<void> {
    switch (channel.type) {
      case 'redis':
        await this.deliverToRedis(channel.endpoint, alert);
        break;
      case 'queue':
        await this.deliverToQueue(channel.endpoint, alert);
        break;
      case 'webhook':
        await this.deliverToWebhook(channel.endpoint, alert);
        break;
      case 'graphql_subscription':
        await this.deliverToGraphQL(channel.endpoint, alert);
        break;
    }

    // Custom handlers
    const handler = this.handlers.get(channel.endpoint);
    if (handler) {
      await handler(alert);
    }
  }

  private async deliverToRedis(endpoint: string, alert: AnomalyAlert): Promise<void> {
    if (!this.redis) return;

    await this.redis.xAdd(endpoint, '*', {
      data: JSON.stringify(alert),
      type: 'anomaly_alert',
      priority: alert.priority,
    });

    // Also publish for subscribers
    await this.redis.publish(`${endpoint}:pub`, JSON.stringify(alert));

    console.debug(`[AlertingAgent] Delivered alert ${alert.id} to Redis stream ${endpoint}`);
  }

  private async deliverToQueue(endpoint: string, alert: AnomalyAlert): Promise<void> {
    if (!this.redis) return;

    // Use Redis sorted set as priority queue
    const score = this.priorityToScore(alert.priority);
    await this.redis.zAdd(endpoint, {
      score,
      value: JSON.stringify(alert),
    });

    console.debug(`[AlertingAgent] Delivered alert ${alert.id} to queue ${endpoint}`);
  }

  private priorityToScore(priority: AlertPriority): number {
    const scores: Record<AlertPriority, number> = {
      p0: 0,
      p1: 1,
      p2: 2,
      p3: 3,
      p4: 4,
    };
    return scores[priority] + Date.now() / 1e15; // Lower score = higher priority
  }

  private async deliverToWebhook(endpoint: string, alert: AnomalyAlert): Promise<void> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Alert-Priority': alert.priority,
          'X-Alert-Severity': alert.severity,
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      console.debug(`[AlertingAgent] Delivered alert ${alert.id} to webhook ${endpoint}`);
    } catch (err) {
      console.error(`[AlertingAgent] Webhook delivery failed:`, err);
      throw err;
    }
  }

  private async deliverToGraphQL(endpoint: string, alert: AnomalyAlert): Promise<void> {
    // GraphQL subscriptions would be handled by publishing to a Redis channel
    // that the GraphQL subscription resolver listens to
    if (!this.redis) return;

    await this.redis.publish(`graphql:${endpoint}`, JSON.stringify({
      type: 'ANOMALY_ALERT',
      payload: alert,
    }));

    console.debug(`[AlertingAgent] Published alert ${alert.id} to GraphQL subscription`);
  }

  private async checkEscalationRules(alert: AnomalyAlert): Promise<void> {
    for (const rule of this.config.escalationRules) {
      if (this.matchesEscalationCondition(alert, rule.condition, 0)) {
        await this.executeEscalationAction(alert, rule);
      }
    }
  }

  private matchesEscalationCondition(
    alert: AnomalyAlert,
    condition: EscalationRule['condition'],
    ageMinutes: number,
  ): boolean {
    if (condition.severity && !condition.severity.includes(alert.severity)) {
      return false;
    }
    if (condition.priority && !condition.priority.includes(alert.priority)) {
      return false;
    }
    if (condition.entityTypes && !condition.entityTypes.includes(alert.entityType)) {
      return false;
    }
    if (condition.ageMinutes && ageMinutes < condition.ageMinutes) {
      return false;
    }
    return true;
  }

  private async executeEscalationAction(
    alert: AnomalyAlert,
    rule: EscalationRule,
  ): Promise<void> {
    switch (rule.action) {
      case 'notify':
        await this.notifyTarget(alert, rule.target);
        break;
      case 'escalate':
        await this.escalateAlert(alert, rule.target);
        break;
      case 'auto_investigate':
        await this.triggerAutoInvestigation(alert, rule.target);
        break;
    }
  }

  private async notifyTarget(alert: AnomalyAlert, target: string): Promise<void> {
    if (!this.redis) return;

    await this.redis.publish(`notifications:${target}`, JSON.stringify({
      type: 'alert',
      alert,
      timestamp: new Date().toISOString(),
    }));

    console.log(`[AlertingAgent] Notified ${target} about alert ${alert.id}`);
  }

  private async escalateAlert(alert: AnomalyAlert, target: string): Promise<void> {
    const state = this.alertStates.get(alert.id);
    if (state) {
      state.escalationLevel++;
      state.lastNotified = Date.now();
    }

    alert.metadata.escalatedTo = target;
    alert.metadata.escalatedAt = new Date().toISOString();

    await this.notifyTarget(alert, target);

    console.log(`[AlertingAgent] Escalated alert ${alert.id} to ${target}`);
  }

  private async triggerAutoInvestigation(
    alert: AnomalyAlert,
    target: string,
  ): Promise<void> {
    if (!this.redis) return;

    // Emit investigation request to copilot/agent bus
    await this.redis.xAdd('agents', '*', {
      kind: 'investigate',
      msg: JSON.stringify({
        id: `inv-${alert.id}`,
        kind: 'investigate',
        key: alert.entityId,
        payload: {
          alertId: alert.id,
          entityId: alert.entityId,
          entityType: alert.entityType,
          anomalyType: alert.metadata.anomalyType,
          evidence: alert.metadata.evidence,
          suggestedActions: alert.metadata.suggestedActions,
        },
      }),
    });

    alert.investigationId = `inv-${alert.id}`;
    alert.status = 'investigating';

    console.log(`[AlertingAgent] Triggered auto-investigation for alert ${alert.id}`);
  }

  private startEscalationChecker(): void {
    const checkInterval = 60000; // 1 minute

    const check = async () => {
      if (!this.isRunning) return;

      const now = Date.now();

      for (const [alertId, state] of this.alertStates.entries()) {
        if (
          state.alert.status === 'resolved' ||
          state.alert.status === 'dismissed'
        ) {
          continue;
        }

        const ageMinutes = (now - state.createdAt) / 60000;

        for (const rule of this.config.escalationRules) {
          if (
            this.matchesEscalationCondition(state.alert, rule.condition, ageMinutes) &&
            state.escalationLevel < (rule.condition.ageMinutes ? 1 : 0)
          ) {
            await this.executeEscalationAction(state.alert, rule);
          }
        }
      }

      setTimeout(check, checkInterval);
    };

    setTimeout(check, checkInterval);
  }

  private startCleanupTask(): void {
    const cleanupInterval = 300000; // 5 minutes

    const cleanup = () => {
      if (!this.isRunning) return;

      const now = Date.now();

      // Clean up old throttles
      for (const [entityId, timestamp] of this.entityThrottles.entries()) {
        if (now - timestamp > this.config.throttlePerEntityMs * 2) {
          this.entityThrottles.delete(entityId);
        }
      }

      // Clean up expired alerts
      for (const [alertId, state] of this.alertStates.entries()) {
        const age = now - state.createdAt;
        if (age > (state.alert.ttl || 86400000)) {
          this.alertStates.delete(alertId);
        }
      }

      setTimeout(cleanup, cleanupInterval);
    };

    setTimeout(cleanup, cleanupInterval);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, assignee?: string): Promise<boolean> {
    const state = this.alertStates.get(alertId);
    if (!state) return false;

    state.alert.status = 'acknowledged';
    state.alert.assignee = assignee;
    state.alert.updatedAt = new Date();

    return true;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution?: string): Promise<boolean> {
    const state = this.alertStates.get(alertId);
    if (!state) return false;

    state.alert.status = 'resolved';
    state.alert.updatedAt = new Date();
    state.alert.metadata.resolution = resolution;

    return true;
  }

  /**
   * Dismiss an alert (false positive)
   */
  async dismissAlert(alertId: string, reason?: string): Promise<boolean> {
    const state = this.alertStates.get(alertId);
    if (!state) return false;

    state.alert.status = 'dismissed';
    state.alert.updatedAt = new Date();
    state.alert.metadata.dismissReason = reason;

    return true;
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): AnomalyAlert | null {
    return this.alertStates.get(alertId)?.alert || null;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): AnomalyAlert[] {
    return Array.from(this.alertStates.values())
      .filter(
        (state) =>
          state.alert.status !== 'resolved' &&
          state.alert.status !== 'dismissed',
      )
      .map((state) => state.alert);
  }

  /**
   * Shutdown the alerting agent
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    console.log('[AlertingAgent] Shutdown complete');
  }
}

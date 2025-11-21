/**
 * Alert Manager
 * Manages alert lifecycle, deduplication, escalation, and notification
 */

import { EventEmitter } from 'events';
import type { Alert, Event } from '../types.js';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: Alert['severity'];
  conditions: AlertCondition[];
  throttleMs?: number;
  escalationPolicy?: EscalationPolicy;
  notificationChannels?: string[];
  tags?: string[];
  runbook?: string;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  duration?: number; // How long condition must be true
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  repeatIntervalMs?: number;
}

export interface EscalationLevel {
  delayMs: number;
  notifyChannels: string[];
  notifyUsers?: string[];
}

export interface AlertState {
  alert: Alert;
  state: 'firing' | 'pending' | 'resolved' | 'acknowledged' | 'silenced';
  firedAt: number;
  resolvedAt?: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  escalationLevel: number;
  notificationsSent: number;
  lastNotificationAt?: number;
}

export interface NotificationConfig {
  channel: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'sms';
  config: Record<string, any>;
}

export class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertState> = new Map();
  private alertHistory: Alert[] = [];
  private silences: Map<string, { until: number; reason: string }> = new Map();
  private notificationConfigs: Map<string, NotificationConfig> = new Map();
  private deduplicationWindow: number = 60000; // 1 minute
  private maxHistorySize: number = 10000;

  constructor() {
    super();
    this.startEscalationChecker();
  }

  /**
   * Register alert rule
   */
  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    console.log(`Alert rule registered: ${rule.name}`);
    this.emit('rule:registered', rule);
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.emit('rule:removed', ruleId);
  }

  /**
   * Register notification channel
   */
  registerNotificationChannel(config: NotificationConfig): void {
    this.notificationConfigs.set(config.channel, config);
  }

  /**
   * Fire an alert
   */
  async fireAlert(alert: Alert, ruleId?: string): Promise<string> {
    // Check for silence
    if (this.isSilenced(alert)) {
      console.log(`Alert silenced: ${alert.title}`);
      return alert.id;
    }

    // Check for deduplication
    const dedupKey = this.getDeduplicationKey(alert);
    const existingAlert = this.activeAlerts.get(dedupKey);

    if (existingAlert && existingAlert.state === 'firing') {
      // Update existing alert
      existingAlert.alert = alert;
      return existingAlert.alert.id;
    }

    // Create alert state
    const state: AlertState = {
      alert,
      state: 'firing',
      firedAt: Date.now(),
      escalationLevel: 0,
      notificationsSent: 0,
    };

    this.activeAlerts.set(dedupKey, state);
    this.alertHistory.push(alert);
    this.trimHistory();

    // Send initial notification
    await this.sendNotification(alert, ruleId);
    state.notificationsSent++;
    state.lastNotificationAt = Date.now();

    this.emit('alert:fired', alert);
    console.log(`Alert fired: ${alert.title} [${alert.severity}]`);

    return alert.id;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    for (const [key, state] of this.activeAlerts) {
      if (state.alert.id === alertId) {
        state.state = 'resolved';
        state.resolvedAt = Date.now();

        this.emit('alert:resolved', state.alert);
        console.log(`Alert resolved: ${state.alert.title}`);

        // Send resolution notification
        await this.sendNotification(state.alert, undefined, 'resolved');

        // Remove from active after some time
        setTimeout(() => {
          this.activeAlerts.delete(key);
        }, 300000); // 5 minutes

        return;
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): void {
    for (const state of this.activeAlerts.values()) {
      if (state.alert.id === alertId) {
        state.state = 'acknowledged';
        state.acknowledgedAt = Date.now();
        state.acknowledgedBy = userId;

        this.emit('alert:acknowledged', { alert: state.alert, userId });
        console.log(`Alert acknowledged: ${state.alert.title} by ${userId}`);
        return;
      }
    }
  }

  /**
   * Silence alerts matching criteria
   */
  silenceAlerts(
    criteria: { severity?: Alert['severity']; tags?: string[] },
    durationMs: number,
    reason: string
  ): string {
    const silenceId = `silence-${Date.now()}`;
    const key = JSON.stringify(criteria);

    this.silences.set(key, {
      until: Date.now() + durationMs,
      reason,
    });

    console.log(`Alerts silenced: ${key} for ${durationMs}ms`);
    return silenceId;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): AlertState[] {
    return Array.from(this.activeAlerts.values())
      .filter(s => s.state === 'firing' || s.state === 'acknowledged');
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return Array.from(this.activeAlerts.values())
      .filter(s => s.alert.severity === severity)
      .map(s => s.alert);
  }

  /**
   * Get alert statistics
   */
  getStatistics(): {
    total: number;
    firing: number;
    acknowledged: number;
    resolved: number;
    bySeverity: Record<string, number>;
  } {
    const stats = {
      total: this.activeAlerts.size,
      firing: 0,
      acknowledged: 0,
      resolved: 0,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      } as Record<string, number>,
    };

    for (const state of this.activeAlerts.values()) {
      switch (state.state) {
        case 'firing':
          stats.firing++;
          break;
        case 'acknowledged':
          stats.acknowledged++;
          break;
        case 'resolved':
          stats.resolved++;
          break;
      }

      stats.bySeverity[state.alert.severity]++;
    }

    return stats;
  }

  /**
   * Send notification
   */
  private async sendNotification(
    alert: Alert,
    ruleId?: string,
    action: 'fired' | 'resolved' | 'escalated' = 'fired'
  ): Promise<void> {
    const rule = ruleId ? this.rules.get(ruleId) : undefined;
    const channels = rule?.notificationChannels || ['default'];

    for (const channelName of channels) {
      const config = this.notificationConfigs.get(channelName);
      if (!config) continue;

      try {
        await this.deliverNotification(config, alert, action);
      } catch (error) {
        console.error(`Failed to deliver notification to ${channelName}:`, error);
        this.emit('notification:failed', { channel: channelName, alert, error });
      }
    }
  }

  /**
   * Deliver notification to specific channel
   */
  private async deliverNotification(
    config: NotificationConfig,
    alert: Alert,
    action: string
  ): Promise<void> {
    const payload = {
      action,
      alert: {
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        timestamp: alert.timestamp,
      },
    };

    switch (config.type) {
      case 'webhook':
        // In real implementation, make HTTP request
        console.log(`Webhook notification: ${config.config.url}`, payload);
        break;

      case 'slack':
        // In real implementation, post to Slack
        console.log(`Slack notification: ${config.config.channel}`, payload);
        break;

      case 'email':
        // In real implementation, send email
        console.log(`Email notification: ${config.config.to}`, payload);
        break;

      case 'pagerduty':
        // In real implementation, trigger PagerDuty
        console.log(`PagerDuty notification: ${config.config.serviceKey}`, payload);
        break;

      default:
        console.log(`Unknown notification type: ${config.type}`);
    }

    this.emit('notification:sent', { config, alert, action });
  }

  /**
   * Check if alert is silenced
   */
  private isSilenced(alert: Alert): boolean {
    const now = Date.now();

    for (const [criteriaStr, silence] of this.silences) {
      if (silence.until < now) {
        this.silences.delete(criteriaStr);
        continue;
      }

      const criteria = JSON.parse(criteriaStr);

      if (criteria.severity && criteria.severity !== alert.severity) {
        continue;
      }

      // Check tags if specified
      if (criteria.tags && alert.metadata?.tags) {
        const hasMatchingTag = criteria.tags.some(
          (t: string) => alert.metadata?.tags?.includes(t)
        );
        if (!hasMatchingTag) continue;
      }

      return true;
    }

    return false;
  }

  /**
   * Get deduplication key
   */
  private getDeduplicationKey(alert: Alert): string {
    return `${alert.title}-${alert.severity}-${JSON.stringify(alert.metadata?.labels || {})}`;
  }

  /**
   * Trim history to max size
   */
  private trimHistory(): void {
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Start escalation checker
   */
  private startEscalationChecker(): void {
    setInterval(async () => {
      const now = Date.now();

      for (const [key, state] of this.activeAlerts) {
        if (state.state !== 'firing') continue;

        const rule = Array.from(this.rules.values()).find(
          r => r.name === state.alert.title || r.id === state.alert.pattern?.id
        );

        if (!rule?.escalationPolicy) continue;

        const { levels, repeatIntervalMs = 300000 } = rule.escalationPolicy;
        const currentLevel = state.escalationLevel;

        // Check if we need to escalate
        if (currentLevel < levels.length) {
          const level = levels[currentLevel];
          const shouldEscalate = now - state.firedAt > level.delayMs;

          if (shouldEscalate) {
            state.escalationLevel++;
            await this.sendNotification(state.alert, rule.id, 'escalated');
            state.notificationsSent++;
            state.lastNotificationAt = now;

            this.emit('alert:escalated', {
              alert: state.alert,
              level: state.escalationLevel,
            });
          }
        } else {
          // Repeat notifications at configured interval
          if (state.lastNotificationAt && now - state.lastNotificationAt > repeatIntervalMs) {
            await this.sendNotification(state.alert, rule.id, 'fired');
            state.notificationsSent++;
            state.lastNotificationAt = now;
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }
}

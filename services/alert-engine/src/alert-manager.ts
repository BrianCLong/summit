import { EventEmitter } from 'events';
import Redis from 'ioredis';
import pino from 'pino';
import { Alert, AlertRule, AlertStatus, AlertSeverity } from './alert-types';
import { AlertRouter } from './alert-router';
import { AlertSuppressor } from './alert-suppression';

const logger = pino({ name: 'alert-manager' });

/**
 * Central alert management system
 */
export class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private redis: Redis | null = null;
  private router: AlertRouter;
  private suppressor: AlertSuppressor;

  constructor(redisUrl?: string) {
    super();

    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }

    this.router = new AlertRouter();
    this.suppressor = new AlertSuppressor();
  }

  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info({ ruleId: rule.id, name: rule.name }, 'Alert rule added');
  }

  /**
   * Process event and check alert rules
   */
  async processEvent(event: any): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(event)) {
          const alert = await this.createAlert(rule, event);

          // Check suppression
          if (!this.suppressor.shouldSuppress(alert, rule.suppressionRules)) {
            await this.triggerAlert(alert, rule);
            triggeredAlerts.push(alert);
          } else {
            logger.debug({ alertId: alert.id }, 'Alert suppressed');
            alert.status = AlertStatus.SUPPRESSED;
          }
        }
      } catch (error) {
        logger.error({ error, ruleId: rule.id }, 'Alert rule evaluation failed');
      }
    }

    return triggeredAlerts;
  }

  /**
   * Create alert from rule and event
   */
  private async createAlert(rule: AlertRule, event: any): Promise<Alert> {
    const alertId = `${rule.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: Alert = {
      id: alertId,
      title: rule.name,
      description: rule.description || '',
      severity: rule.severity,
      status: AlertStatus.TRIGGERED,
      source: event.source || 'unknown',
      timestamp: Date.now(),
      metadata: {
        ruleId: rule.id,
        event,
      },
      tags: event.tags || [],
    };

    return alert;
  }

  /**
   * Trigger alert and send notifications
   */
  private async triggerAlert(alert: Alert, rule: AlertRule): Promise<void> {
    // Store alert
    this.activeAlerts.set(alert.id, alert);

    if (this.redis) {
      await this.redis.setex(
        `alert:${alert.id}`,
        86400, // 24 hours
        JSON.stringify(alert)
      );

      // Add to active alerts list
      await this.redis.zadd('active-alerts', Date.now(), alert.id);
    }

    // Route to notification channels
    await this.router.routeAlert(alert, rule.notificationChannels);

    // Handle escalation
    if (rule.escalationPolicy) {
      this.handleEscalation(alert, rule);
    }

    this.emit('alert-triggered', alert);
    logger.info({ alertId: alert.id, severity: alert.severity }, 'Alert triggered');
  }

  /**
   * Handle alert escalation
   */
  private handleEscalation(alert: Alert, rule: AlertRule): void {
    if (!rule.escalationPolicy) return;

    for (const level of rule.escalationPolicy.levels) {
      setTimeout(async () => {
        // Check if alert is still active
        const currentAlert = this.activeAlerts.get(alert.id);

        if (
          currentAlert &&
          currentAlert.status === AlertStatus.TRIGGERED &&
          (!level.condition || level.condition(currentAlert))
        ) {
          await this.router.routeAlert(currentAlert, level.channels);
          this.emit('alert-escalated', { alert: currentAlert, level });
        }
      }, level.delayMs);
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.metadata.acknowledgedBy = acknowledgedBy;
    alert.metadata.acknowledgedAt = Date.now();

    if (this.redis) {
      await this.redis.setex(
        `alert:${alertId}`,
        86400,
        JSON.stringify(alert)
      );
    }

    this.emit('alert-acknowledged', alert);
    logger.info({ alertId, acknowledgedBy }, 'Alert acknowledged');
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = AlertStatus.RESOLVED;
    alert.metadata.resolvedBy = resolvedBy;
    alert.metadata.resolvedAt = Date.now();

    this.activeAlerts.delete(alertId);

    if (this.redis) {
      await this.redis.setex(
        `alert:${alertId}`,
        86400,
        JSON.stringify(alert)
      );

      await this.redis.zrem('active-alerts', alertId);
    }

    this.emit('alert-resolved', alert);
    logger.info({ alertId, resolvedBy }, 'Alert resolved');
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(options?: {
    severity?: AlertSeverity;
    source?: string;
    limit?: number;
  }): Promise<Alert[]> {
    let alerts = Array.from(this.activeAlerts.values());

    if (options?.severity) {
      alerts = alerts.filter((a) => a.severity === options.severity);
    }

    if (options?.source) {
      alerts = alerts.filter((a) => a.source === options.source);
    }

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get alert statistics
   */
  async getStatistics(): Promise<AlertStatistics> {
    const alerts = Array.from(this.activeAlerts.values());

    return {
      total: alerts.length,
      bySeverity: {
        critical: alerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
        high: alerts.filter((a) => a.severity === AlertSeverity.HIGH).length,
        medium: alerts.filter((a) => a.severity === AlertSeverity.MEDIUM).length,
        low: alerts.filter((a) => a.severity === AlertSeverity.LOW).length,
        info: alerts.filter((a) => a.severity === AlertSeverity.INFO).length,
      },
      byStatus: {
        triggered: alerts.filter((a) => a.status === AlertStatus.TRIGGERED).length,
        acknowledged: alerts.filter((a) => a.status === AlertStatus.ACKNOWLEDGED).length,
        resolved: alerts.filter((a) => a.status === AlertStatus.RESOLVED).length,
        suppressed: alerts.filter((a) => a.status === AlertStatus.SUPPRESSED).length,
      },
    };
  }
}

export interface AlertStatistics {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<AlertStatus, number>;
}

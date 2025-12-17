/**
 * Alert Service - Manages alerts and alert rules
 * @module @intelgraph/control-tower-service/services/AlertService
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Alert,
  AlertRule,
  AlertStatus,
  AlertConnection,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
  OperationalEvent,
  Severity,
  NotificationChannel,
  AlertNotification,
  ServiceContext,
} from '../types/index.js';

export interface AlertRepository {
  findAlertById(id: string): Promise<Alert | null>;
  findAlerts(limit: number, cursor?: string, filters?: { status?: AlertStatus[]; severity?: Severity[] }): Promise<AlertConnection>;
  createAlert(alert: Omit<Alert, 'id'>): Promise<Alert>;
  updateAlert(id: string, updates: Partial<Alert>): Promise<Alert>;
  findRuleById(id: string): Promise<AlertRule | null>;
  findRules(enabled?: boolean): Promise<AlertRule[]>;
  createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount' | 'lastTriggeredAt'>): Promise<AlertRule>;
  updateRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule>;
  deleteRule(id: string): Promise<boolean>;
  incrementRuleTriggerCount(id: string): Promise<void>;
}

export interface NotificationService {
  send(channel: NotificationChannel, recipient: string, message: { title: string; body: string; url?: string }): Promise<{ delivered: boolean; error?: string }>;
}

export class AlertService {
  constructor(
    private readonly repository: AlertRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Get alert by ID
   */
  async getAlert(id: string, context?: ServiceContext): Promise<Alert | null> {
    return this.repository.findAlertById(id);
  }

  /**
   * Get alerts with filtering and pagination
   */
  async getAlerts(
    first: number,
    after?: string,
    status?: AlertStatus[],
    severity?: Severity[],
    context?: ServiceContext,
  ): Promise<AlertConnection> {
    return this.repository.findAlerts(first, after, { status, severity });
  }

  /**
   * Evaluate an event against all rules and trigger alerts
   */
  async evaluateEvent(event: OperationalEvent): Promise<Alert[]> {
    const rules = await this.repository.findRules(true);
    const triggeredAlerts: Alert[] = [];

    for (const rule of rules) {
      if (this.eventMatchesRule(event, rule)) {
        // Check cooldown
        if (rule.lastTriggeredAt && rule.cooldownSeconds) {
          const cooldownEnd = new Date(rule.lastTriggeredAt.getTime() + rule.cooldownSeconds * 1000);
          if (new Date() < cooldownEnd) {
            continue; // Skip, still in cooldown
          }
        }

        const alert = await this.triggerAlert(rule, event);
        triggeredAlerts.push(alert);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Trigger an alert from a rule
   */
  private async triggerAlert(rule: AlertRule, event: OperationalEvent): Promise<Alert> {
    const alert = await this.repository.createAlert({
      rule,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      title: `${rule.name}: ${event.title}`,
      message: `Alert triggered by rule "${rule.name}" for event: ${event.title}`,
      triggeringEvent: event,
      triggeredAt: new Date(),
      notifications: [],
    });

    // Update rule trigger count
    await this.repository.incrementRuleTriggerCount(rule.id);

    // Send notifications
    const notifications = await this.sendNotifications(alert, rule);

    // Update alert with notifications
    return this.repository.updateAlert(alert.id, { notifications });
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<AlertNotification[]> {
    const notifications: AlertNotification[] = [];

    for (const channel of rule.channels) {
      for (const recipient of rule.recipients) {
        const result = await this.notificationService.send(channel, recipient, {
          title: alert.title,
          body: alert.message,
          url: `/control-tower/alerts/${alert.id}`,
        });

        notifications.push({
          id: uuidv4(),
          channel,
          recipient,
          sentAt: new Date(),
          delivered: result.delivered,
          error: result.error,
        });
      }
    }

    return notifications;
  }

  /**
   * Check if an event matches a rule's conditions
   */
  private eventMatchesRule(event: OperationalEvent, rule: AlertRule): boolean {
    const conditions = rule.conditions as {
      severity?: Severity[];
      source?: string[];
      category?: string[];
      keywords?: string[];
    };

    // Check severity
    if (conditions.severity && !conditions.severity.includes(event.severity)) {
      return false;
    }

    // Check source
    if (conditions.source && !conditions.source.includes(event.source)) {
      return false;
    }

    // Check category
    if (conditions.category && !conditions.category.includes(event.category)) {
      return false;
    }

    // Check keywords in title/description
    if (conditions.keywords) {
      const text = `${event.title} ${event.description || ''}`.toLowerCase();
      const hasKeyword = conditions.keywords.some(kw => text.includes(kw.toLowerCase()));
      if (!hasKeyword) {
        return false;
      }
    }

    return true;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, context: ServiceContext): Promise<Alert> {
    const alert = await this.repository.findAlertById(alertId);

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.status !== AlertStatus.ACTIVE) {
      throw new Error(`Cannot acknowledge alert in status: ${alert.status}`);
    }

    return this.repository.updateAlert(alertId, {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
      acknowledgedBy: context.user,
    });
  }

  /**
   * Snooze an alert
   */
  async snoozeAlert(
    alertId: string,
    durationMinutes: number,
    context: ServiceContext,
  ): Promise<Alert> {
    const alert = await this.repository.findAlertById(alertId);

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    const snoozedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    return this.repository.updateAlert(alertId, {
      status: AlertStatus.SNOOZED,
      snoozedUntil,
    });
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(
    alertId: string,
    reason: string | undefined,
    context: ServiceContext,
  ): Promise<Alert> {
    const alert = await this.repository.findAlertById(alertId);

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    return this.repository.updateAlert(alertId, {
      status: AlertStatus.DISMISSED,
    });
  }

  // ============================================================================
  // Alert Rules
  // ============================================================================

  /**
   * Get alert rule by ID
   */
  async getAlertRule(id: string, context?: ServiceContext): Promise<AlertRule | null> {
    return this.repository.findRuleById(id);
  }

  /**
   * Get all alert rules
   */
  async getAlertRules(enabled?: boolean, context?: ServiceContext): Promise<AlertRule[]> {
    return this.repository.findRules(enabled);
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(
    input: CreateAlertRuleInput,
    context: ServiceContext,
  ): Promise<AlertRule> {
    return this.repository.createRule({
      ...input,
      enabled: input.enabled ?? true,
      createdBy: context.user,
    });
  }

  /**
   * Update an alert rule
   */
  async updateAlertRule(
    id: string,
    input: UpdateAlertRuleInput,
    context: ServiceContext,
  ): Promise<AlertRule> {
    const rule = await this.repository.findRuleById(id);

    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`);
    }

    return this.repository.updateRule(id, {
      ...input,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(id: string, context: ServiceContext): Promise<boolean> {
    const rule = await this.repository.findRuleById(id);

    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`);
    }

    return this.repository.deleteRule(id);
  }
}

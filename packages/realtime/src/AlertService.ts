/**
 * Alert and Notification Service
 * Manages real-time alerts, notifications, and priority-based routing
 */

import { v4 as uuidv4 } from 'uuid';

export interface Alert {
  id: string;
  type: 'threat' | 'system' | 'investigation' | 'intelligence' | 'security' | 'operational';
  priority: 'low' | 'medium' | 'high' | 'critical';
  severity?: 'info' | 'warning' | 'error' | 'critical';

  // Content
  title: string;
  message: string;
  details?: string;

  // Source
  source: string;
  sourceId?: string;

  // Targeting
  targetUsers?: string[];
  targetRoles?: string[];
  targetGroups?: string[];

  // Status
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';

  // Timing
  createdAt: Date;
  expiresAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;

  // Actions
  actions?: AlertAction[];

  // Delivery
  channels: NotificationChannel[];
  deliveryStatus: Record<NotificationChannel, 'pending' | 'sent' | 'failed'>;

  // Metadata
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface AlertAction {
  id: string;
  label: string;
  type: 'link' | 'callback' | 'dismiss' | 'escalate';
  url?: string;
  callback?: string;
  params?: Record<string, any>;
}

export type NotificationChannel =
  | 'in-app'
  | 'email'
  | 'sms'
  | 'push'
  | 'slack'
  | 'teams'
  | 'webhook';

export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Trigger conditions
  conditions: {
    alertTypes?: Alert['type'][];
    priorities?: Alert['priority'][];
    sources?: string[];
    tags?: string[];
  };

  // Routing
  routing: {
    users?: string[];
    roles?: string[];
    groups?: string[];
  };

  // Channels
  channels: NotificationChannel[];

  // Timing
  schedule?: {
    days?: number[]; // 0-6 (Sun-Sat)
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
  };

  // Rate limiting
  rateLimit?: {
    maxAlerts: number;
    windowMs: number;
  };
}

export interface AlertSubscription {
  userId: string;
  channels: NotificationChannel[];
  preferences: {
    quietHours?: {
      start: string; // HH:mm
      end: string; // HH:mm
    };
    minPriority?: Alert['priority'];
    alertTypes?: Alert['type'][];
  };
}

export class AlertService {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, NotificationRule> = new Map();
  private subscriptions: Map<string, AlertSubscription> = new Map();
  private alertHistory: Alert[] = [];

  /**
   * Create a new alert
   */
  createAlert(params: {
    type: Alert['type'];
    priority: Alert['priority'];
    title: string;
    message: string;
    details?: string;
    source: string;
    sourceId?: string;
    targetUsers?: string[];
    targetRoles?: string[];
    actions?: AlertAction[];
    tags?: string[];
    metadata?: Record<string, any>;
  }): Alert {
    const alert: Alert = {
      id: uuidv4(),
      type: params.type,
      priority: params.priority,
      title: params.title,
      message: params.message,
      details: params.details,
      source: params.source,
      sourceId: params.sourceId,
      targetUsers: params.targetUsers,
      targetRoles: params.targetRoles,
      status: 'new',
      createdAt: new Date(),
      actions: params.actions,
      channels: this.determineChannels(params.priority),
      deliveryStatus: {},
      tags: params.tags,
      metadata: params.metadata,
    };

    // Initialize delivery status
    alert.channels.forEach(channel => {
      alert.deliveryStatus[channel] = 'pending';
    });

    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Route alert based on rules
    this.routeAlert(alert);

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): Alert | undefined {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, userId: string): Alert | undefined {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Get alerts for a user
   */
  getAlertsForUser(userId: string, filters?: {
    status?: Alert['status'][];
    priority?: Alert['priority'][];
    type?: Alert['type'][];
  }): Alert[] {
    let alerts = Array.from(this.alerts.values()).filter(
      alert =>
        (!alert.targetUsers || alert.targetUsers.includes(userId))
    );

    if (filters?.status) {
      alerts = alerts.filter(a => filters.status!.includes(a.status));
    }

    if (filters?.priority) {
      alerts = alerts.filter(a => filters.priority!.includes(a.priority));
    }

    if (filters?.type) {
      alerts = alerts.filter(a => filters.type!.includes(a.type));
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Create notification rule
   */
  createRule(rule: Omit<NotificationRule, 'id'>): NotificationRule {
    const newRule: NotificationRule = {
      id: uuidv4(),
      ...rule,
    };

    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  /**
   * Route alert based on rules
   */
  private routeAlert(alert: Alert): void {
    const applicableRules = Array.from(this.rules.values()).filter(rule => {
      if (!rule.enabled) return false;

      if (rule.conditions.alertTypes &&
          !rule.conditions.alertTypes.includes(alert.type)) {
        return false;
      }

      if (rule.conditions.priorities &&
          !rule.conditions.priorities.includes(alert.priority)) {
        return false;
      }

      if (rule.conditions.sources &&
          !rule.conditions.sources.includes(alert.source)) {
        return false;
      }

      return true;
    });

    // Apply routing rules
    applicableRules.forEach(rule => {
      if (rule.routing.users) {
        alert.targetUsers = [...(alert.targetUsers || []), ...rule.routing.users];
      }
      if (rule.routing.roles) {
        alert.targetRoles = [...(alert.targetRoles || []), ...rule.routing.roles];
      }

      // Add channels from rule
      rule.channels.forEach(channel => {
        if (!alert.channels.includes(channel)) {
          alert.channels.push(channel);
          alert.deliveryStatus[channel] = 'pending';
        }
      });
    });
  }

  /**
   * Determine notification channels based on priority
   */
  private determineChannels(priority: Alert['priority']): NotificationChannel[] {
    switch (priority) {
      case 'critical':
        return ['in-app', 'email', 'sms', 'push', 'slack'];
      case 'high':
        return ['in-app', 'email', 'push', 'slack'];
      case 'medium':
        return ['in-app', 'email'];
      case 'low':
        return ['in-app'];
      default:
        return ['in-app'];
    }
  }

  /**
   * Subscribe user to notifications
   */
  subscribe(subscription: AlertSubscription): void {
    this.subscriptions.set(subscription.userId, subscription);
  }

  /**
   * Unsubscribe user from notifications
   */
  unsubscribe(userId: string): void {
    this.subscriptions.delete(userId);
  }

  /**
   * Get alert statistics
   */
  getStatistics() {
    const alerts = Array.from(this.alerts.values());

    return {
      total: alerts.length,
      new: alerts.filter(a => a.status === 'new').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      critical: alerts.filter(a => a.priority === 'critical').length,
      high: alerts.filter(a => a.priority === 'high').length,
      byType: alerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: alerts.reduce((acc, alert) => {
        acc[alert.priority] = (acc[alert.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const alertService = new AlertService();

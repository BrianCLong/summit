/**
 * Alert Manager for workflow monitoring
 */

import EventEmitter from 'eventemitter3';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  tags: Record<string, string>;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (context: any) => boolean;
  severity: AlertSeverity;
  message: string;
  cooldown?: number; // Minimum time between alerts in ms
}

interface AlertManagerEvents {
  'alert:triggered': (alert: Alert) => void;
  'alert:resolved': (alert: Alert) => void;
}

export class AlertManager extends EventEmitter<AlertManagerEvents> {
  private alerts: Map<string, Alert>;
  private rules: Map<string, AlertRule>;
  private lastTriggered: Map<string, Date>;

  constructor() {
    super();
    this.alerts = new Map();
    this.rules = new Map();
    this.lastTriggered = new Map();
  }

  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Evaluate rules against context
   */
  evaluateRules(context: any): void {
    this.rules.forEach(rule => {
      try {
        if (rule.condition(context)) {
          this.triggerAlert(rule, context);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    });
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, context: any): void {
    // Check cooldown
    const lastTrigger = this.lastTriggered.get(rule.id);
    if (lastTrigger && rule.cooldown) {
      const elapsed = Date.now() - lastTrigger.getTime();
      if (elapsed < rule.cooldown) {
        return;
      }
    }

    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      severity: rule.severity,
      title: rule.name,
      message: rule.message,
      timestamp: new Date(),
      tags: context.tags || {},
    };

    this.alerts.set(alert.id, alert);
    this.lastTriggered.set(rule.id, new Date());
    this.emit('alert:triggered', alert);
  }

  /**
   * Create manual alert
   */
  createAlert(
    severity: AlertSeverity,
    title: string,
    message: string,
    tags: Record<string, string> = {}
  ): Alert {
    const alert: Alert = {
      id: `manual_${Date.now()}`,
      severity,
      title,
      message,
      timestamp: new Date(),
      tags,
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert:triggered', alert);
    return alert;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.emit('alert:resolved', alert);
    }
  }

  /**
   * Get alert
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.severity === severity);
  }

  /**
   * Clear resolved alerts older than date
   */
  clearOldAlerts(beforeDate: Date): void {
    const toDelete: string[] = [];

    this.alerts.forEach((alert, id) => {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < beforeDate) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => this.alerts.delete(id));
  }
}

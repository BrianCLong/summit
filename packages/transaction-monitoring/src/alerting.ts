/**
 * Alert Management and Threshold-Based Alerting
 */

import { Alert, Transaction, AlertStatus, RiskLevel, AlertType } from './types.js';

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  threshold: number;
  condition: string;
  action: string;
}

export interface AlertStatistics {
  total: number;
  byStatus: Record<AlertStatus, number>;
  bySeverity: Record<RiskLevel, number>;
  byType: Record<AlertType, number>;
  avgResolutionTime?: number;
  falsePositiveRate?: number;
}

export class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private rules: AlertRule[] = [];

  constructor(rules: AlertRule[] = []) {
    this.rules = rules;
  }

  /**
   * Create a new alert
   */
  createAlert(alert: Alert): Alert {
    this.alerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Get an alert by ID
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
   * Get alerts by status
   */
  getAlertsByStatus(status: AlertStatus): Alert[] {
    return this.getAllAlerts().filter(a => a.status === status);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: RiskLevel): Alert[] {
    return this.getAllAlerts().filter(a => a.severity === severity);
  }

  /**
   * Get alerts for a transaction
   */
  getAlertsForTransaction(transactionId: string): Alert[] {
    return this.getAllAlerts().filter(a => a.transaction.id === transactionId);
  }

  /**
   * Update alert status
   */
  updateAlertStatus(alertId: string, status: AlertStatus, note?: string): Alert | undefined {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.status = status;
    if (note) {
      alert.notes = alert.notes || [];
      alert.notes.push(`${new Date().toISOString()}: ${note}`);
    }

    return alert;
  }

  /**
   * Assign alert to an analyst
   */
  assignAlert(alertId: string, assignee: string): Alert | undefined {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.assignee = assignee;
    alert.status = AlertStatus.ASSIGNED;
    alert.notes = alert.notes || [];
    alert.notes.push(`${new Date().toISOString()}: Assigned to ${assignee}`);

    return alert;
  }

  /**
   * Escalate an alert
   */
  escalateAlert(alertId: string, reason: string): Alert | undefined {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.status = AlertStatus.ESCALATED;
    alert.severity = this.increaseSeverity(alert.severity);
    alert.notes = alert.notes || [];
    alert.notes.push(`${new Date().toISOString()}: Escalated - ${reason}`);

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolution: string, isFalsePositive: boolean = false): Alert | undefined {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.status = isFalsePositive ? AlertStatus.FALSE_POSITIVE : AlertStatus.RESOLVED;
    alert.notes = alert.notes || [];
    alert.notes.push(`${new Date().toISOString()}: Resolved - ${resolution}`);

    return alert;
  }

  /**
   * Add note to alert
   */
  addNote(alertId: string, note: string): Alert | undefined {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    alert.notes = alert.notes || [];
    alert.notes.push(`${new Date().toISOString()}: ${note}`);

    return alert;
  }

  /**
   * Get alert statistics
   */
  getStatistics(): AlertStatistics {
    const alerts = this.getAllAlerts();

    const byStatus: Record<AlertStatus, number> = {
      [AlertStatus.NEW]: 0,
      [AlertStatus.ASSIGNED]: 0,
      [AlertStatus.INVESTIGATING]: 0,
      [AlertStatus.ESCALATED]: 0,
      [AlertStatus.RESOLVED]: 0,
      [AlertStatus.FALSE_POSITIVE]: 0,
    };

    const bySeverity: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.CRITICAL]: 0,
    };

    const byType: Record<AlertType, number> = {
      [AlertType.THRESHOLD_BREACH]: 0,
      [AlertType.VELOCITY_ANOMALY]: 0,
      [AlertType.PATTERN_MATCH]: 0,
      [AlertType.GEOGRAPHIC_RISK]: 0,
      [AlertType.BEHAVIORAL_ANOMALY]: 0,
      [AlertType.SANCTIONS_MATCH]: 0,
      [AlertType.PEP_MATCH]: 0,
      [AlertType.FRAUD_INDICATOR]: 0,
    };

    alerts.forEach(alert => {
      byStatus[alert.status]++;
      bySeverity[alert.severity]++;
      byType[alert.type]++;
    });

    const resolved = byStatus[AlertStatus.RESOLVED] + byStatus[AlertStatus.FALSE_POSITIVE];
    const falsePositiveRate = resolved > 0
      ? byStatus[AlertStatus.FALSE_POSITIVE] / resolved
      : 0;

    return {
      total: alerts.length,
      byStatus,
      bySeverity,
      byType,
      falsePositiveRate,
    };
  }

  /**
   * Get high-priority alerts for triage
   */
  getHighPriorityAlerts(): Alert[] {
    return this.getAllAlerts()
      .filter(a =>
        a.status === AlertStatus.NEW &&
        (a.severity === RiskLevel.HIGH || a.severity === RiskLevel.CRITICAL)
      )
      .sort((a, b) => {
        // Sort by severity first, then by score
        if (a.severity !== b.severity) {
          return this.severityToNumber(b.severity) - this.severityToNumber(a.severity);
        }
        return b.score - a.score;
      });
  }

  /**
   * Get alerts requiring attention
   */
  getAlertsRequiringAttention(): Alert[] {
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    return this.getAllAlerts().filter(a =>
      (a.status === AlertStatus.NEW || a.status === AlertStatus.ASSIGNED) &&
      a.timestamp < fourHoursAgo &&
      (a.severity === RiskLevel.HIGH || a.severity === RiskLevel.CRITICAL)
    );
  }

  /**
   * Bulk assign alerts
   */
  bulkAssign(alertIds: string[], assignee: string): Alert[] {
    return alertIds
      .map(id => this.assignAlert(id, assignee))
      .filter((a): a is Alert => a !== undefined);
  }

  /**
   * Bulk resolve alerts
   */
  bulkResolve(alertIds: string[], resolution: string, isFalsePositive: boolean = false): Alert[] {
    return alertIds
      .map(id => this.resolveAlert(id, resolution, isFalsePositive))
      .filter((a): a is Alert => a !== undefined);
  }

  /**
   * Search alerts
   */
  searchAlerts(criteria: Partial<Alert>): Alert[] {
    return this.getAllAlerts().filter(alert => {
      for (const [key, value] of Object.entries(criteria)) {
        if (key in alert && (alert as any)[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get alerts in date range
   */
  getAlertsInRange(startDate: Date, endDate: Date): Alert[] {
    return this.getAllAlerts().filter(a =>
      a.timestamp >= startDate && a.timestamp <= endDate
    );
  }

  /**
   * Increase severity level
   */
  private increaseSeverity(current: RiskLevel): RiskLevel {
    switch (current) {
      case RiskLevel.LOW:
        return RiskLevel.MEDIUM;
      case RiskLevel.MEDIUM:
        return RiskLevel.HIGH;
      case RiskLevel.HIGH:
      case RiskLevel.CRITICAL:
        return RiskLevel.CRITICAL;
    }
  }

  /**
   * Convert severity to number for sorting
   */
  private severityToNumber(severity: RiskLevel): number {
    switch (severity) {
      case RiskLevel.CRITICAL: return 4;
      case RiskLevel.HIGH: return 3;
      case RiskLevel.MEDIUM: return 2;
      case RiskLevel.LOW: return 1;
    }
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  /**
   * Get all rules
   */
  getRules(): AlertRule[] {
    return [...this.rules];
  }

  /**
   * Clear all alerts (use with caution)
   */
  clearAlerts(): void {
    this.alerts.clear();
  }
}

/**
 * Alert notification system
 */
export class AlertNotifier {
  private handlers: Map<RiskLevel, ((alert: Alert) => Promise<void>)[]> = new Map();

  /**
   * Register a notification handler for a severity level
   */
  onAlert(severity: RiskLevel, handler: (alert: Alert) => Promise<void>): void {
    if (!this.handlers.has(severity)) {
      this.handlers.set(severity, []);
    }
    this.handlers.get(severity)!.push(handler);
  }

  /**
   * Notify all registered handlers about an alert
   */
  async notifyAlert(alert: Alert): Promise<void> {
    const handlers = this.handlers.get(alert.severity) || [];
    await Promise.all(handlers.map(h => h(alert)));
  }

  /**
   * Notify multiple alerts
   */
  async notifyAlerts(alerts: Alert[]): Promise<void> {
    await Promise.all(alerts.map(a => this.notifyAlert(a)));
  }
}

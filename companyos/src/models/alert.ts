/**
 * Alert Model
 * Represents alerts from monitoring systems tracked in CompanyOS
 */

export enum AlertSource {
  PROMETHEUS = 'prometheus',
  ALERTMANAGER = 'alertmanager',
  GRAFANA = 'grafana',
  CUSTOM = 'custom',
  GITHUB_ACTIONS = 'github_actions',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  FIRING = 'firing',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SILENCED = 'silenced',
}

export interface Alert {
  id: string;
  alertName: string;
  alertSource: AlertSource;
  severity: AlertSeverity;
  status: AlertStatus;
  serviceName?: string;
  summary: string;
  description?: string;
  labels?: Record<string, any>;
  annotations?: Record<string, any>;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  incidentId?: string;
  sloViolationId?: string;
  runbookUrl?: string;
  dashboardUrl?: string;
  fingerprint?: string;
  groupKey?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAlertInput {
  alertName: string;
  alertSource: AlertSource;
  severity: AlertSeverity;
  serviceName?: string;
  summary: string;
  description?: string;
  labels?: Record<string, any>;
  annotations?: Record<string, any>;
  runbookUrl?: string;
  dashboardUrl?: string;
  fingerprint?: string;
  groupKey?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAlertInput {
  status?: AlertStatus;
  acknowledgedBy?: string;
  incidentId?: string;
  metadata?: Record<string, any>;
}

export interface AlertFilter {
  alertName?: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  serviceName?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface AlertMetrics {
  alertName: string;
  serviceName?: string;
  severity: AlertSeverity;
  fireCount: number;
  resolvedCount: number;
  avgTimeToAcknowledgeMinutes?: number;
  avgTimeToResolveMinutes?: number;
  lastFiredAt?: Date;
}

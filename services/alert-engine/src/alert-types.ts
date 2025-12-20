export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum AlertStatus {
  TRIGGERED = 'triggered',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  timestamp: number;
  metadata: Record<string, any>;
  tags: string[];
  deduplicationKey?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  condition: (event: any) => boolean;
  severity: AlertSeverity;
  enabled: boolean;
  notificationChannels: string[];
  suppressionRules?: SuppressionRule[];
  escalationPolicy?: EscalationPolicy;
}

export interface SuppressionRule {
  type: 'time_based' | 'count_based' | 'duplicate';
  windowMs?: number;
  maxAlerts?: number;
  deduplicationKey?: (alert: Alert) => string;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  delayMs: number;
  channels: string[];
  condition?: (alert: Alert) => boolean;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'pagerduty' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

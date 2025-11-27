/**
 * Alert type definitions for deepfake detection
 */

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  DISMISSED = 'DISMISSED',
}

export enum NotificationChannel {
  UI = 'UI',
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK',
  SLACK = 'SLACK',
  SMS = 'SMS',
}

export interface DeepfakeAlert {
  id: string;
  detectionId: string;
  
  // Alert details
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  context?: Record<string, unknown>;
  
  // Assignment
  assignedTo?: string;
  assignedAt?: Date;
  
  // Resolution
  resolvedAt?: Date;
  resolutionNotes?: string;
  resolvedBy?: string;
  
  // Notifications
  notifiedChannels?: NotificationChannel[];
  notificationSentAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  
  // Conditions
  minConfidence: number; // 0.0 to 1.0
  detectorTypes?: string[]; // Only trigger for specific detectors
  mediaTypes?: string[]; // Only trigger for specific media types
  investigationIds?: string[]; // Only trigger for specific investigations
  
  // Actions
  severity: AlertSeverity;
  notifyChannels: NotificationChannel[];
  assignToUserId?: string;
  autoAcknowledge?: boolean;
  
  // Metadata
  enabled: boolean;
  priority: number; // For rule ordering
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertNotification {
  alertId: string;
  channel: NotificationChannel;
  recipient: string; // email, webhook URL, user ID, etc.
  subject?: string;
  message: string;
  metadata?: Record<string, unknown>;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export interface AlertSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<AlertStatus, number>;
  openCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  falsePositiveCount: number;
  avgTimeToResolution?: number; // milliseconds
  oldestOpen?: Date;
}

export interface AlertFilter {
  status?: AlertStatus | AlertStatus[];
  severity?: AlertSeverity | AlertSeverity[];
  assignedToMe?: boolean;
  assignedTo?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  investigationId?: string;
  detectionId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'severity' | 'status';
  sortOrder?: 'asc' | 'desc';
}

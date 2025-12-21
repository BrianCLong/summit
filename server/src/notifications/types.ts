
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

export interface NotificationPayload {
  userId: string;
  type: string; // e.g., 'welcome', 'alert', 'system_update'
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  subject?: string;
  message?: string; // Raw message if no template
  templateId?: string;
  data?: Record<string, any>; // Variables for template
  tenantId?: string; // Added for compatibility
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

export enum DigestFrequency {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export interface UserPreferences {
  userId: string;
  channels: {
    [key in NotificationChannel]?: boolean;
  };
  digestFrequency?: DigestFrequency;
}

// --- New Types ---

export enum NotificationType {
  MENTION = 'MENTION',
  EXPORT_READY = 'EXPORT_READY',
  ACCESS_REVIEW = 'ACCESS_REVIEW',
  SYSTEM = 'SYSTEM',
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType | string;
  payload: {
      subject?: string;
      message?: string;
      data?: Record<string, any>;
      targetUrl?: string;
  };
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPreference {
  userId: string;
  tenantId: string;
  type: NotificationType | string;
  enabled: boolean;
}

export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: NotificationType | string;
  payload: {
      subject?: string;
      message?: string;
      data?: Record<string, any>;
      targetUrl?: string;
  };
}

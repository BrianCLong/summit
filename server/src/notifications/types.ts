
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

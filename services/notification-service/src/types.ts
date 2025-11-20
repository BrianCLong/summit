import { z } from 'zod';

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  PUSH = 'push'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

export const NotificationTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  channels: z.array(z.nativeEnum(NotificationChannel)),
  subject: z.string().optional(),
  emailTemplate: z.string().optional(),
  slackTemplate: z.string().optional(),
  inAppTemplate: z.string().optional(),
  smsTemplate: z.string().optional(),
  variables: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date()
});

export const NotificationJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  templateId: z.string(),
  channels: z.array(z.nativeEnum(NotificationChannel)),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
  data: z.record(z.any()),
  status: z.nativeEnum(NotificationStatus).default(NotificationStatus.PENDING),
  scheduledFor: z.date().optional(),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  failedAt: z.date().optional(),
  error: z.string().optional(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date()
});

export const NotificationPreferenceSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  channels: z.record(z.boolean()).default({}),
  types: z.record(z.object({
    enabled: z.boolean(),
    channels: z.array(z.nativeEnum(NotificationChannel))
  })).default({}),
  quietHours: z.object({
    enabled: z.boolean().default(false),
    start: z.string().optional(), // HH:MM format
    end: z.string().optional(),
    timezone: z.string().default('UTC')
  }).optional(),
  digestSettings: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string() // HH:MM format
  }).optional()
});

export const EmailConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean().default(true),
  auth: z.object({
    user: z.string(),
    pass: z.string()
  }),
  from: z.string()
});

export const SlackConfigSchema = z.object({
  token: z.string(),
  defaultChannel: z.string().optional()
});

export const WebhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT']).default('POST'),
  headers: z.record(z.string()).optional(),
  retryOnFailure: z.boolean().default(true)
});

export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;
export type NotificationJob = z.infer<typeof NotificationJobSchema>;
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;
export type EmailConfig = z.infer<typeof EmailConfigSchema>;
export type SlackConfig = z.infer<typeof SlackConfigSchema>;
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface DigestNotification {
  userId: string;
  workspaceId: string;
  notifications: NotificationJob[];
  period: string;
  generatedAt: Date;
}

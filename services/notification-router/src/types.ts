/**
 * Type definitions for the notification router service
 */

import { z } from 'zod';

// ============================================================================
// AUDIT EVENT TYPES
// ============================================================================

export const AuditLevelSchema = z.enum([
  'debug',
  'info',
  'warn',
  'error',
  'critical',
]);
export type AuditLevel = z.infer<typeof AuditLevelSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  sequence_number: z.number().optional(),
  event_type: z.string(),
  level: AuditLevelSchema,
  timestamp: z.string().datetime(),
  user_id: z.string().nullable(),
  user_email: z.string().email().nullable(),
  tenant_id: z.string().nullable(),
  service_id: z.string().nullable(),
  resource_type: z.string().nullable(),
  resource_id: z.string().nullable(),
  action: z.string().nullable(),
  outcome: z.enum(['success', 'failure', 'partial', 'pending']).nullable(),
  old_values: z.record(z.any()).nullable(),
  new_values: z.record(z.any()).nullable(),
  diff_summary: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  geolocation: z.record(z.any()).nullable(),
  compliance_frameworks: z.array(z.string()).nullable(),
  data_classification: z.string().nullable(),
  retention_period_days: z.number().nullable(),
  legal_hold: z.boolean().nullable(),
  duration_ms: z.number().nullable(),
  error_code: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  metadata: z.record(z.any()).nullable(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ============================================================================
// NOTIFICATION SEVERITY
// ============================================================================

export const NotificationSeveritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
  'emergency',
]);
export type NotificationSeverity = z.infer<typeof NotificationSeveritySchema>;

// ============================================================================
// NOTIFICATION CHANNELS
// ============================================================================

export const NotificationChannelSchema = z.enum([
  'websocket',
  'email',
  'slack',
  'webhook',
  'sms',
]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationChannelsConfigSchema = z.object({
  websocket: z.boolean(),
  email: z.boolean(),
  slack: z.boolean(),
  webhook: z.boolean(),
});
export type NotificationChannelsConfig = z.infer<
  typeof NotificationChannelsConfigSchema
>;

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

export const NotificationPreferencesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  tenant_id: z.string(),
  event_types: z.array(z.string()).nullable(),
  severity_threshold: AuditLevelSchema,
  resource_types: z.array(z.string()).nullable(),
  tags: z.array(z.string()).nullable(),
  channels: NotificationChannelsConfigSchema,
  email_address: z.string().email().nullable(),
  email_digest_frequency: z
    .enum(['immediate', 'hourly', 'daily', 'never'])
    .nullable(),
  slack_webhook_url: z.string().url().nullable(),
  slack_channel: z.string().nullable(),
  webhook_url: z.string().url().nullable(),
  webhook_secret: z.string().nullable(),
  max_notifications_per_hour: z.number().int().positive().nullable(),
  quiet_hours_start: z.string().nullable(), // TIME format "HH:MM:SS"
  quiet_hours_end: z.string().nullable(),
  quiet_hours_timezone: z.string().nullable(),
  enabled: z.boolean(),
  last_notified_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type NotificationPreferences = z.infer<
  typeof NotificationPreferencesSchema
>;

// ============================================================================
// NOTIFICATION DELIVERY
// ============================================================================

export const NotificationStatusSchema = z.enum([
  'pending',
  'sent',
  'delivered',
  'failed',
  'throttled',
  'read',
  'acknowledged',
]);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

export const NotificationDeliverySchema = z.object({
  id: z.string().uuid(),
  audit_event_id: z.string().uuid(),
  correlation_id: z.string().nullable(),
  batch_id: z.string().uuid().nullable(),
  user_id: z.string(),
  tenant_id: z.string(),
  channel: NotificationChannelSchema,
  destination: z.string().nullable(),
  notification_severity: NotificationSeveritySchema,
  notification_title: z.string(),
  notification_body: z.string(),
  notification_data: z.record(z.any()).nullable(),
  template_id: z.string().uuid().nullable(),
  status: NotificationStatusSchema,
  error_message: z.string().nullable(),
  error_code: z.string().nullable(),
  retry_count: z.number().int().nonnegative(),
  max_retries: z.number().int().nonnegative(),
  delivery_metadata: z.record(z.any()).nullable(),
  created_at: z.string().datetime(),
  sent_at: z.string().datetime().nullable(),
  delivered_at: z.string().datetime().nullable(),
  read_at: z.string().datetime().nullable(),
  acknowledged_at: z.string().datetime().nullable(),
});
export type NotificationDelivery = z.infer<typeof NotificationDeliverySchema>;

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

export const NotificationTemplateSchema = z.object({
  id: z.string().uuid(),
  template_name: z.string(),
  event_type: z.string(),
  channel: NotificationChannelSchema,
  tenant_id: z.string().nullable(),
  locale: z.string(),
  title_template: z.string(),
  body_template: z.string(),
  subject_template: z.string().nullable(),
  html_template: z.string().nullable(),
  text_template: z.string().nullable(),
  slack_blocks: z.any().nullable(), // JSONB
  webhook_payload_template: z.any().nullable(), // JSONB
  description: z.string().nullable(),
  version: z.number().int(),
  active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;

// ============================================================================
// NOTIFICATION ROUTING
// ============================================================================

export interface NotificationRecipient {
  userId: string;
  tenantId: string;
  preferences: NotificationPreferences;
}

export interface NotificationRouteRequest {
  event: AuditEvent;
  severity: NotificationSeverity;
  recipient: NotificationRecipient;
  channels: NotificationChannel[];
}

export interface NotificationMessage {
  id: string;
  eventId: string;
  userId: string;
  tenantId: string;
  channel: NotificationChannel;
  severity: NotificationSeverity;
  title: string;
  body: string;
  data: Record<string, any>;
  destination?: string;
  templateId?: string;
}

// ============================================================================
// CHANNEL STRATEGY
// ============================================================================

export interface ChannelStrategy {
  channels: NotificationChannel[];
  throttle: 'none' | '1min' | '5min' | '15min';
  batchable: boolean;
  escalation?: boolean;
  bypassQuietHours?: boolean;
  autoAcknowledgeRequired?: boolean;
}

export const SeverityRoutingMap: Record<
  NotificationSeverity,
  ChannelStrategy
> = {
  low: {
    channels: ['websocket'],
    throttle: '15min',
    batchable: true,
  },
  medium: {
    channels: ['websocket', 'email'],
    throttle: '5min',
    batchable: true,
  },
  high: {
    channels: ['websocket', 'email', 'slack'],
    throttle: '1min',
    batchable: false,
  },
  critical: {
    channels: ['websocket', 'email', 'slack', 'webhook'],
    throttle: 'none',
    batchable: false,
    escalation: true,
  },
  emergency: {
    channels: ['websocket', 'email', 'slack', 'webhook', 'sms'],
    throttle: 'none',
    batchable: false,
    bypassQuietHours: true,
    escalation: true,
    autoAcknowledgeRequired: true,
  },
};

// ============================================================================
// THROTTLING
// ============================================================================

export interface ThrottlingConfig {
  maxPerMinute: number;
  maxPerHour: number;
  deduplicationWindow: number; // milliseconds
  batchingWindow: number; // milliseconds
  quietHoursEnabled: boolean;
}

export interface ThrottlingResult {
  shouldDeliver: boolean;
  reason?: string;
  queuedForLater?: boolean;
}

// ============================================================================
// DELIVERY RESULT
// ============================================================================

export interface DeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: Error;
  retryable: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface NotificationRouterConfig {
  databaseUrl: string;
  redisUrl: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  slackBotToken?: string;
  webhookSigningSecret?: string;
  baseUrl: string;
  enableWebSocket: boolean;
  enableEmail: boolean;
  enableSlack: boolean;
  enableWebhook: boolean;
  logLevel: string;
}

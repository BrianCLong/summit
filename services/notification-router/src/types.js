"use strict";
/**
 * Type definitions for the notification router service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeverityRoutingMap = exports.NotificationTemplateSchema = exports.NotificationDeliverySchema = exports.NotificationStatusSchema = exports.NotificationPreferencesSchema = exports.NotificationChannelsConfigSchema = exports.NotificationChannelSchema = exports.NotificationSeveritySchema = exports.AuditEventSchema = exports.AuditLevelSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// AUDIT EVENT TYPES
// ============================================================================
exports.AuditLevelSchema = zod_1.z.enum([
    'debug',
    'info',
    'warn',
    'error',
    'critical',
]);
exports.AuditEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sequence_number: zod_1.z.number().optional(),
    event_type: zod_1.z.string(),
    level: exports.AuditLevelSchema,
    timestamp: zod_1.z.string().datetime(),
    user_id: zod_1.z.string().nullable(),
    user_email: zod_1.z.string().email().nullable(),
    tenant_id: zod_1.z.string().nullable(),
    service_id: zod_1.z.string().nullable(),
    resource_type: zod_1.z.string().nullable(),
    resource_id: zod_1.z.string().nullable(),
    action: zod_1.z.string().nullable(),
    outcome: zod_1.z.enum(['success', 'failure', 'partial', 'pending']).nullable(),
    old_values: zod_1.z.record(zod_1.z.any()).nullable(),
    new_values: zod_1.z.record(zod_1.z.any()).nullable(),
    diff_summary: zod_1.z.string().nullable(),
    ip_address: zod_1.z.string().nullable(),
    user_agent: zod_1.z.string().nullable(),
    geolocation: zod_1.z.record(zod_1.z.any()).nullable(),
    compliance_frameworks: zod_1.z.array(zod_1.z.string()).nullable(),
    data_classification: zod_1.z.string().nullable(),
    retention_period_days: zod_1.z.number().nullable(),
    legal_hold: zod_1.z.boolean().nullable(),
    duration_ms: zod_1.z.number().nullable(),
    error_code: zod_1.z.string().nullable(),
    tags: zod_1.z.array(zod_1.z.string()).nullable(),
    metadata: zod_1.z.record(zod_1.z.any()).nullable(),
});
// ============================================================================
// NOTIFICATION SEVERITY
// ============================================================================
exports.NotificationSeveritySchema = zod_1.z.enum([
    'low',
    'medium',
    'high',
    'critical',
    'emergency',
]);
// ============================================================================
// NOTIFICATION CHANNELS
// ============================================================================
exports.NotificationChannelSchema = zod_1.z.enum([
    'websocket',
    'email',
    'slack',
    'webhook',
    'sms',
]);
exports.NotificationChannelsConfigSchema = zod_1.z.object({
    websocket: zod_1.z.boolean(),
    email: zod_1.z.boolean(),
    slack: zod_1.z.boolean(),
    webhook: zod_1.z.boolean(),
});
// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================
exports.NotificationPreferencesSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    event_types: zod_1.z.array(zod_1.z.string()).nullable(),
    severity_threshold: exports.AuditLevelSchema,
    resource_types: zod_1.z.array(zod_1.z.string()).nullable(),
    tags: zod_1.z.array(zod_1.z.string()).nullable(),
    channels: exports.NotificationChannelsConfigSchema,
    email_address: zod_1.z.string().email().nullable(),
    email_digest_frequency: zod_1.z
        .enum(['immediate', 'hourly', 'daily', 'never'])
        .nullable(),
    slack_webhook_url: zod_1.z.string().url().nullable(),
    slack_channel: zod_1.z.string().nullable(),
    webhook_url: zod_1.z.string().url().nullable(),
    webhook_secret: zod_1.z.string().nullable(),
    max_notifications_per_hour: zod_1.z.number().int().positive().nullable(),
    quiet_hours_start: zod_1.z.string().nullable(), // TIME format "HH:MM:SS"
    quiet_hours_end: zod_1.z.string().nullable(),
    quiet_hours_timezone: zod_1.z.string().nullable(),
    enabled: zod_1.z.boolean(),
    last_notified_at: zod_1.z.string().datetime().nullable(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// ============================================================================
// NOTIFICATION DELIVERY
// ============================================================================
exports.NotificationStatusSchema = zod_1.z.enum([
    'pending',
    'sent',
    'delivered',
    'failed',
    'throttled',
    'read',
    'acknowledged',
]);
exports.NotificationDeliverySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    audit_event_id: zod_1.z.string().uuid(),
    correlation_id: zod_1.z.string().nullable(),
    batch_id: zod_1.z.string().uuid().nullable(),
    user_id: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    channel: exports.NotificationChannelSchema,
    destination: zod_1.z.string().nullable(),
    notification_severity: exports.NotificationSeveritySchema,
    notification_title: zod_1.z.string(),
    notification_body: zod_1.z.string(),
    notification_data: zod_1.z.record(zod_1.z.any()).nullable(),
    template_id: zod_1.z.string().uuid().nullable(),
    status: exports.NotificationStatusSchema,
    error_message: zod_1.z.string().nullable(),
    error_code: zod_1.z.string().nullable(),
    retry_count: zod_1.z.number().int().nonnegative(),
    max_retries: zod_1.z.number().int().nonnegative(),
    delivery_metadata: zod_1.z.record(zod_1.z.any()).nullable(),
    created_at: zod_1.z.string().datetime(),
    sent_at: zod_1.z.string().datetime().nullable(),
    delivered_at: zod_1.z.string().datetime().nullable(),
    read_at: zod_1.z.string().datetime().nullable(),
    acknowledged_at: zod_1.z.string().datetime().nullable(),
});
// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================
exports.NotificationTemplateSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    template_name: zod_1.z.string(),
    event_type: zod_1.z.string(),
    channel: exports.NotificationChannelSchema,
    tenant_id: zod_1.z.string().nullable(),
    locale: zod_1.z.string(),
    title_template: zod_1.z.string(),
    body_template: zod_1.z.string(),
    subject_template: zod_1.z.string().nullable(),
    html_template: zod_1.z.string().nullable(),
    text_template: zod_1.z.string().nullable(),
    slack_blocks: zod_1.z.any().nullable(), // JSONB
    webhook_payload_template: zod_1.z.any().nullable(), // JSONB
    description: zod_1.z.string().nullable(),
    version: zod_1.z.number().int(),
    active: zod_1.z.boolean(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
exports.SeverityRoutingMap = {
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

"use strict";
// @ts-nocheck
/**
 * Notifications & Integrations Hub
 *
 * Central notification system for Summit that:
 * - Provides a canonical event model for all system events
 * - Routes notifications to multiple channels (email, chat, webhooks)
 * - Manages user/role preferences for noise control
 * - Integrates with alerting, pipelines, copilot, and authority systems
 * - Tracks delivery metrics and health
 *
 * @module notifications-hub
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPreferencesStorage = exports.PreferencesManager = exports.TemplateRegistry = exports.AdapterRegistry = exports.InvestigationEventAdapter = exports.AuthorityEventAdapter = exports.CopilotEventAdapter = exports.PipelineEventAdapter = exports.AlertingEventAdapter = exports.WebhookTransforms = exports.WebhookValidator = exports.WebhookReceiver = exports.ChatReceiver = exports.EmailReceiver = exports.BaseReceiver = exports.EventHelpers = exports.EventBuilder = exports.EventStatus = exports.EventSeverity = exports.EventType = exports.NotificationHub = void 0;
exports.createNotificationHub = createNotificationHub;
exports.createAdapterRegistry = createAdapterRegistry;
const NotificationHub_js_1 = require("./NotificationHub.js");
const EventAdapters_js_1 = require("./adapters/EventAdapters.js");
// Core exports
var NotificationHub_js_2 = require("./NotificationHub.js");
Object.defineProperty(exports, "NotificationHub", { enumerable: true, get: function () { return NotificationHub_js_2.NotificationHub; } });
// Event model
var EventSchema_js_1 = require("./events/EventSchema.js");
Object.defineProperty(exports, "EventType", { enumerable: true, get: function () { return EventSchema_js_1.EventType; } });
Object.defineProperty(exports, "EventSeverity", { enumerable: true, get: function () { return EventSchema_js_1.EventSeverity; } });
Object.defineProperty(exports, "EventStatus", { enumerable: true, get: function () { return EventSchema_js_1.EventStatus; } });
Object.defineProperty(exports, "EventBuilder", { enumerable: true, get: function () { return EventSchema_js_1.EventBuilder; } });
Object.defineProperty(exports, "EventHelpers", { enumerable: true, get: function () { return EventSchema_js_1.EventHelpers; } });
// Receivers
var ReceiverInterface_js_1 = require("./receivers/ReceiverInterface.js");
Object.defineProperty(exports, "BaseReceiver", { enumerable: true, get: function () { return ReceiverInterface_js_1.BaseReceiver; } });
var EmailReceiver_js_1 = require("./receivers/EmailReceiver.js");
Object.defineProperty(exports, "EmailReceiver", { enumerable: true, get: function () { return EmailReceiver_js_1.EmailReceiver; } });
var ChatReceiver_js_1 = require("./receivers/ChatReceiver.js");
Object.defineProperty(exports, "ChatReceiver", { enumerable: true, get: function () { return ChatReceiver_js_1.ChatReceiver; } });
var WebhookReceiver_js_1 = require("./receivers/WebhookReceiver.js");
Object.defineProperty(exports, "WebhookReceiver", { enumerable: true, get: function () { return WebhookReceiver_js_1.WebhookReceiver; } });
Object.defineProperty(exports, "WebhookValidator", { enumerable: true, get: function () { return WebhookReceiver_js_1.WebhookValidator; } });
Object.defineProperty(exports, "WebhookTransforms", { enumerable: true, get: function () { return WebhookReceiver_js_1.WebhookTransforms; } });
// Adapters
var EventAdapters_js_2 = require("./adapters/EventAdapters.js");
Object.defineProperty(exports, "AlertingEventAdapter", { enumerable: true, get: function () { return EventAdapters_js_2.AlertingEventAdapter; } });
Object.defineProperty(exports, "PipelineEventAdapter", { enumerable: true, get: function () { return EventAdapters_js_2.PipelineEventAdapter; } });
Object.defineProperty(exports, "CopilotEventAdapter", { enumerable: true, get: function () { return EventAdapters_js_2.CopilotEventAdapter; } });
Object.defineProperty(exports, "AuthorityEventAdapter", { enumerable: true, get: function () { return EventAdapters_js_2.AuthorityEventAdapter; } });
Object.defineProperty(exports, "InvestigationEventAdapter", { enumerable: true, get: function () { return EventAdapters_js_2.InvestigationEventAdapter; } });
Object.defineProperty(exports, "AdapterRegistry", { enumerable: true, get: function () { return EventAdapters_js_2.AdapterRegistry; } });
// Templates
var TemplateRegistry_js_1 = require("./templates/TemplateRegistry.js");
Object.defineProperty(exports, "TemplateRegistry", { enumerable: true, get: function () { return TemplateRegistry_js_1.TemplateRegistry; } });
// Preferences
var PreferencesManager_js_1 = require("./preferences/PreferencesManager.js");
Object.defineProperty(exports, "PreferencesManager", { enumerable: true, get: function () { return PreferencesManager_js_1.PreferencesManager; } });
Object.defineProperty(exports, "InMemoryPreferencesStorage", { enumerable: true, get: function () { return PreferencesManager_js_1.InMemoryPreferencesStorage; } });
/**
 * Factory function to create a fully configured notification hub
 */
async function createNotificationHub(config) {
    const hubConfig = {
        receivers: {
            email: config.email
                ? {
                    enabled: config.email.enabled,
                    config: {
                        from: config.email.from,
                        smtp: config.email.smtp,
                    },
                }
                : undefined,
            chat: config.chat
                ? {
                    enabled: config.chat.enabled,
                    config: {
                        platform: config.chat.platform,
                        credentials: config.chat.credentials,
                    },
                }
                : undefined,
            webhook: config.webhook
                ? {
                    enabled: config.webhook.enabled,
                    config: {
                        signatureSecret: config.webhook.signatureSecret,
                    },
                }
                : undefined,
        },
        routing: {
            rules: [],
            defaultChannels: config.routing?.defaultChannels || ['email'],
        },
        storage: {
            enabled: true,
            retentionDays: 90,
        },
    };
    const hub = new NotificationHub_js_1.NotificationHub(hubConfig);
    await hub.initialize();
    return hub;
}
/**
 * Create adapter registry and initialize all adapters
 */
async function createAdapterRegistry(hub) {
    const registry = new EventAdapters_js_1.AdapterRegistry();
    await registry.initializeAll(hub);
    return registry;
}
/**
 * Example usage:
 *
 * ```typescript
 * import {
 *   createNotificationHub,
 *   createAdapterRegistry,
 *   EventBuilder,
 *   EventType,
 *   EventSeverity,
 *   EventHelpers,
 * } from './notifications-hub.js';
 *
 * // Create and initialize hub
 * const hub = await createNotificationHub({
 *   email: {
 *     enabled: true,
 *     from: { name: 'Summit', email: 'notifications@summit.example.com' },
 *   },
 *   chat: {
 *     enabled: true,
 *     platform: 'slack',
 *     credentials: { webhookUrl: 'https://hooks.slack.com/...' },
 *   },
 *   webhook: {
 *     enabled: true,
 *     signatureSecret: 'your-secret-key',
 *   },
 * });
 *
 * // Initialize adapters
 * const adapters = await createAdapterRegistry(hub);
 *
 * // Get specific adapter
 * const alertingAdapter = adapters.getAdapter('alerting');
 *
 * // Send alert notification
 * await alertingAdapter.handleAlertTriggered({
 *   id: 'alert-123',
 *   name: 'High Error Rate',
 *   severity: 'critical',
 *   message: 'Error rate exceeded 5%',
 *   query: 'rate(errors[5m])',
 *   value: 7.2,
 *   threshold: 5.0,
 *   labels: { service: 'api', environment: 'production' },
 *   tenantId: 'tenant-1',
 *   environment: 'production',
 *   dashboardUrl: 'https://summit.example.com/alerts/123',
 * });
 *
 * // Or create custom event
 * const event = new EventBuilder()
 *   .type(EventType.ALERT_TRIGGERED)
 *   .severity(EventSeverity.CRITICAL)
 *   .actor(EventHelpers.systemActor('Monitoring'))
 *   .subject({
 *     type: 'alert',
 *     id: 'alert-123',
 *     name: 'High Error Rate',
 *     url: 'https://summit.example.com/alerts/123',
 *   })
 *   .context({
 *     tenantId: 'tenant-1',
 *     environment: 'production',
 *   })
 *   .title('Critical: High Error Rate')
 *   .message('Error rate exceeded 5% threshold')
 *   .payload({ errorRate: 7.2, threshold: 5.0 })
 *   .build();
 *
 * await hub.notify(event);
 *
 * // Configure user preferences
 * const prefsManager = new PreferencesManager();
 * await prefsManager.setChannelEnabled('user-123', 'email', true);
 * await prefsManager.setChannelMinSeverity('user-123', 'email', EventSeverity.HIGH);
 * await prefsManager.setQuietHours('user-123', true, '22:00', '08:00', 'America/New_York');
 * ```
 */
exports.default = {
    createNotificationHub,
    createAdapterRegistry,
};

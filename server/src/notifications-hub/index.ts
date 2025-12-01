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

import { NotificationHub } from './NotificationHub.js';
import { AdapterRegistry } from './adapters/EventAdapters.js';

// Core exports
export { NotificationHub, type NotificationHubConfig } from './NotificationHub.js';

// Event model
export {
  EventType,
  EventSeverity,
  EventStatus,
  type CanonicalEvent,
  type EventActor,
  type EventSubject,
  type EventContext,
  EventBuilder,
  EventHelpers,
} from './events/EventSchema.js';

// Receivers
export {
  type IReceiver,
  type ReceiverConfig,
  type DeliveryResult,
  BaseReceiver,
} from './receivers/ReceiverInterface.js';
export { EmailReceiver } from './receivers/EmailReceiver.js';
export { ChatReceiver, type ChatPlatform } from './receivers/ChatReceiver.js';
export {
  WebhookReceiver,
  WebhookValidator,
  WebhookTransforms,
} from './receivers/WebhookReceiver.js';

// Adapters
export {
  type IEventAdapter,
  AlertingEventAdapter,
  PipelineEventAdapter,
  CopilotEventAdapter,
  AuthorityEventAdapter,
  InvestigationEventAdapter,
  AdapterRegistry,
} from './adapters/EventAdapters.js';

// Templates
export { TemplateRegistry, type MessageTemplate } from './templates/TemplateRegistry.js';

// Preferences
export {
  PreferencesManager,
  InMemoryPreferencesStorage,
  type PreferencesStorage,
  type RolePreferences,
} from './preferences/PreferencesManager.js';

/**
 * Factory function to create a fully configured notification hub
 */
export async function createNotificationHub(config: {
  email?: {
    enabled: boolean;
    from: { name: string; email: string };
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      auth?: { user: string; pass: string };
    };
  };
  chat?: {
    enabled: boolean;
    platform: 'slack' | 'teams' | 'discord' | 'mattermost' | 'custom';
    credentials: Record<string, unknown>;
  };
  webhook?: {
    enabled: boolean;
    signatureSecret?: string;
  };
  routing?: {
    defaultChannels?: string[];
  };
}): Promise<NotificationHub> {
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

  const hub = new NotificationHub(hubConfig);
  await hub.initialize();

  return hub;
}

/**
 * Create adapter registry and initialize all adapters
 */
export async function createAdapterRegistry(
  hub: NotificationHub,
): Promise<AdapterRegistry> {
  const registry = new AdapterRegistry();
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
 * } from './notifications-hub';
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

export default {
  createNotificationHub,
  createAdapterRegistry,
};

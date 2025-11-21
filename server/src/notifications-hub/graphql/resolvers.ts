/**
 * GraphQL Resolvers for Notifications Hub
 */

import {
  NotificationHub,
  NotificationPreferences,
} from '../NotificationHub.js';
import {
  EventBuilder,
  EventType,
  EventSeverity,
  EventHelpers,
} from '../events/EventSchema.js';
import { PreferencesManager } from '../preferences/PreferencesManager.js';
import { TemplateRegistry } from '../templates/TemplateRegistry.js';
import { AdapterRegistry } from '../adapters/EventAdapters.js';

// Types for GraphQL context
interface GraphQLContext {
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  notificationHub: NotificationHub;
  preferencesManager: PreferencesManager;
  templateRegistry: TemplateRegistry;
  adapterRegistry: AdapterRegistry;
}

// Map channel names to internal format
const channelMap: Record<string, 'email' | 'chat' | 'webhook'> = {
  EMAIL: 'email',
  CHAT: 'chat',
  WEBHOOK: 'webhook',
};

const severityMap: Record<string, EventSeverity> = {
  CRITICAL: EventSeverity.CRITICAL,
  HIGH: EventSeverity.HIGH,
  MEDIUM: EventSeverity.MEDIUM,
  LOW: EventSeverity.LOW,
  INFO: EventSeverity.INFO,
};

const eventTypeMap: Record<string, EventType> = Object.fromEntries(
  Object.entries(EventType).map(([key, value]) => [key, value])
);

export const notificationsResolvers = {
  Query: {
    /**
     * Get notification preferences for a user
     */
    notificationPreferences: async (
      _parent: unknown,
      args: { userId?: string },
      context: GraphQLContext
    ) => {
      const userId = args.userId || context.user?.id;
      if (!userId) {
        throw new Error('User ID required');
      }

      const prefs = await context.preferencesManager.getEffectivePreferences(userId);
      return formatPreferencesForGraphQL(prefs);
    },

    /**
     * Get notification job by ID
     */
    notificationJob: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => {
      const job = context.notificationHub.getJob(args.id);
      return job ? formatJobForGraphQL(job) : null;
    },

    /**
     * Get recent notification jobs
     */
    notificationJobs: async (
      _parent: unknown,
      args: { limit?: number; offset?: number; status?: string },
      context: GraphQLContext
    ) => {
      // This would need to be implemented with proper storage
      // For now, return empty array as jobs are in-memory
      return [];
    },

    /**
     * Get notification metrics
     */
    notificationMetrics: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) => {
      return context.notificationHub.getMetrics();
    },

    /**
     * Get health status
     */
    notificationHealth: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) => {
      const receiverHealth = await context.notificationHub.healthCheck();
      const adapterHealth = await context.adapterRegistry.healthCheckAll();

      const allReceiversHealthy = Object.values(receiverHealth).every(Boolean);
      const allAdaptersHealthy = Object.values(adapterHealth).every(Boolean);

      return {
        receivers: receiverHealth,
        adapters: adapterHealth,
        healthy: allReceiversHealthy && allAdaptersHealthy,
      };
    },

    /**
     * List available templates
     */
    notificationTemplates: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) => {
      return context.templateRegistry.listTemplates();
    },

    /**
     * Get template for event type
     */
    notificationTemplate: async (
      _parent: unknown,
      args: { eventType: string },
      context: GraphQLContext
    ) => {
      const eventType = eventTypeMap[args.eventType];
      if (!eventType) return null;

      return context.templateRegistry.getTemplate(eventType);
    },
  },

  Mutation: {
    /**
     * Update notification preferences
     */
    updateNotificationPreferences: async (
      _parent: unknown,
      args: { input: any },
      context: GraphQLContext
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('Authentication required');
      }

      const preferences = parsePreferencesInput(args.input, userId);
      const updated = await context.preferencesManager.setUserPreferences(
        userId,
        preferences
      );

      return formatPreferencesForGraphQL(updated);
    },

    /**
     * Enable or disable a channel
     */
    setNotificationChannel: async (
      _parent: unknown,
      args: { channel: string; enabled: boolean },
      context: GraphQLContext
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('Authentication required');
      }

      const channel = channelMap[args.channel];
      if (!channel) {
        throw new Error(`Invalid channel: ${args.channel}`);
      }

      await context.preferencesManager.setChannelEnabled(userId, channel, args.enabled);
      const prefs = await context.preferencesManager.getEffectivePreferences(userId);
      return formatPreferencesForGraphQL(prefs);
    },

    /**
     * Set minimum severity for channel
     */
    setChannelMinSeverity: async (
      _parent: unknown,
      args: { channel: string; severity: string },
      context: GraphQLContext
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('Authentication required');
      }

      const channel = channelMap[args.channel];
      const severity = severityMap[args.severity];

      if (!channel) {
        throw new Error(`Invalid channel: ${args.channel}`);
      }
      if (!severity) {
        throw new Error(`Invalid severity: ${args.severity}`);
      }

      await context.preferencesManager.setChannelMinSeverity(userId, channel, severity);
      const prefs = await context.preferencesManager.getEffectivePreferences(userId);
      return formatPreferencesForGraphQL(prefs);
    },

    /**
     * Configure quiet hours
     */
    setQuietHours: async (
      _parent: unknown,
      args: { enabled: boolean; start?: string; end?: string; timezone?: string },
      context: GraphQLContext
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('Authentication required');
      }

      await context.preferencesManager.setQuietHours(
        userId,
        args.enabled,
        args.start || '22:00',
        args.end || '08:00',
        args.timezone || 'UTC'
      );

      const prefs = await context.preferencesManager.getEffectivePreferences(userId);
      return formatPreferencesForGraphQL(prefs);
    },

    /**
     * Exclude event type
     */
    excludeEventType: async (
      _parent: unknown,
      args: { eventType: string },
      context: GraphQLContext
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('Authentication required');
      }

      const eventType = eventTypeMap[args.eventType];
      if (!eventType) {
        throw new Error(`Invalid event type: ${args.eventType}`);
      }

      await context.preferencesManager.excludeEventType(userId, eventType);
      const prefs = await context.preferencesManager.getEffectivePreferences(userId);
      return formatPreferencesForGraphQL(prefs);
    },

    /**
     * Include event type
     */
    includeEventType: async (
      _parent: unknown,
      args: { eventType: string },
      context: GraphQLContext
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('Authentication required');
      }

      const eventType = eventTypeMap[args.eventType];
      if (!eventType) {
        throw new Error(`Invalid event type: ${args.eventType}`);
      }

      await context.preferencesManager.includeEventType(userId, eventType);
      const prefs = await context.preferencesManager.getEffectivePreferences(userId);
      return formatPreferencesForGraphQL(prefs);
    },

    /**
     * Reset preferences to defaults
     */
    resetNotificationPreferences: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('Authentication required');
      }

      const prefs = await context.preferencesManager.resetUserPreferences(userId);
      return formatPreferencesForGraphQL(prefs);
    },

    /**
     * Send a test notification
     */
    sendTestNotification: async (
      _parent: unknown,
      args: { input: any },
      context: GraphQLContext
    ) => {
      const userId = context.user?.id;
      if (!userId) {
        throw new Error('Authentication required');
      }

      try {
        const eventType = eventTypeMap[args.input.eventType] || EventType.ALERT_TRIGGERED;
        const severity = severityMap[args.input.severity] || EventSeverity.MEDIUM;

        const event = new EventBuilder()
          .type(eventType)
          .severity(severity)
          .actor(EventHelpers.userActor(userId, context.user?.name || 'User', context.user?.email))
          .subject({
            type: 'test',
            id: `test-${Date.now()}`,
            name: args.input.title,
          })
          .context({
            tenantId: 'test-tenant',
          })
          .title(args.input.title)
          .message(args.input.message)
          .payload({ test: true })
          .source('test-notification')
          .build();

        const job = await context.notificationHub.notify(event);

        return {
          success: job.status === 'completed',
          jobId: job.id,
          error: job.error,
        };
      } catch (error) {
        return {
          success: false,
          jobId: null,
          error: (error as Error).message,
        };
      }
    },
  },

  Subscription: {
    notificationReceived: {
      subscribe: (_parent: unknown, _args: unknown, context: GraphQLContext) => {
        // This would use GraphQL subscriptions with WebSocket
        // Implementation depends on your GraphQL server setup (Apollo, etc.)
        throw new Error('Subscriptions not yet implemented - use WebSocket API');
      },
    },

    notificationJobUpdated: {
      subscribe: (_parent: unknown, args: { jobId: string }, context: GraphQLContext) => {
        throw new Error('Subscriptions not yet implemented - use WebSocket API');
      },
    },
  },
};

// Helper functions

function formatPreferencesForGraphQL(prefs: NotificationPreferences): any {
  return {
    userId: prefs.userId,
    email: prefs.channels.email,
    chat: prefs.channels.chat,
    webhook: prefs.channels.webhook,
    quietHours: prefs.quietHours,
    severityThresholds: prefs.severityThresholds,
    eventTypeFilters: prefs.eventTypeFilters,
  };
}

function formatJobForGraphQL(job: any): any {
  return {
    id: job.id,
    event: {
      id: job.event.id,
      type: job.event.type.toUpperCase().replace(/\./g, '_'),
      severity: job.event.severity.toUpperCase(),
      status: job.event.status.toUpperCase(),
      actor: job.event.actor,
      subject: job.event.subject,
      context: job.event.context,
      title: job.event.title,
      message: job.event.message,
      payload: job.event.payload,
      timestamp: job.event.timestamp,
      expiresAt: job.event.expiresAt,
    },
    status: job.status.toUpperCase(),
    results: job.results?.map((r: any) => ({
      recipientId: r.recipientId,
      channel: r.channel.toUpperCase(),
      success: r.success,
      messageId: r.messageId,
      error: r.error,
      deliveredAt: r.deliveredAt,
    })),
    createdAt: job.createdAt,
    processedAt: job.processedAt,
    error: job.error,
  };
}

function parsePreferencesInput(input: any, userId: string): Partial<NotificationPreferences> {
  const prefs: Partial<NotificationPreferences> = { userId };

  if (input.email || input.chat || input.webhook) {
    prefs.channels = {};

    if (input.email) {
      prefs.channels.email = {
        enabled: input.email.enabled,
        minSeverity: input.email.minSeverity ? severityMap[input.email.minSeverity] : undefined,
        eventTypes: input.email.eventTypes?.map((t: string) => eventTypeMap[t]),
        batchingEnabled: input.email.batchingEnabled,
        batchingWindowMinutes: input.email.batchingWindowMinutes,
      };
    }

    if (input.chat) {
      prefs.channels.chat = {
        enabled: input.chat.enabled,
        minSeverity: input.chat.minSeverity ? severityMap[input.chat.minSeverity] : undefined,
        eventTypes: input.chat.eventTypes?.map((t: string) => eventTypeMap[t]),
        batchingEnabled: input.chat.batchingEnabled,
        batchingWindowMinutes: input.chat.batchingWindowMinutes,
      };
    }

    if (input.webhook) {
      prefs.channels.webhook = {
        enabled: input.webhook.enabled,
      };
    }
  }

  if (input.quietHours) {
    prefs.quietHours = {
      enabled: input.quietHours.enabled,
      start: input.quietHours.start || '22:00',
      end: input.quietHours.end || '08:00',
      timezone: input.quietHours.timezone || 'UTC',
    };
  }

  if (input.severityThresholds) {
    prefs.severityThresholds = input.severityThresholds;
  }

  if (input.eventTypeFilters) {
    prefs.eventTypeFilters = {
      include: input.eventTypeFilters.include?.map((t: string) => eventTypeMap[t]),
      exclude: input.eventTypeFilters.exclude?.map((t: string) => eventTypeMap[t]),
    };
  }

  return prefs;
}

/**
 * Factory function to create context for GraphQL resolvers
 */
export function createNotificationsContext(
  hub: NotificationHub,
  prefsManager: PreferencesManager,
  templateRegistry: TemplateRegistry,
  adapterRegistry: AdapterRegistry
) {
  return {
    notificationHub: hub,
    preferencesManager: prefsManager,
    templateRegistry,
    adapterRegistry,
  };
}

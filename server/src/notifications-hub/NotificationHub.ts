/**
 * Notification Hub - Core Service
 *
 * Central orchestration service that:
 * 1. Receives canonical events from various sources
 * 2. Determines recipients based on routing rules and preferences
 * 3. Dispatches notifications to appropriate receivers (email, chat, webhooks)
 * 4. Tracks delivery status and metrics
 * 5. Manages user/role preferences for noise control
 */

import EventEmitter from 'events';
import {
  CanonicalEvent,
  EventType,
  EventSeverity,
  EventStatus,
} from './events/EventSchema.js';
import { IReceiver } from './receivers/ReceiverInterface.js';
import { EmailReceiver } from './receivers/EmailReceiver.js';
import { ChatReceiver } from './receivers/ChatReceiver.js';
import { WebhookReceiver } from './receivers/WebhookReceiver.js';

export interface NotificationHubConfig {
  receivers: {
    email?: {
      enabled: boolean;
      config: Record<string, unknown>;
    };
    chat?: {
      enabled: boolean;
      config: Record<string, unknown>;
    };
    webhook?: {
      enabled: boolean;
      config: Record<string, unknown>;
    };
  };
  routing?: RoutingConfig;
  storage?: {
    enabled: boolean;
    retentionDays: number;
  };
}

export interface RoutingConfig {
  rules: RoutingRule[];
  defaultChannels: string[];
}

export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains';
  value: unknown;
}

export interface RuleAction {
  type: 'notify' | 'suppress' | 'escalate';
  channels?: string[];
  recipients?: RecipientSpec[];
  delay?: number;
}

export interface RecipientSpec {
  type: 'user' | 'role' | 'team' | 'email' | 'channel' | 'webhook';
  id: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    email?: ChannelPreference;
    chat?: ChannelPreference;
    webhook?: ChannelPreference;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
    timezone: string;
  };
  severityThresholds?: {
    [key: string]: EventSeverity;
  };
  eventTypeFilters?: {
    include?: EventType[];
    exclude?: EventType[];
  };
}

export interface ChannelPreference {
  enabled: boolean;
  minSeverity?: EventSeverity;
  eventTypes?: EventType[];
  batchingEnabled?: boolean;
  batchingWindowMinutes?: number;
}

export interface NotificationJob {
  id: string;
  event: CanonicalEvent;
  recipients: ResolvedRecipient[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  results?: NotificationResult[];
  error?: string;
}

export interface ResolvedRecipient {
  id: string;
  type: 'user' | 'email' | 'channel' | 'webhook';
  channels: string[];
  address: string;
  preferences?: NotificationPreferences;
}

export interface NotificationResult {
  recipientId: string;
  channel: string;
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

export interface NotificationMetrics {
  totalEvents: number;
  totalNotifications: number;
  totalDelivered: number;
  totalFailed: number;
  byChannel: Record<string, { sent: number; delivered: number; failed: number }>;
  bySeverity: Record<string, number>;
  byEventType: Record<string, number>;
  averageLatencyMs: number;
}

export class NotificationHub extends EventEmitter {
  private config: NotificationHubConfig;
  private receivers: Map<string, IReceiver>;
  private preferences: Map<string, NotificationPreferences>;
  private jobs: Map<string, NotificationJob>;
  private metrics: NotificationMetrics;
  private routingRules: RoutingRule[];
  private initialized: boolean = false;

  constructor(config: NotificationHubConfig) {
    super();
    this.config = config;
    this.receivers = new Map();
    this.preferences = new Map();
    this.jobs = new Map();
    this.routingRules = config.routing?.rules || [];

    this.metrics = {
      totalEvents: 0,
      totalNotifications: 0,
      totalDelivered: 0,
      totalFailed: 0,
      byChannel: {},
      bySeverity: {},
      byEventType: {},
      averageLatencyMs: 0,
    };
  }

  /**
   * Initialize the notification hub and all receivers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('NotificationHub already initialized');
    }

    // Initialize receivers
    if (this.config.receivers.email?.enabled) {
      const emailReceiver = new EmailReceiver();
      await emailReceiver.initialize({
        enabled: true,
        name: 'Email',
        ...this.config.receivers.email.config,
      } as any);
      this.receivers.set('email', emailReceiver);
    }

    if (this.config.receivers.chat?.enabled) {
      const chatReceiver = new ChatReceiver();
      await chatReceiver.initialize({
        enabled: true,
        name: 'Chat',
        ...this.config.receivers.chat.config,
      } as any);
      this.receivers.set('chat', chatReceiver);
    }

    if (this.config.receivers.webhook?.enabled) {
      const webhookReceiver = new WebhookReceiver();
      await webhookReceiver.initialize({
        enabled: true,
        name: 'Webhook',
        ...this.config.receivers.webhook.config,
      } as any);
      this.receivers.set('webhook', webhookReceiver);
    }

    // Sort routing rules by priority
    this.routingRules.sort((a, b) => b.priority - a.priority);

    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Process an event and send notifications
   */
  async notify(event: CanonicalEvent): Promise<NotificationJob> {
    if (!this.initialized) {
      throw new Error('NotificationHub not initialized');
    }

    this.metrics.totalEvents++;
    this.incrementMetric('byEventType', event.type);
    this.incrementMetric('bySeverity', event.severity);

    // Create notification job
    const job: NotificationJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      recipients: [],
      status: 'pending',
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);

    try {
      // Update event status
      event.status = EventStatus.PROCESSING;

      // Determine recipients based on routing rules
      const recipients = await this.resolveRecipients(event);
      job.recipients = recipients;

      // Filter recipients based on preferences
      const filteredRecipients = await this.filterByPreferences(event, recipients);

      if (filteredRecipients.length === 0) {
        job.status = 'completed';
        job.processedAt = new Date();
        event.status = EventStatus.DELIVERED;
        this.emit('notification:completed', job);
        return job;
      }

      // Dispatch to receivers
      job.status = 'processing';
      const startTime = Date.now();

      const results = await this.dispatchToReceivers(event, filteredRecipients);
      job.results = results;

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateAverageLatency(latency);

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      this.metrics.totalNotifications += results.length;
      this.metrics.totalDelivered += successCount;
      this.metrics.totalFailed += failureCount;

      // Update job status
      job.status = successCount > 0 ? 'completed' : 'failed';
      job.processedAt = new Date();

      // Update event status
      event.status = successCount > 0 ? EventStatus.DELIVERED : EventStatus.FAILED;

      this.emit('notification:completed', job);
      return job;
    } catch (error) {
      job.status = 'failed';
      job.error = (error as Error).message;
      job.processedAt = new Date();
      event.status = EventStatus.FAILED;

      this.emit('notification:failed', job, error);
      throw error;
    }
  }

  /**
   * Resolve recipients based on routing rules
   */
  private async resolveRecipients(event: CanonicalEvent): Promise<ResolvedRecipient[]> {
    const recipients: ResolvedRecipient[] = [];

    // Apply routing rules
    for (const rule of this.routingRules) {
      if (!rule.enabled) continue;

      const matches = this.evaluateRuleConditions(rule, event);
      if (matches) {
        for (const action of rule.actions) {
          if (action.type === 'notify' && action.recipients) {
            const resolved = await this.resolveRecipientSpecs(
              action.recipients,
              action.channels || [],
            );
            recipients.push(...resolved);
          } else if (action.type === 'suppress') {
            // Mark event as suppressed
            return [];
          }
        }
      }
    }

    // If no routing rules matched, use default channels
    if (recipients.length === 0 && this.config.routing?.defaultChannels) {
      // Add default recipients (would be configured per tenant/project)
      recipients.push({
        id: 'default',
        type: 'channel',
        channels: this.config.routing.defaultChannels,
        address: 'default',
      });
    }

    return recipients;
  }

  /**
   * Evaluate routing rule conditions
   */
  private evaluateRuleConditions(rule: RoutingRule, event: CanonicalEvent): boolean {
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, event)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition, event: CanonicalEvent): boolean {
    const value = this.getFieldValue(event, condition.field);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'greater_than':
        return typeof value === 'number' && value > (condition.value as number);
      case 'less_than':
        return typeof value === 'number' && value < (condition.value as number);
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string);
      default:
        return false;
    }
  }

  /**
   * Get field value from event using dot notation
   */
  private getFieldValue(event: CanonicalEvent, field: string): unknown {
    const parts = field.split('.');
    let value: any = event;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  /**
   * Resolve recipient specs to actual recipients
   */
  private async resolveRecipientSpecs(
    specs: RecipientSpec[],
    channels: string[],
  ): Promise<ResolvedRecipient[]> {
    const recipients: ResolvedRecipient[] = [];

    for (const spec of specs) {
      switch (spec.type) {
        case 'user':
          // Look up user and get their contact info
          const userRecipient = await this.resolveUser(spec.id, channels);
          if (userRecipient) recipients.push(userRecipient);
          break;

        case 'role':
          // Look up all users with this role
          const roleRecipients = await this.resolveRole(spec.id, channels);
          recipients.push(...roleRecipients);
          break;

        case 'team':
          // Look up all users in this team
          const teamRecipients = await this.resolveTeam(spec.id, channels);
          recipients.push(...teamRecipients);
          break;

        case 'email':
          recipients.push({
            id: spec.id,
            type: 'email',
            channels: ['email'],
            address: spec.id,
          });
          break;

        case 'channel':
          recipients.push({
            id: spec.id,
            type: 'channel',
            channels: ['chat'],
            address: spec.id,
          });
          break;

        case 'webhook':
          recipients.push({
            id: spec.id,
            type: 'webhook',
            channels: ['webhook'],
            address: spec.id,
          });
          break;
      }
    }

    return recipients;
  }

  /**
   * Filter recipients based on their preferences
   */
  private async filterByPreferences(
    event: CanonicalEvent,
    recipients: ResolvedRecipient[],
  ): Promise<ResolvedRecipient[]> {
    const filtered: ResolvedRecipient[] = [];

    for (const recipient of recipients) {
      const prefs = await this.getUserPreferences(recipient.id);

      if (!prefs) {
        filtered.push(recipient);
        continue;
      }

      // Check quiet hours
      if (prefs.quietHours?.enabled && this.isQuietHours(prefs.quietHours)) {
        // Skip unless it's critical
        if (event.severity !== EventSeverity.CRITICAL) {
          continue;
        }
      }

      // Check severity threshold
      if (prefs.severityThresholds) {
        const threshold = prefs.severityThresholds[event.type] || EventSeverity.MEDIUM;
        if (!this.meetsSeverityThreshold(event.severity, threshold)) {
          continue;
        }
      }

      // Check event type filters
      if (prefs.eventTypeFilters) {
        if (prefs.eventTypeFilters.exclude?.includes(event.type)) {
          continue;
        }
        if (prefs.eventTypeFilters.include && !prefs.eventTypeFilters.include.includes(event.type)) {
          continue;
        }
      }

      // Filter channels based on preferences
      const enabledChannels = recipient.channels.filter((channel) => {
        const channelPref = prefs.channels[channel as keyof typeof prefs.channels];
        if (!channelPref?.enabled) return false;

        if (channelPref.minSeverity) {
          if (!this.meetsSeverityThreshold(event.severity, channelPref.minSeverity)) {
            return false;
          }
        }

        if (channelPref.eventTypes && !channelPref.eventTypes.includes(event.type)) {
          return false;
        }

        return true;
      });

      if (enabledChannels.length > 0) {
        filtered.push({
          ...recipient,
          channels: enabledChannels,
          preferences: prefs,
        });
      }
    }

    return filtered;
  }

  /**
   * Dispatch notifications to receivers
   */
  private async dispatchToReceivers(
    event: CanonicalEvent,
    recipients: ResolvedRecipient[],
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Group recipients by channel
    const byChannel = new Map<string, ResolvedRecipient[]>();
    for (const recipient of recipients) {
      for (const channel of recipient.channels) {
        if (!byChannel.has(channel)) {
          byChannel.set(channel, []);
        }
        byChannel.get(channel)!.push(recipient);
      }
    }

    // Send to each channel
    for (const [channelName, channelRecipients] of byChannel) {
      const receiver = this.receivers.get(channelName);
      if (!receiver) {
        console.warn(`No receiver configured for channel: ${channelName}`);
        continue;
      }

      const addresses = channelRecipients.map((r) => r.address);
      try {
        const deliveryResults = await receiver.send(event, addresses);

        for (const result of deliveryResults) {
          results.push({
            recipientId: result.recipientId,
            channel: channelName,
            success: result.success,
            messageId: result.messageId,
            error: result.error?.message,
            deliveredAt: result.deliveredAt,
          });

          this.incrementChannelMetric(channelName, 'sent');
          if (result.success) {
            this.incrementChannelMetric(channelName, 'delivered');
          } else {
            this.incrementChannelMetric(channelName, 'failed');
          }
        }
      } catch (error) {
        console.error(`Error sending to channel ${channelName}:`, error);
        for (const recipient of channelRecipients) {
          results.push({
            recipientId: recipient.id,
            channel: channelName,
            success: false,
            error: (error as Error).message,
          });
          this.incrementChannelMetric(channelName, 'failed');
        }
      }
    }

    return results;
  }

  /**
   * User/Role/Team resolution (mock implementations - integrate with actual user service)
   */
  private async resolveUser(
    userId: string,
    channels: string[],
  ): Promise<ResolvedRecipient | null> {
    // Mock implementation - would query user service
    return {
      id: userId,
      type: 'user',
      channels,
      address: `user_${userId}@example.com`,
    };
  }

  private async resolveRole(
    roleId: string,
    channels: string[],
  ): Promise<ResolvedRecipient[]> {
    // Mock implementation - would query user service for users with this role
    return [];
  }

  private async resolveTeam(
    teamId: string,
    channels: string[],
  ): Promise<ResolvedRecipient[]> {
    // Mock implementation - would query user service for team members
    return [];
  }

  /**
   * Preference management
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    return this.preferences.get(userId) || null;
  }

  async setUserPreferences(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<void> {
    this.preferences.set(userId, preferences);
    this.emit('preferences:updated', userId, preferences);
  }

  /**
   * Helper methods
   */
  private isQuietHours(quietHours: NonNullable<NotificationPreferences['quietHours']>): boolean {
    // Implementation would check current time against quiet hours window
    return false;
  }

  private meetsSeverityThreshold(actual: EventSeverity, threshold: EventSeverity): boolean {
    const severityOrder = [
      EventSeverity.INFO,
      EventSeverity.LOW,
      EventSeverity.MEDIUM,
      EventSeverity.HIGH,
      EventSeverity.CRITICAL,
    ];
    const actualIndex = severityOrder.indexOf(actual);
    const thresholdIndex = severityOrder.indexOf(threshold);
    return actualIndex >= thresholdIndex;
  }

  private incrementMetric(category: string, key: string): void {
    const metrics = (this.metrics as any)[category];
    if (metrics) {
      metrics[key] = (metrics[key] || 0) + 1;
    }
  }

  private incrementChannelMetric(channel: string, metric: 'sent' | 'delivered' | 'failed'): void {
    if (!this.metrics.byChannel[channel]) {
      this.metrics.byChannel[channel] = { sent: 0, delivered: 0, failed: 0 };
    }
    this.metrics.byChannel[channel][metric]++;
  }

  private updateAverageLatency(latency: number): void {
    const total = this.metrics.averageLatencyMs * this.metrics.totalNotifications;
    this.metrics.averageLatencyMs =
      (total + latency) / (this.metrics.totalNotifications + 1);
  }

  /**
   * Public API
   */
  getMetrics(): NotificationMetrics {
    return { ...this.metrics };
  }

  getJob(jobId: string): NotificationJob | undefined {
    return this.jobs.get(jobId);
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, receiver] of this.receivers) {
      health[name] = await receiver.healthCheck();
    }

    return health;
  }

  async shutdown(): Promise<void> {
    for (const receiver of this.receivers.values()) {
      await receiver.shutdown();
    }

    this.receivers.clear();
    this.initialized = false;
    this.emit('shutdown');
  }
}

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
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
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
import { SmsReceiver } from './receivers/SmsReceiver.js';
import { PushReceiver } from './receivers/PushReceiver.js';
import {
  RealtimeReceiver,
  RealtimeSessionManager,
} from './receivers/RealtimeReceiver.js';
import { TemplateRenderer, RenderedTemplate } from './templates/TemplateRenderer.js';
import { TemplateRegistry } from './templates/TemplateRegistry.js';

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
    sms?: {
      enabled: boolean;
      config: Record<string, unknown>;
    };
    push?: {
      enabled: boolean;
      config: Record<string, unknown>;
    };
    realtime?: {
      enabled: boolean;
      config: Record<string, unknown>;
    };
  };
  routing?: RoutingConfig;
  storage?: {
    enabled: boolean;
    retentionDays: number;
  };
  templates?: TemplateRegistry;
  rateLimiting?: {
    maxPerMinute?: number;
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
  type:
    | 'user'
    | 'role'
    | 'team'
    | 'email'
    | 'channel'
    | 'webhook'
    | 'sms'
    | 'push'
    | 'realtime';
  id: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    email?: ChannelPreference;
    chat?: ChannelPreference;
    webhook?: ChannelPreference;
    sms?: ChannelPreference;
    push?: ChannelPreference;
    realtime?: ChannelPreference;
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

export interface DeadLetterEntry {
  id: string;
  event: CanonicalEvent;
  recipientId: string;
  recipientAddress: string;
  channel: string;
  error: string;
  attempts: number;
  lastAttemptAt: Date;
}

export interface ResolvedRecipient {
  id: string;
  type: 'user' | 'email' | 'channel' | 'webhook' | 'sms' | 'push' | 'realtime';
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
  recipientAddress?: string;
  metadata?: Record<string, unknown>;
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
  private templateRenderer: TemplateRenderer;
  private batchQueues: Map<
    string,
    {
      events: CanonicalEvent[];
      recipient: ResolvedRecipient;
      channel: string;
      timer: NodeJS.Timeout;
    }
  >;
  private deliveryLog: NotificationResult[];
  private deadLetterQueue: DeadLetterEntry[];
  private rateLimiter: Map<string, { windowStart: number; count: number }>;
  private promRegistry: Registry;
  private promCounters: {
    eventsTotal: Counter<string>;
    notificationsTotal: Counter<string>;
    failuresTotal: Counter<string>;
  };
  private promLatency: Histogram<string>;
  private promDeadLetters: Gauge<string>;

  constructor(config: NotificationHubConfig) {
    super();
    this.config = config;
    this.receivers = new Map();
    this.preferences = new Map();
    this.jobs = new Map();
    this.routingRules = config.routing?.rules || [];
    this.templateRenderer = new TemplateRenderer(config.templates);
    this.batchQueues = new Map();
    this.deliveryLog = [];
    this.deadLetterQueue = [];
    this.rateLimiter = new Map();

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

    this.promRegistry = new Registry();
    collectDefaultMetrics({ register: this.promRegistry });
    this.promCounters = {
      eventsTotal:
        (this.promRegistry.getSingleMetric(
          'notification_events_total',
        ) as Counter<string>) ||
        new Counter({
          name: 'notification_events_total',
          help: 'Total notification events ingested',
          registers: [this.promRegistry],
        }),
      notificationsTotal:
        (this.promRegistry.getSingleMetric(
          'notification_notifications_total',
        ) as Counter<string>) ||
        new Counter({
          name: 'notification_notifications_total',
          help: 'Total notifications attempted',
          labelNames: ['channel', 'status'],
          registers: [this.promRegistry],
        }),
      failuresTotal:
        (this.promRegistry.getSingleMetric(
          'notification_failures_total',
        ) as Counter<string>) ||
        new Counter({
          name: 'notification_failures_total',
          help: 'Total notification failures',
          labelNames: ['channel', 'reason'],
          registers: [this.promRegistry],
        }),
    } as any;
    this.promLatency =
      (this.promRegistry.getSingleMetric('notification_delivery_latency_ms') as Histogram<string>) ||
      new Histogram({
        name: 'notification_delivery_latency_ms',
        help: 'Latency histogram for notifications',
        labelNames: ['channel'],
        buckets: [10, 50, 100, 250, 500, 1000, 5000],
        registers: [this.promRegistry],
      });
    this.promDeadLetters =
      (this.promRegistry.getSingleMetric('notification_dead_letter_gauge') as Gauge<string>) ||
      new Gauge({
        name: 'notification_dead_letter_gauge',
        help: 'Current dead letter queue size',
        registers: [this.promRegistry],
      });
    this.promDeadLetters.set(0);
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

    if (this.config.receivers.sms?.enabled) {
      const smsReceiver = new SmsReceiver();
      await smsReceiver.initialize({
        enabled: true,
        name: 'SMS',
        ...this.config.receivers.sms.config,
      } as any);
      this.receivers.set('sms', smsReceiver);
    }

    if (this.config.receivers.push?.enabled) {
      const pushReceiver = new PushReceiver();
      await pushReceiver.initialize({
        enabled: true,
        name: 'Push',
        ...this.config.receivers.push.config,
      } as any);
      this.receivers.set('push', pushReceiver);
    }

    if (this.config.receivers.realtime?.enabled) {
      const realtimeReceiver = new RealtimeReceiver();
      await realtimeReceiver.initialize({
        enabled: true,
        name: 'Realtime',
        ...this.config.receivers.realtime.config,
      } as any);
      this.receivers.set('realtime', realtimeReceiver);
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
    this.promCounters.eventsTotal.inc();

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
      const renderedTemplate = this.templateRenderer.render(event);

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

      const results = await this.dispatchToReceivers(
        event,
        filteredRecipients,
        renderedTemplate,
      );
      job.results = results;

      // Update metrics
      const latency = Date.now() - startTime;
      const immediateResults = results.filter((r) => !r.metadata?.queued);
      const successCount = immediateResults.filter((r) => r.success).length;
      this.recordDeliveryResults(immediateResults);

      this.updateAverageLatency(latency, immediateResults.length || 1);

      // Update job status
      job.status =
        successCount > 0 || results.some((r) => r.metadata?.queued)
          ? 'completed'
          : 'failed';
      job.processedAt = new Date();

      // Update event status
      if (successCount > 0) {
        event.status = EventStatus.DELIVERED;
      } else if (results.some((r) => r.metadata?.queued)) {
        event.status = EventStatus.PROCESSING;
      } else {
        event.status = EventStatus.FAILED;
      }

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
        case 'sms':
          recipients.push({
            id: spec.id,
            type: 'sms',
            channels: ['sms'],
            address: spec.id,
          });
          break;
        case 'push':
          recipients.push({
            id: spec.id,
            type: 'push',
            channels: ['push'],
            address: spec.id,
          });
          break;
        case 'realtime':
          recipients.push({
            id: spec.id,
            type: 'realtime',
            channels: ['realtime'],
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
    template: RenderedTemplate,
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

      const immediateRecipients: ResolvedRecipient[] = [];
      for (const recipient of channelRecipients) {
        const channelPref =
          recipient.preferences?.channels[
            channelName as keyof NotificationPreferences['channels']
          ];

        if (channelPref?.batchingEnabled) {
          const windowMinutes = channelPref.batchingWindowMinutes || 15;
          this.queueBatch(event, recipient, channelName, windowMinutes);
          results.push({
            recipientId: recipient.id,
            channel: channelName,
            success: true,
            metadata: { queued: true, windowMinutes },
          });
          continue;
        }

        if (this.isRateLimited(recipient.id)) {
          const error = 'Rate limit exceeded for recipient';
          const result: NotificationResult = {
            recipientId: recipient.id,
            recipientAddress: recipient.address,
            channel: channelName,
            success: false,
            error,
            metadata: { rateLimited: true },
          };
          results.push(result);
          this.pushDeadLetter(event, recipient, channelName, error);
          this.incrementChannelMetric(channelName, 'failed');
          continue;
        }

        immediateRecipients.push(recipient);
      }

      if (immediateRecipients.length === 0) {
        continue;
      }

      const addresses = immediateRecipients.map((r) => r.address);
      try {
        const channelStart = Date.now();
        const deliveryResults = await receiver.send(event, addresses, {
          template,
          digest: false,
        });

        deliveryResults.forEach((result, index) => {
          const latencyMs = Date.now() - channelStart;
          const sourceRecipient = immediateRecipients[index];
          results.push({
            recipientId: sourceRecipient?.id || result.recipientId,
            recipientAddress: sourceRecipient?.address,
            channel: channelName,
            success: result.success,
            messageId: result.messageId,
            error: result.error?.message,
            deliveredAt: result.deliveredAt,
            metadata: { ...result.metadata, latencyMs },
          });

          this.incrementChannelMetric(channelName, 'sent');
          if (result.success) {
            this.incrementChannelMetric(channelName, 'delivered');
          } else {
            this.incrementChannelMetric(channelName, 'failed');
            if (sourceRecipient) {
              this.pushDeadLetter(
                event,
                sourceRecipient,
                channelName,
                result.error?.message || 'Unknown delivery failure',
              );
            }
          }
        });
      } catch (error) {
        console.error(`Error sending to channel ${channelName}:`, error);
        for (const recipient of immediateRecipients) {
          results.push({
            recipientId: recipient.id,
            channel: channelName,
            success: false,
            error: (error as Error).message,
          });
          this.incrementChannelMetric(channelName, 'failed');
          this.pushDeadLetter(
            event,
            recipient,
            channelName,
            (error as Error).message,
          );
        }
      }
    }

    return results;
  }

  private queueBatch(
    event: CanonicalEvent,
    recipient: ResolvedRecipient,
    channel: string,
    windowMinutes: number,
  ): void {
    const key = `${recipient.id}:${channel}`;
    const existing = this.batchQueues.get(key);

    if (existing) {
      existing.events.push(event);
      return;
    }

    const timer = setTimeout(() => this.flushBatch(key), windowMinutes * 60 * 1000);
    this.batchQueues.set(key, {
      events: [event],
      recipient,
      channel,
      timer,
    });
  }

  private async flushBatch(key: string): Promise<void> {
    const batch = this.batchQueues.get(key);
    if (!batch) return;

    clearTimeout(batch.timer);
    this.batchQueues.delete(key);

    const digest = this.templateRenderer.renderDigest(
      batch.events,
      batch.recipient.id,
      batch.channel,
    );

    await this.dispatchBatch(batch.recipient, batch.channel, digest.event, digest.template);
  }

  private async dispatchBatch(
    recipient: ResolvedRecipient,
    channel: string,
    event: CanonicalEvent,
    template: RenderedTemplate,
  ): Promise<void> {
    const receiver = this.receivers.get(channel);
    if (!receiver) {
      console.warn(`No receiver configured for channel: ${channel}`);
      return;
    }

    try {
      const channelStart = Date.now();
      const deliveryResults = await receiver.send(event, [recipient.address], {
        template,
        digest: true,
      });

      const results = deliveryResults.map((result) => ({
        recipientId: recipient.id,
        recipientAddress: recipient.address,
        channel,
        success: result.success,
        messageId: result.messageId,
        error: result.error?.message,
        deliveredAt: result.deliveredAt,
        metadata: { ...result.metadata, latencyMs: Date.now() - channelStart },
      }));

      for (const result of results) {
        if (!result.success) {
          this.pushDeadLetter(
            event,
            recipient,
            channel,
            result.error || 'Unknown batch delivery failure',
          );
        }
      }

      this.recordDeliveryResults(results);
    } catch (error) {
      const failure: NotificationResult = {
        recipientId: recipient.id,
        recipientAddress: recipient.address,
        channel,
        success: false,
        error: (error as Error).message,
      };
      this.pushDeadLetter(event, recipient, channel, failure.error || 'Unknown error');
      this.recordDeliveryResults([failure]);
    }
  }

  /**
   * User/Role/Team resolution (mock implementations - integrate with actual user service)
   */
  private async resolveUser(
    userId: string,
    channels: string[],
  ): Promise<ResolvedRecipient | null> {
    // Mock implementation - would query user service
    const address = channels.includes('realtime')
      ? userId
      : `user_${userId}@example.com`;
    return {
      id: userId,
      type: 'user',
      channels,
      address,
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

  private isRateLimited(recipientId: string): boolean {
    const maxPerMinute = this.config.rateLimiting?.maxPerMinute;
    if (!maxPerMinute) return false;

    const windowMs = 60 * 1000;
    const now = Date.now();
    const entry = this.rateLimiter.get(recipientId);

    if (!entry || now - entry.windowStart >= windowMs) {
      this.rateLimiter.set(recipientId, { windowStart: now, count: 1 });
      return false;
    }

    if (entry.count >= maxPerMinute) {
      return true;
    }

    entry.count++;
    return false;
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

  private pushDeadLetter(
    event: CanonicalEvent,
    recipient: ResolvedRecipient,
    channel: string,
    error: string,
  ): void {
    const entry: DeadLetterEntry = {
      id: `dlq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      event: { ...event },
      recipientId: recipient.id,
      recipientAddress: recipient.address,
      channel,
      error,
      attempts: 1,
      lastAttemptAt: new Date(),
    };

    this.deadLetterQueue.push(entry);
    this.promDeadLetters.set(this.deadLetterQueue.length);
  }

  private updateAverageLatency(latency: number, notificationsCount: number = 1): void {
    const total = this.metrics.averageLatencyMs * this.metrics.totalNotifications;
    this.metrics.averageLatencyMs =
      (total + latency * notificationsCount) /
      (this.metrics.totalNotifications + Math.max(1, notificationsCount));
  }

  private recordDeliveryResults(results: NotificationResult[]): void {
    for (const result of results) {
      this.deliveryLog.push(result);

      if (result.metadata?.queued) {
        continue;
      }

      this.metrics.totalNotifications++;
      this.promCounters.notificationsTotal.inc({
        channel: result.channel,
        status: result.success ? 'delivered' : 'failed',
      });
      if (!result.success) {
        this.promCounters.failuresTotal.inc({
          channel: result.channel,
          reason: result.error || 'unknown',
        });
      }
      if (result.success) {
        this.metrics.totalDelivered++;
      } else {
        this.metrics.totalFailed++;
      }

      const latency = Number(result.metadata?.latencyMs);
      if (!Number.isNaN(latency) && latency > 0) {
        this.promLatency.observe({ channel: result.channel }, latency);
      }
    }
  }

  /**
   * Public API
   */
  getMetrics(): NotificationMetrics {
    return { ...this.metrics };
  }

  getPrometheusMetrics(): Promise<string> {
    return this.promRegistry.metrics();
  }

  getDeadLetterQueue(): DeadLetterEntry[] {
    return [...this.deadLetterQueue];
  }

  async retryDeadLetter(entryId: string): Promise<NotificationResult | null> {
    const entryIndex = this.deadLetterQueue.findIndex((entry) => entry.id === entryId);
    if (entryIndex === -1) return null;

    const entry = this.deadLetterQueue[entryIndex];
    const receiver = this.receivers.get(entry.channel);
    if (!receiver) {
      throw new Error(`No receiver available for channel ${entry.channel}`);
    }

    const template = this.templateRenderer.render(entry.event);
    const channelStart = Date.now();
    const [result] = await receiver.send(entry.event, [entry.recipientAddress], {
      template,
      digest: false,
    });

    const mappedResult: NotificationResult = {
      recipientId: entry.recipientId,
      recipientAddress: entry.recipientAddress,
      channel: entry.channel,
      success: result.success,
      messageId: result.messageId,
      error: result.error?.message,
      deliveredAt: result.deliveredAt,
      metadata: { ...result.metadata, latencyMs: Date.now() - channelStart, retry: true },
    };

    if (mappedResult.success) {
      this.deadLetterQueue.splice(entryIndex, 1);
    } else {
      this.deadLetterQueue[entryIndex] = {
        ...entry,
        attempts: entry.attempts + 1,
        lastAttemptAt: new Date(),
        error: mappedResult.error || entry.error,
      };
    }

    this.promDeadLetters.set(this.deadLetterQueue.length);
    this.recordDeliveryResults([mappedResult]);
    return mappedResult;
  }

  getJob(jobId: string): NotificationJob | undefined {
    return this.jobs.get(jobId);
  }

  getDeliveryHistory(filter?: {
    recipientId?: string;
    channel?: string;
  }): NotificationResult[] {
    return this.deliveryLog.filter((entry) => {
      if (filter?.recipientId && entry.recipientId !== filter.recipientId) {
        return false;
      }

      if (filter?.channel && entry.channel !== filter.channel) {
        return false;
      }

      return true;
    });
  }

  getRealtimeManager(): RealtimeSessionManager | undefined {
    const receiver = this.receivers.get('realtime') as
      | RealtimeReceiver
      | undefined;
    return receiver?.getSessionManager();
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, receiver] of this.receivers) {
      health[name] = await receiver.healthCheck();
    }

    return health;
  }

  async shutdown(): Promise<void> {
    for (const batch of this.batchQueues.values()) {
      clearTimeout(batch.timer);
    }
    this.batchQueues.clear();

    for (const receiver of this.receivers.values()) {
      await receiver.shutdown();
    }

    this.receivers.clear();
    this.promRegistry.resetMetrics();
    this.initialized = false;
    this.emit('shutdown');
  }
}

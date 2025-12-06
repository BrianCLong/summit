/**
 * Notification Router Service
 *
 * Main orchestration service that:
 * - Listens to audit event stream
 * - Calculates notification severity
 * - Finds recipients based on preferences
 * - Routes to appropriate delivery channels
 * - Handles throttling and batching
 * - Logs all delivery attempts
 */

import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import type {
  AuditEvent,
  NotificationPreferences,
  NotificationMessage,
  NotificationChannel,
  NotificationSeverity,
  NotificationRouteRequest,
  DeliveryResult,
  SeverityRoutingMap,
} from './types.js';
import {
  calculateNotificationSeverity,
  requiresImmediateNotification,
  calculateNotificationPriority,
} from './severity-calculator.js';
import { NotificationThrottler } from './notification-throttler.js';
import type { IDeliveryChannel } from './delivery-channels/base-delivery.js';
import { WebSocketDelivery } from './delivery-channels/websocket-delivery.js';
import { EmailDelivery } from './delivery-channels/email-delivery.js';
import { SlackDelivery } from './delivery-channels/slack-delivery.js';

export interface NotificationRouterConfig {
  database: Pool;
  redis: Redis;
  websocketDelivery?: WebSocketDelivery;
  emailDelivery?: EmailDelivery;
  slackDelivery?: SlackDelivery;
  baseUrl: string;
  enableAutoRouting?: boolean;
}

export class NotificationRouter {
  private db: Pool;
  private redis: Redis;
  private throttler: NotificationThrottler;
  private deliveryChannels: Map<NotificationChannel, IDeliveryChannel>;
  private config: NotificationRouterConfig;
  private isRunning: boolean = false;

  // Statistics
  private stats = {
    eventsProcessed: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    notificationsThrottled: 0,
  };

  constructor(config: NotificationRouterConfig) {
    this.config = config;
    this.db = config.database;
    this.redis = config.redis;
    this.throttler = new NotificationThrottler(config.redis);

    // Initialize delivery channels
    this.deliveryChannels = new Map();

    if (config.websocketDelivery) {
      this.deliveryChannels.set('websocket', config.websocketDelivery);
    }
    if (config.emailDelivery) {
      this.deliveryChannels.set('email', config.emailDelivery);
    }
    if (config.slackDelivery) {
      this.deliveryChannels.set('slack', config.slackDelivery);
    }
  }

  /**
   * Start listening to audit event stream
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[NotificationRouter] Already running');
      return;
    }

    console.log('[NotificationRouter] Starting...');
    this.isRunning = true;

    if (this.config.enableAutoRouting !== false) {
      // Listen to PostgreSQL NOTIFY for audit events
      await this.startPostgresListener();

      // Process queued notifications periodically
      this.startQueueProcessor();

      // Process batched notifications periodically
      this.startBatchProcessor();
    }

    console.log('[NotificationRouter] Started successfully');
  }

  /**
   * Stop the router
   */
  async stop(): Promise<void> {
    console.log('[NotificationRouter] Stopping...');
    this.isRunning = false;
    // Cleanup listeners and intervals here
    console.log('[NotificationRouter] Stopped');
  }

  /**
   * Listen to PostgreSQL NOTIFY for new audit events
   */
  private async startPostgresListener(): Promise<void> {
    const client = await this.db.connect();

    await client.query('LISTEN audit_event_created');

    client.on('notification', async (msg) => {
      if (msg.channel === 'audit_event_created' && msg.payload) {
        try {
          const payload = JSON.parse(msg.payload);
          await this.processAuditEvent(payload.eventId);
        } catch (error) {
          console.error('[NotificationRouter] Error processing notification:', error);
        }
      }
    });

    console.log('[NotificationRouter] Listening to PostgreSQL NOTIFY');
  }

  /**
   * Process queued notifications periodically
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      // Get all users with queued notifications
      // This is a simplified implementation - in production, you'd track users with queues
      // For now, we'll skip this and rely on real-time delivery
    }, 60000); // Every minute
  }

  /**
   * Process batched notifications periodically
   */
  private startBatchProcessor(): void {
    setInterval(async () => {
      // Process hourly and daily digests
      // Check if it's time to send batched notifications
      // For now, we'll skip this and rely on real-time delivery
    }, 300000); // Every 5 minutes
  }

  /**
   * Process a single audit event
   */
  async processAuditEvent(eventId: string): Promise<void> {
    try {
      this.stats.eventsProcessed++;

      // Fetch full audit event from database
      const event = await this.getAuditEvent(eventId);
      if (!event) {
        console.warn(`[NotificationRouter] Event not found: ${eventId}`);
        return;
      }

      // Calculate notification severity
      const severity = calculateNotificationSeverity(event);

      // Skip low-severity events unless explicitly subscribed
      if (severity === 'low') {
        // Check if anyone is explicitly subscribed to this event type
        const hasSubscribers = await this.hasExplicitSubscribers(event);
        if (!hasSubscribers) {
          return;
        }
      }

      // Find matching recipients
      const recipients = await this.findRecipients(event, severity);

      if (recipients.length === 0) {
        return; // No one to notify
      }

      // Route to channels for each recipient
      for (const recipient of recipients) {
        await this.routeNotification({
          event,
          severity,
          recipient,
          channels: this.selectChannels(severity, recipient.preferences),
        });
      }
    } catch (error) {
      console.error(`[NotificationRouter] Error processing event ${eventId}:`, error);
    }
  }

  /**
   * Get audit event from database
   */
  private async getAuditEvent(eventId: string): Promise<AuditEvent | null> {
    const result = await this.db.query(
      'SELECT * FROM audit_events WHERE id = $1',
      [eventId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as AuditEvent;
  }

  /**
   * Check if any users are explicitly subscribed to this event type
   */
  private async hasExplicitSubscribers(event: AuditEvent): Promise<boolean> {
    const result = await this.db.query(
      `SELECT COUNT(*) as count
       FROM notification_preferences
       WHERE enabled = true
         AND (event_types IS NULL OR $1 = ANY(event_types))
         AND tenant_id = $2`,
      [event.event_type, event.tenant_id]
    );

    return parseInt(result.rows[0].count, 10) > 0;
  }

  /**
   * Find recipients for an audit event
   */
  private async findRecipients(
    event: AuditEvent,
    severity: NotificationSeverity
  ): Promise<
    Array<{
      userId: string;
      tenantId: string;
      preferences: NotificationPreferences;
    }>
  > {
    // Query notification preferences for matching users
    const result = await this.db.query(
      `SELECT *
       FROM notification_preferences
       WHERE enabled = true
         AND tenant_id = $1
         AND (
           -- Match severity threshold
           CASE severity_threshold
             WHEN 'debug' THEN true
             WHEN 'info' THEN $2 IN ('info', 'warn', 'error', 'critical')
             WHEN 'warn' THEN $2 IN ('warn', 'error', 'critical')
             WHEN 'error' THEN $2 IN ('error', 'critical')
             WHEN 'critical' THEN $2 = 'critical'
           END
         )
         AND (
           -- Match event type (NULL means all events)
           event_types IS NULL OR $3 = ANY(event_types)
         )
         AND (
           -- Match resource type (NULL means all resources)
           resource_types IS NULL OR $4 = ANY(resource_types)
         )`,
      [event.tenant_id, event.level, event.event_type, event.resource_type]
    );

    return result.rows.map((row) => ({
      userId: row.user_id,
      tenantId: row.tenant_id,
      preferences: row as NotificationPreferences,
    }));
  }

  /**
   * Select appropriate channels based on severity
   */
  private selectChannels(
    severity: NotificationSeverity,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    const strategy = SeverityRoutingMap[severity];
    const availableChannels = strategy.channels.filter((channel) => {
      // Check if channel is enabled in user preferences
      const channelEnabled = preferences.channels[channel] === true;
      // Check if channel is available (configured)
      const channelAvailable = this.deliveryChannels.has(channel);
      return channelEnabled && channelAvailable;
    });

    return availableChannels;
  }

  /**
   * Route notification to channels
   */
  private async routeNotification(
    request: NotificationRouteRequest
  ): Promise<void> {
    const { event, severity, recipient, channels } = request;

    // Build notification message
    const message: NotificationMessage = {
      id: uuidv4(),
      eventId: event.id,
      userId: recipient.userId,
      tenantId: recipient.tenantId,
      channel: 'websocket', // Will be overridden per channel
      severity,
      title: this.buildNotificationTitle(event, severity),
      body: this.buildNotificationBody(event),
      data: {
        ...event.metadata,
        eventType: event.event_type,
        resourceType: event.resource_type,
        resourceId: event.resource_id,
        action: event.action,
        outcome: event.outcome,
        user_email: event.user_email,
        ip_address: event.ip_address,
        timestamp: event.timestamp,
        baseUrl: this.config.baseUrl,
      },
      destination: this.getDestination(recipient.preferences, 'email'), // Will be overridden per channel
    };

    // Check throttling
    const shouldDeliver = await this.throttler.shouldDeliver(
      message,
      event,
      recipient.preferences
    );

    if (!shouldDeliver.shouldDeliver) {
      this.stats.notificationsThrottled++;
      await this.logDeliveryAttempt(message, 'throttled', shouldDeliver.reason);
      return;
    }

    // Deliver to each channel
    for (const channel of channels) {
      const channelMessage = {
        ...message,
        channel,
        destination: this.getDestination(recipient.preferences, channel),
      };

      await this.deliverToChannel(channelMessage);
    }
  }

  /**
   * Deliver message to a specific channel
   */
  private async deliverToChannel(
    message: NotificationMessage
  ): Promise<void> {
    const deliveryChannel = this.deliveryChannels.get(message.channel);
    if (!deliveryChannel) {
      console.warn(`[NotificationRouter] Channel not available: ${message.channel}`);
      return;
    }

    try {
      const result = await deliveryChannel.deliver(message);

      if (result.success) {
        this.stats.notificationsSent++;
        await this.logDeliveryAttempt(message, 'sent', undefined, result);
      } else {
        this.stats.notificationsFailed++;
        await this.logDeliveryAttempt(message, 'failed', result.error?.message, result);
      }
    } catch (error) {
      this.stats.notificationsFailed++;
      await this.logDeliveryAttempt(message, 'failed', (error as Error).message);
    }
  }

  /**
   * Log delivery attempt to database
   */
  private async logDeliveryAttempt(
    message: NotificationMessage,
    status: string,
    errorMessage?: string,
    result?: DeliveryResult
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO notification_delivery_log (
        id, audit_event_id, user_id, tenant_id, channel, destination,
        notification_severity, notification_title, notification_body,
        notification_data, status, error_message, delivery_metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
      [
        message.id,
        message.eventId,
        message.userId,
        message.tenantId,
        message.channel,
        message.destination,
        message.severity,
        message.title,
        message.body,
        JSON.stringify(message.data),
        status,
        errorMessage,
        result ? JSON.stringify(result.metadata) : null,
      ]
    );
  }

  /**
   * Build notification title
   */
  private buildNotificationTitle(
    event: AuditEvent,
    severity: NotificationSeverity
  ): string {
    const eventTypeTitle = event.event_type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    if (severity === 'critical' || severity === 'emergency') {
      return `🚨 ${eventTypeTitle}`;
    }

    return eventTypeTitle;
  }

  /**
   * Build notification body
   */
  private buildNotificationBody(event: AuditEvent): string {
    let body = '';

    if (event.user_email) {
      body += `User ${event.user_email} `;
    } else {
      body += 'A user ';
    }

    body += `performed ${event.action || 'an action'}`;

    if (event.resource_type) {
      body += ` on ${event.resource_type}`;
      if (event.resource_id) {
        body += ` (${event.resource_id})`;
      }
    }

    if (event.outcome) {
      body += ` with outcome: ${event.outcome}`;
    }

    return body;
  }

  /**
   * Get destination (email, slack channel, webhook URL) for a channel
   */
  private getDestination(
    preferences: NotificationPreferences,
    channel: NotificationChannel
  ): string | undefined {
    switch (channel) {
      case 'email':
        return preferences.email_address || undefined;
      case 'slack':
        return preferences.slack_webhook_url || undefined;
      case 'webhook':
        return preferences.webhook_url || undefined;
      default:
        return undefined;
    }
  }

  /**
   * Get router statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Health check for all channels
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, channel] of this.deliveryChannels) {
      health[name] = await channel.healthCheck();
    }

    return health;
  }
}

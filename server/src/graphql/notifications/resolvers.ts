/**
 * GraphQL Resolvers for Notification System
 */

import type { Pool } from 'pg';
import type { PubSub } from 'graphql-subscriptions';
import { v4 as uuidv4 } from 'uuid';

interface Context {
  db: Pool;
  pubsub: PubSub;
  user: {
    id: string;
    tenantId: string;
    roles: string[];
  };
}

export const notificationResolvers = {
  Query: {
    /**
     * Get current user's notification preferences
     */
    myNotificationPreferences: async (
      _parent: any,
      _args: any,
      context: Context
    ) => {
      const { db, user } = context;

      const result = await db.query(
        `SELECT * FROM notification_preferences
         WHERE user_id = $1 AND tenant_id = $2`,
        [user.id, user.tenantId]
      );

      if (result.rows.length === 0) {
        // Create default preferences
        const defaults = await db.query(
          `INSERT INTO notification_preferences (
            user_id, tenant_id, severity_threshold, channels, enabled
          ) VALUES ($1, $2, 'warn', '{"websocket": true, "email": false, "slack": false, "webhook": false}'::jsonb, true)
          RETURNING *`,
          [user.id, user.tenantId]
        );
        return defaults.rows[0];
      }

      return result.rows[0];
    },

    /**
     * Get notification history with pagination
     */
    notificationHistory: async (
      _parent: any,
      args: {
        first: number;
        after?: string;
        filter?: any;
      },
      context: Context
    ) => {
      const { db, user } = context;
      const { first = 20, after, filter } = args;

      let query = `
        SELECT *
        FROM notification_delivery_log
        WHERE user_id = $1
      `;
      const params: any[] = [user.id];
      let paramIndex = 2;

      // Apply filters
      if (filter) {
        if (filter.channel) {
          query += ` AND channel = $${paramIndex}`;
          params.push(filter.channel.toLowerCase());
          paramIndex++;
        }
        if (filter.status) {
          query += ` AND status = $${paramIndex}`;
          params.push(filter.status.toLowerCase());
          paramIndex++;
        }
        if (filter.severity) {
          query += ` AND notification_severity = $${paramIndex}`;
          params.push(filter.severity.toLowerCase());
          paramIndex++;
        }
        if (filter.startDate) {
          query += ` AND created_at >= $${paramIndex}`;
          params.push(filter.startDate);
          paramIndex++;
        }
        if (filter.endDate) {
          query += ` AND created_at <= $${paramIndex}`;
          params.push(filter.endDate);
          paramIndex++;
        }
        if (filter.unreadOnly) {
          query += ` AND read_at IS NULL`;
        }
      }

      // Cursor pagination
      if (after) {
        query += ` AND created_at < (
          SELECT created_at FROM notification_delivery_log WHERE id = $${paramIndex}
        )`;
        params.push(after);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(first + 1); // Fetch one extra to determine hasNextPage

      const result = await db.query(query, params);

      const hasNextPage = result.rows.length > first;
      const edges = result.rows.slice(0, first).map((row) => ({
        cursor: row.id,
        node: row,
      }));

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total
         FROM notification_delivery_log
         WHERE user_id = $1`,
        [user.id]
      );

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        totalCount: parseInt(countResult.rows[0].total, 10),
      };
    },

    /**
     * Get unread notification count
     */
    unreadNotificationCount: async (
      _parent: any,
      _args: any,
      context: Context
    ) => {
      const { db, user } = context;

      const result = await db.query(
        `SELECT get_unread_notification_count($1) as count`,
        [user.id]
      );

      return parseInt(result.rows[0].count, 10);
    },

    /**
     * Get notification statistics
     */
    notificationStats: async (
      _parent: any,
      args: {
        startDate?: string;
        endDate?: string;
      },
      context: Context
    ) => {
      const { db, user } = context;
      const { startDate, endDate } = args;

      let dateFilter = '';
      const params: any[] = [user.id];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        dateFilter += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // Get overall stats
      const overallResult = await db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
           COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
           COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
           COUNT(*) FILTER (WHERE status = 'throttled') as total_throttled,
           COUNT(*) FILTER (WHERE read_at IS NULL AND status IN ('sent', 'delivered')) as unread_count
         FROM notification_delivery_log
         WHERE user_id = $1 ${dateFilter}`,
        params
      );

      // Get stats by channel
      const channelResult = await db.query(
        `SELECT
           channel,
           COUNT(*) FILTER (WHERE status = 'sent') as sent,
           COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
           COUNT(*) FILTER (WHERE status = 'failed') as failed
         FROM notification_delivery_log
         WHERE user_id = $1 ${dateFilter}
         GROUP BY channel`,
        params
      );

      // Get stats by severity
      const severityResult = await db.query(
        `SELECT
           notification_severity as severity,
           COUNT(*) as count
         FROM notification_delivery_log
         WHERE user_id = $1 ${dateFilter}
         GROUP BY notification_severity`,
        params
      );

      return {
        totalSent: parseInt(overallResult.rows[0].total_sent, 10),
        totalDelivered: parseInt(overallResult.rows[0].total_delivered, 10),
        totalFailed: parseInt(overallResult.rows[0].total_failed, 10),
        totalThrottled: parseInt(overallResult.rows[0].total_throttled, 10),
        unreadCount: parseInt(overallResult.rows[0].unread_count, 10),
        byChannel: channelResult.rows.map((row) => ({
          channel: row.channel.toUpperCase(),
          sent: parseInt(row.sent, 10),
          delivered: parseInt(row.delivered, 10),
          failed: parseInt(row.failed, 10),
        })),
        bySeverity: severityResult.rows.map((row) => ({
          severity: row.severity.toUpperCase(),
          count: parseInt(row.count, 10),
        })),
      };
    },
  },

  Mutation: {
    /**
     * Update notification preferences
     */
    updateNotificationPreferences: async (
      _parent: any,
      args: { input: any },
      context: Context
    ) => {
      const { db, user } = context;
      const { input } = args;

      const result = await db.query(
        `INSERT INTO notification_preferences (
          user_id, tenant_id, event_types, severity_threshold, resource_types,
          tags, channels, email_address, email_digest_frequency,
          slack_webhook_url, slack_channel, webhook_url,
          max_notifications_per_hour, quiet_hours_start, quiet_hours_end,
          quiet_hours_timezone, enabled, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
        )
        ON CONFLICT (user_id, tenant_id)
        DO UPDATE SET
          event_types = EXCLUDED.event_types,
          severity_threshold = EXCLUDED.severity_threshold,
          resource_types = EXCLUDED.resource_types,
          tags = EXCLUDED.tags,
          channels = EXCLUDED.channels,
          email_address = EXCLUDED.email_address,
          email_digest_frequency = EXCLUDED.email_digest_frequency,
          slack_webhook_url = EXCLUDED.slack_webhook_url,
          slack_channel = EXCLUDED.slack_channel,
          webhook_url = EXCLUDED.webhook_url,
          max_notifications_per_hour = EXCLUDED.max_notifications_per_hour,
          quiet_hours_start = EXCLUDED.quiet_hours_start,
          quiet_hours_end = EXCLUDED.quiet_hours_end,
          quiet_hours_timezone = EXCLUDED.quiet_hours_timezone,
          enabled = EXCLUDED.enabled,
          updated_at = NOW()
        RETURNING *`,
        [
          user.id,
          user.tenantId,
          input.eventTypes,
          input.severityThreshold.toLowerCase(),
          input.resourceTypes,
          input.tags,
          JSON.stringify(input.channels),
          input.emailAddress,
          input.emailDigestFrequency?.toLowerCase(),
          input.slackWebhookUrl,
          input.slackChannel,
          input.webhookUrl,
          input.maxNotificationsPerHour,
          input.quietHoursStart,
          input.quietHoursEnd,
          input.quietHoursTimezone,
          input.enabled !== false,
        ]
      );

      return result.rows[0];
    },

    /**
     * Mark notification as read
     */
    markNotificationRead: async (
      _parent: any,
      args: { id: string },
      context: Context
    ) => {
      const { db, user, pubsub } = context;
      const { id } = args;

      const result = await db.query(
        `SELECT mark_notification_read($1, $2) as success`,
        [id, user.id]
      );

      if (!result.rows[0].success) {
        throw new Error('Notification not found or already read');
      }

      // Get updated notification
      const notificationResult = await db.query(
        `SELECT * FROM notification_delivery_log WHERE id = $1`,
        [id]
      );

      // Publish unread count update
      const countResult = await db.query(
        `SELECT get_unread_notification_count($1) as count`,
        [user.id]
      );
      pubsub.publish('UNREAD_COUNT_UPDATED', {
        unreadCountUpdated: parseInt(countResult.rows[0].count, 10),
        userId: user.id,
      });

      return notificationResult.rows[0];
    },

    /**
     * Mark all notifications as read
     */
    markAllNotificationsRead: async (
      _parent: any,
      _args: any,
      context: Context
    ) => {
      const { db, user, pubsub } = context;

      const result = await db.query(
        `UPDATE notification_delivery_log
         SET read_at = NOW(), status = 'read'
         WHERE user_id = $1 AND read_at IS NULL AND status IN ('sent', 'delivered')`,
        [user.id]
      );

      // Publish unread count update
      pubsub.publish('UNREAD_COUNT_UPDATED', {
        unreadCountUpdated: 0,
        userId: user.id,
      });

      return result.rowCount;
    },

    /**
     * Acknowledge critical notification
     */
    acknowledgeNotification: async (
      _parent: any,
      args: { id: string; note?: string },
      context: Context
    ) => {
      const { db, user } = context;
      const { id, note } = args;

      const result = await db.query(
        `SELECT acknowledge_notification($1, $2, $3) as success`,
        [id, user.id, note]
      );

      if (!result.rows[0].success) {
        throw new Error('Notification not found or already acknowledged');
      }

      // Get updated notification
      const notificationResult = await db.query(
        `SELECT * FROM notification_delivery_log WHERE id = $1`,
        [id]
      );

      return notificationResult.rows[0];
    },

    /**
     * Test notification delivery (admin only)
     */
    testNotification: async (
      _parent: any,
      args: { userId: string; channel: string; message: string },
      context: Context
    ) => {
      const { db, user } = context;
      const { userId, channel, message } = args;

      // Check admin permission
      if (!user.roles.includes('admin')) {
        throw new Error('Unauthorized: Admin role required');
      }

      // Create test notification
      const testId = uuidv4();
      await db.query(
        `INSERT INTO notification_delivery_log (
          id, audit_event_id, user_id, tenant_id, channel, notification_severity,
          notification_title, notification_body, notification_data,
          status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
        )`,
        [
          testId,
          uuidv4(), // Dummy event ID
          userId,
          user.tenantId,
          channel.toLowerCase(),
          'medium',
          'Test Notification',
          message,
          JSON.stringify({ test: true }),
          'sent',
        ]
      );

      return true;
    },
  },

  Subscription: {
    /**
     * Real-time notification stream
     */
    notificationReceived: {
      subscribe: async (_parent: any, _args: any, context: Context) => {
        const { pubsub, user } = context;
        return pubsub.asyncIterator(['NOTIFICATION_RECEIVED']);
      },
      resolve: (payload: any, _args: any, context: Context) => {
        // Filter notifications for current user
        if (payload.notification.userId === context.user.id) {
          return payload.notification;
        }
        return null;
      },
    },

    /**
     * Real-time unread count updates
     */
    unreadCountUpdated: {
      subscribe: async (_parent: any, _args: any, context: Context) => {
        const { pubsub, user } = context;
        return pubsub.asyncIterator(['UNREAD_COUNT_UPDATED']);
      },
      resolve: (payload: any, _args: any, context: Context) => {
        // Filter for current user
        if (payload.userId === context.user.id) {
          return payload.unreadCountUpdated;
        }
        return null;
      },
    },
  },

  NotificationDelivery: {
    /**
     * Resolve audit event for notification
     */
    auditEvent: async (parent: any, _args: any, context: Context) => {
      const { db } = context;

      const result = await db.query(
        `SELECT * FROM audit_events WHERE id = $1`,
        [parent.audit_event_id]
      );

      return result.rows[0] || null;
    },
  },
};

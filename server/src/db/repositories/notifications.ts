import baseLogger from '../../config/logger';
import { getPostgresPool } from '../postgres';

const logger = baseLogger.child({ name: 'notifications-repo' });

export type NotificationPreferenceRecord = {
  id: string;
  user_id: string;
  event_type: string;
  channel_email: boolean;
  channel_sms: boolean;
  channel_in_app: boolean;
  email_address: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRecord = {
  id: string;
  user_id: string;
  event_type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  metadata: any;
  action_id: string | null;
  investigation_id: string | null;
  expires_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_EVENTS = ['INGESTION_COMPLETE', 'ML_JOB_STATUS'];

export async function ensureDefaultPreferences(userId: string) {
  const pool = getPostgresPool();
  for (const eventType of DEFAULT_EVENTS) {
    try {
      await pool.query(
        `INSERT INTO notification_preferences (user_id, event_type, channel_in_app)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (user_id, event_type) DO NOTHING`,
        [userId, eventType],
      );
    } catch (error) {
      logger.warn({ err: error, userId, eventType }, 'failed to ensure default notification preference');
    }
  }
}

export async function listNotificationPreferences(userId: string): Promise<NotificationPreferenceRecord[]> {
  const pool = getPostgresPool();
  try {
    const result = await pool.query<NotificationPreferenceRecord>(
      `SELECT * FROM notification_preferences WHERE user_id = $1 ORDER BY event_type ASC`,
      [userId],
    );
    return result.rows;
  } catch (error) {
    logger.error({ err: error, userId }, 'failed to list notification preferences');
    return [];
  }
}

export async function upsertNotificationPreference(
  userId: string,
  eventType: string,
  channels: { inApp: boolean; email: boolean; sms: boolean },
  contact?: { email?: string | null; phoneNumber?: string | null },
): Promise<NotificationPreferenceRecord | null> {
  const pool = getPostgresPool();
  try {
    const result = await pool.query<NotificationPreferenceRecord>(
      `INSERT INTO notification_preferences (user_id, event_type, channel_in_app, channel_email, channel_sms, email_address, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, event_type)
       DO UPDATE SET
         channel_in_app = EXCLUDED.channel_in_app,
         channel_email = EXCLUDED.channel_email,
         channel_sms = EXCLUDED.channel_sms,
         email_address = COALESCE(EXCLUDED.email_address, notification_preferences.email_address),
         phone_number = COALESCE(EXCLUDED.phone_number, notification_preferences.phone_number),
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        eventType,
        channels.inApp,
        channels.email,
        channels.sms,
        contact?.email ?? null,
        contact?.phoneNumber ?? null,
      ],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    logger.error({ err: error, userId, eventType }, 'failed to upsert notification preference');
    return null;
  }
}

export async function getPreferenceForEvent(
  userId: string,
  eventType: string,
): Promise<NotificationPreferenceRecord | null> {
  const pool = getPostgresPool();
  try {
    const result = await pool.query<NotificationPreferenceRecord>(
      `SELECT * FROM notification_preferences WHERE user_id = $1 AND event_type = $2`,
      [userId, eventType],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    logger.error({ err: error, userId, eventType }, 'failed to fetch notification preference');
    return null;
  }
}

export async function createNotification(record: {
  userId: string;
  eventType: string;
  title: string;
  message: string;
  severity: string;
  metadata?: any;
  actionId?: string | null;
  investigationId?: string | null;
  expiresAt?: string | null;
}): Promise<NotificationRecord | null> {
  const pool = getPostgresPool();
  try {
    const result = await pool.query<NotificationRecord>(
      `INSERT INTO notifications (user_id, event_type, title, message, severity, metadata, action_id, investigation_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
       RETURNING *`,
      [
        record.userId,
        record.eventType,
        record.title,
        record.message,
        record.severity,
        JSON.stringify(record.metadata ?? {}),
        record.actionId ?? null,
        record.investigationId ?? null,
        record.expiresAt ?? null,
      ],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    logger.error({ err: error, userId: record.userId, eventType: record.eventType }, 'failed to create notification');
    return null;
  }
}

export async function listNotifications(
  userId: string,
  options: { limit?: number; onlyUnread?: boolean } = {},
): Promise<NotificationRecord[]> {
  const pool = getPostgresPool();
  const limit = Math.min(options.limit ?? 20, 100);
  try {
    const result = await pool.query<NotificationRecord>(
      `SELECT * FROM notifications
       WHERE user_id = $1
         ${options.onlyUnread ? "AND status = 'unread'" : ''}
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return result.rows;
  } catch (error) {
    logger.error({ err: error, userId }, 'failed to list notifications');
    return [];
  }
}

export async function markNotificationRead(
  userId: string,
  id: string,
): Promise<NotificationRecord | null> {
  const pool = getPostgresPool();
  try {
    const result = await pool.query<NotificationRecord>(
      `UPDATE notifications
       SET status = 'read', read_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId],
    );
    return result.rows[0] ?? null;
  } catch (error) {
    logger.error({ err: error, userId, id }, 'failed to mark notification read');
    return null;
  }
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const pool = getPostgresPool();
  try {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND status = 'unread'`,
      [userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  } catch (error) {
    logger.error({ err: error, userId }, 'failed to count unread notifications');
    return 0;
  }
}

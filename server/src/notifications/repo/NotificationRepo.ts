
// @ts-nocheck
import { pool } from '../../db/pg.js';
import { NotificationPayload, NotificationStatus, NotificationPriority, Notification, CreateNotificationInput } from '../types.js';
import pino from 'pino';

// @ts-ignore
const logger = pino({ name: 'NotificationRepo' });

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  priority: NotificationPriority;
  subject?: string;
  message?: string;
  data?: any;
  status: NotificationStatus;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationRepo {
  async create(payload: NotificationPayload): Promise<NotificationRecord> {
    try {
      const res = await pool.query(
        `INSERT INTO notifications (user_id, type, priority, subject, message, data, status, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          payload.userId,
          payload.type,
          payload.priority || NotificationPriority.MEDIUM,
          payload.subject,
          payload.message,
          JSON.stringify(payload.data || {}),
          NotificationStatus.SENT, // Assuming we create it when sent/ready
          payload.tenantId || null
        ]
      );

      return this.mapRow(res.rows[0]);
    } catch (error: any) {
      logger.error({ userId: payload.userId, error: error.message }, 'Failed to create notification');
      throw error;
    }
  }

  async createV2(input: CreateNotificationInput): Promise<Notification> {
      const { tenantId, userId, type, payload } = input;
      try {
        const res = await pool.query(
          `INSERT INTO notifications (tenant_id, user_id, type, payload, read_at, created_at, subject, message, data)
           VALUES ($1, $2, $3, $4, NULL, NOW(), $5, $6, $7)
           RETURNING *`,
          [
              tenantId,
              userId,
              type,
              JSON.stringify(payload),
              payload.subject || null,
              payload.message || null,
              JSON.stringify(payload.data || {})
          ]
        );
        return this.mapRowV2(res.rows[0]);
      } catch (error: any) {
        logger.error({ tenantId, userId, error: error.message }, 'Failed to create notification V2');
        throw error;
      }
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  }

  async markAsReadV2(id: string, tenantId: string, userId: string): Promise<Notification | null> {
    const res = await pool.query(
      `UPDATE notifications
       SET read_at = NOW(), is_read = TRUE, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND user_id = $3
       RETURNING *`,
      [id, tenantId, userId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowV2(res.rows[0]);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW(), updated_at = NOW() WHERE user_id = $1',
      [userId]
    );
  }

  async getUnread(userId: string, limit = 20, offset = 0): Promise<NotificationRecord[]> {
    const res = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return res.rows.map(this.mapRow);
  }

  async list(tenantId: string, userId: string, unreadOnly: boolean, cursor?: string, limit = 20): Promise<Notification[]> {
    let query = `SELECT * FROM notifications WHERE tenant_id = $1 AND user_id = $2`;
    const params: any[] = [tenantId, userId];
    let paramIdx = 3;

    if (unreadOnly) {
      query += ` AND read_at IS NULL`;
    }

    if (cursor) {
        // Try parsing cursor as timestamp_id
        if (cursor.includes('_')) {
            const [tsStr, idStr] = cursor.split('_');
             query += ` AND (created_at, id) < ($${paramIdx}, $${paramIdx+1})`;
             params.push(tsStr, idStr);
             paramIdx += 2;
        } else {
             query += ` AND created_at < $${paramIdx}`;
             params.push(cursor);
             paramIdx++;
        }
    }

    query += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIdx}`;
    params.push(limit);

    const res = await pool.query(query, params);
    return res.rows.map(this.mapRowV2);
  }

  private mapRow(row: any): NotificationRecord {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      priority: row.priority,
      subject: row.subject,
      message: row.message,
      data: row.data,
      status: row.status,
      isRead: row.is_read,
      createdAt: row.created_at,
    };
  }

  private mapRowV2(row: any): Notification {
      return {
          id: row.id,
          tenantId: row.tenant_id,
          userId: row.user_id,
          type: row.type,
          payload: row.payload || {
              subject: row.subject,
              message: row.message,
              data: row.data
          },
          readAt: row.read_at || (row.is_read ? row.updated_at : null),
          createdAt: row.created_at,
      };
  }
}

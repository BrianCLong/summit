import { pool } from '../../db/pg.js';
import { NotificationPayload, NotificationStatus, NotificationPriority } from '../types.js';
import pino from 'pino';

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
        `INSERT INTO notifications (user_id, type, priority, subject, message, data, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          payload.userId,
          payload.type,
          payload.priority || NotificationPriority.MEDIUM,
          payload.subject,
          payload.message,
          JSON.stringify(payload.data || {}),
          NotificationStatus.SENT, // Assuming we create it when sent/ready
        ]
      );

      return this.mapRow(res.rows[0]);
    } catch (error: any) {
      logger.error({ userId: payload.userId, error: error.message }, 'Failed to create notification');
      throw error;
    }
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE user_id = $1',
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
}

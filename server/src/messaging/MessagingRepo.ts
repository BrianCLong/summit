import { pool } from '../db/pg.js';
import { Message, SendMessagePayload } from './types.js';
import pino from 'pino';

const logger = (pino as any)({ name: 'MessagingRepo' });

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: Date;
  read_at: Date | null;
}

export class MessagingRepo {
  async create(payload: SendMessagePayload): Promise<Message> {
    try {
      const res = await pool.query(
        `INSERT INTO messages (sender_id, recipient_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [payload.senderId, payload.recipientId, payload.content]
      );

      return this.mapRow(res.rows[0] as MessageRow);
    } catch (error: any) {
      logger.error({ senderId: payload.senderId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to create message');
      throw error;
    }
  }

  async getHistory(userId: string, otherUserId: string, limit = 50): Promise<Message[]> {
    const res = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC
       LIMIT $3`,
      [userId, otherUserId, limit]
    );
    return res.rows.map((row: any) => this.mapRow(row as MessageRow));
  }

  private mapRow(row: MessageRow): Message {
    return {
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      content: row.content,
      createdAt: row.created_at,
      readAt: row.read_at ?? undefined,
    };
  }
}

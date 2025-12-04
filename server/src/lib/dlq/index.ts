import { EventEmitter } from 'events';
import crypto from 'crypto';
import pino from 'pino';
import { getPostgresPool } from '../../config/database.js';

const logger = pino();

export interface DLQMessage<T = any> {
  id: string;
  payload: T;
  error: string;
  timestamp: number;
  metadata?: Record<string, any>;
  retryCount: number;
}

export interface DeadLetterQueue {
  enqueue(message: Omit<DLQMessage, 'timestamp' | 'id'> & { id?: string }): Promise<string>;
  dequeue(count?: number): Promise<DLQMessage[]>;
  ack(messageId: string): Promise<void>;
  nack(messageId: string): Promise<void>;
  count(): Promise<number>;
}

/**
 * PostgreSQL-backed Dead Letter Queue.
 * Suitable for distributed environments.
 */
export class PostgresDLQ extends EventEmitter implements DeadLetterQueue {
  private queueName: string;

  constructor(queueName: string) {
    super();
    this.queueName = queueName;
  }

  async enqueue(message: Omit<DLQMessage, 'timestamp' | 'id'> & { id?: string }): Promise<string> {
    const id = message.id || crypto.randomUUID();
    const pool = getPostgresPool();

    const query = `
      INSERT INTO dlq_messages (id, queue_name, payload, error, retry_count, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;

    const values = [
      id,
      this.queueName,
      JSON.stringify(message.payload),
      message.error,
      message.retryCount,
      JSON.stringify(message.metadata || {})
    ];

    try {
      await pool.query(query, values);
      this.emit('enqueued', { id, ...message });
      return id;
    } catch (error) {
      logger.error({ err: error, queue: this.queueName }, 'Failed to enqueue DLQ message');
      throw error;
    }
  }

  async dequeue(count: number = 1): Promise<DLQMessage[]> {
    const pool = getPostgresPool();
    // Simple FIFO fetch.
    // In a real high-concurrency scenario, we might use FOR UPDATE SKIP LOCKED.
    // For now, we just read.
    // Note: This does not "lock" the message, so multiple workers could see it.
    // A robust implementation would mark it as "processing" or delete on ack.

    const query = `
      SELECT id, payload, error, retry_count, metadata, created_at
      FROM dlq_messages
      WHERE queue_name = $1
      ORDER BY created_at ASC
      LIMIT $2
    `;

    try {
      const result = await pool.query(query, [this.queueName, count]);
      return result.rows.map(row => ({
        id: row.id,
        payload: row.payload, // pg auto-parses json
        error: row.error,
        retryCount: row.retry_count,
        metadata: row.metadata,
        timestamp: new Date(row.created_at).getTime()
      }));
    } catch (error) {
      logger.error({ err: error, queue: this.queueName }, 'Failed to dequeue DLQ messages');
      throw error;
    }
  }

  async ack(messageId: string): Promise<void> {
    const pool = getPostgresPool();
    // ACK means "processed successfully" or "discarded", so we remove it.
    try {
      await pool.query('DELETE FROM dlq_messages WHERE id = $1', [messageId]);
      this.emit('acked', messageId);
    } catch (error) {
      logger.error({ err: error, messageId }, 'Failed to ack DLQ message');
      throw error;
    }
  }

  async nack(messageId: string): Promise<void> {
    // NACK might increment retry count?
    const pool = getPostgresPool();
    try {
        await pool.query(
            'UPDATE dlq_messages SET retry_count = retry_count + 1 WHERE id = $1',
            [messageId]
        );
        this.emit('nacked', messageId);
    } catch (error) {
        logger.error({ err: error, messageId }, 'Failed to nack DLQ message');
        throw error;
    }
  }

  async count(): Promise<number> {
    const pool = getPostgresPool();
    try {
      const result = await pool.query(
          'SELECT COUNT(*) as count FROM dlq_messages WHERE queue_name = $1',
          [this.queueName]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      return 0;
    }
  }
}

export const dlqFactory = (queueName: string) => {
    return new PostgresDLQ(queueName);
};

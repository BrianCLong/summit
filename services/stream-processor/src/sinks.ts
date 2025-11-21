import { Pool } from 'pg';
import Redis from 'ioredis';
import pino from 'pino';
import { StreamMessage } from '@intelgraph/kafka-integration';

const logger = pino({ name: 'stream-sinks' });

/**
 * Base sink interface
 */
export interface Sink<T = any> {
  write(messages: StreamMessage<T>[]): Promise<void>;
  close(): Promise<void>;
}

/**
 * PostgreSQL sink
 */
export class PostgreSQLSink implements Sink {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async write(messages: StreamMessage[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const message of messages) {
        await client.query(
          `INSERT INTO stream_events (event_id, event_type, payload, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (event_id) DO NOTHING`,
          [
            message.metadata.eventId,
            message.metadata.eventType,
            JSON.stringify(message.payload),
            new Date(message.metadata.timestamp),
            JSON.stringify(message.metadata),
          ]
        );
      }

      await client.query('COMMIT');
      logger.debug({ count: messages.length }, 'Wrote to PostgreSQL');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error }, 'PostgreSQL write failed');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Redis sink
 */
export class RedisSink implements Sink {
  private redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url);
  }

  async write(messages: StreamMessage[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const message of messages) {
      const key = `event:${message.metadata.eventId}`;
      pipeline.setex(key, 86400, JSON.stringify(message)); // 24 hour TTL

      // Add to stream
      pipeline.xadd(
        `stream:${message.metadata.eventType}`,
        '*',
        'data',
        JSON.stringify(message)
      );
    }

    await pipeline.exec();
    logger.debug({ count: messages.length }, 'Wrote to Redis');
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Webhook sink
 */
export class WebhookSink implements Sink {
  constructor(
    private url: string,
    private headers?: Record<string, string>
  ) {}

  async write(messages: StreamMessage[]): Promise<void> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify({ events: messages }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      logger.debug({ count: messages.length }, 'Sent to webhook');
    } catch (error) {
      logger.error({ error, url: this.url }, 'Webhook write failed');
      throw error;
    }
  }

  async close(): Promise<void> {
    // Nothing to close
  }
}

/**
 * Multi-sink for fanout
 */
export class MultiSink implements Sink {
  constructor(private sinks: Sink[]) {}

  async write(messages: StreamMessage[]): Promise<void> {
    await Promise.all(this.sinks.map((sink) => sink.write(messages)));
  }

  async close(): Promise<void> {
    await Promise.all(this.sinks.map((sink) => sink.close()));
  }
}

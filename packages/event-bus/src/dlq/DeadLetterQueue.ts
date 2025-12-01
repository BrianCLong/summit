/**
 * DeadLetterQueue - Dead letter queue management
 *
 * Handle failed messages and provide replay capabilities
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';
import type { MessageEnvelope } from '../core/types.js';

export interface DLQMessage<T = any> {
  envelope: MessageEnvelope<T>;
  failureReason: string;
  failedAt: Date;
  originalTopic?: string;
  originalQueue?: string;
}

export interface DLQStats {
  totalMessages: number;
  oldestMessage?: Date;
  newestMessage?: Date;
  messagesByReason: Record<string, number>;
}

export class DeadLetterQueue extends EventEmitter {
  private redis: Redis;
  private name: string;

  constructor(redis: Redis, name: string) {
    super();
    this.redis = redis;
    this.name = name;
  }

  /**
   * Add message to dead letter queue
   */
  async add<T = any>(
    envelope: MessageEnvelope<T>,
    failureReason: string,
    originalDestination?: { topic?: string; queue?: string }
  ): Promise<void> {
    const dlqMessage: DLQMessage<T> = {
      envelope,
      failureReason,
      failedAt: new Date(),
      originalTopic: originalDestination?.topic,
      originalQueue: originalDestination?.queue
    };

    const key = `dlq:${this.name}`;
    await this.redis.lpush(key, JSON.stringify(dlqMessage));

    // Update stats
    await this.redis.hincrby(`dlq:${this.name}:stats`, 'total', 1);
    await this.redis.hincrby(
      `dlq:${this.name}:stats`,
      `reason:${failureReason}`,
      1
    );

    this.emit('message:added', {
      messageId: envelope.metadata.messageId,
      reason: failureReason
    });
  }

  /**
   * Get messages from DLQ
   */
  async getMessages<T = any>(
    offset: number = 0,
    limit: number = 100
  ): Promise<DLQMessage<T>[]> {
    const key = `dlq:${this.name}`;
    const messages = await this.redis.lrange(key, offset, offset + limit - 1);

    return messages.map(msg => JSON.parse(msg) as DLQMessage<T>);
  }

  /**
   * Remove message from DLQ
   */
  async remove(messageId: string): Promise<boolean> {
    const key = `dlq:${this.name}`;
    const messages = await this.redis.lrange(key, 0, -1);

    for (const msgStr of messages) {
      const msg = JSON.parse(msgStr) as DLQMessage;
      if (msg.envelope.metadata.messageId === messageId) {
        await this.redis.lrem(key, 1, msgStr);
        await this.redis.hincrby(`dlq:${this.name}:stats`, 'total', -1);
        return true;
      }
    }

    return false;
  }

  /**
   * Replay message back to original destination
   */
  async replay(messageId: string): Promise<boolean> {
    const messages = await this.getMessages();
    const dlqMessage = messages.find(
      m => m.envelope.metadata.messageId === messageId
    );

    if (!dlqMessage) {
      return false;
    }

    // Message would be replayed by the caller
    this.emit('message:replay', {
      messageId,
      originalTopic: dlqMessage.originalTopic,
      originalQueue: dlqMessage.originalQueue
    });

    await this.remove(messageId);
    return true;
  }

  /**
   * Replay all messages
   */
  async replayAll(): Promise<number> {
    const messages = await this.getMessages(0, 1000);

    for (const dlqMessage of messages) {
      await this.replay(dlqMessage.envelope.metadata.messageId);
    }

    return messages.length;
  }

  /**
   * Purge DLQ
   */
  async purge(): Promise<number> {
    const key = `dlq:${this.name}`;
    const count = await this.redis.llen(key);
    await this.redis.del(key);
    await this.redis.del(`dlq:${this.name}:stats`);

    this.emit('dlq:purged', { count });

    return count;
  }

  /**
   * Get DLQ statistics
   */
  async getStats(): Promise<DLQStats> {
    const messages = await this.getMessages();
    const statsKey = `dlq:${this.name}:stats`;
    const stats = await this.redis.hgetall(statsKey);

    const messagesByReason: Record<string, number> = {};
    for (const [key, value] of Object.entries(stats)) {
      if (key.startsWith('reason:')) {
        const reason = key.substring(7);
        messagesByReason[reason] = parseInt(value, 10);
      }
    }

    let oldestMessage: Date | undefined;
    let newestMessage: Date | undefined;

    if (messages.length > 0) {
      oldestMessage = new Date(
        messages[messages.length - 1].failedAt
      );
      newestMessage = new Date(messages[0].failedAt);
    }

    return {
      totalMessages: messages.length,
      oldestMessage,
      newestMessage,
      messagesByReason
    };
  }

  /**
   * Get DLQ name
   */
  getName(): string {
    return this.name;
  }
}

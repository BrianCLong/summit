/**
 * Message Persistence Manager
 * Stores messages in Redis for replay on reconnection
 */

import Redis from 'ioredis';
import { Message } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

export class MessagePersistence {
  private redis: Redis;
  private readonly ttl: number;
  private readonly maxMessages: number;
  private readonly keyPrefix = 'messages';

  constructor(redis: Redis, ttlSeconds = 3600, maxMessages = 1000) {
    this.redis = redis;
    this.ttl = ttlSeconds;
    this.maxMessages = maxMessages;
  }

  /**
   * Store a message
   */
  public async storeMessage(message: Omit<Message, 'id'>): Promise<Message> {
    const fullMessage: Message = {
      id: randomUUID(),
      ...message,
      timestamp: message.timestamp || Date.now(),
    };

    const key = this.getRoomKey(message.room);
    const value = JSON.stringify(fullMessage);
    const score = fullMessage.timestamp;

    // Use sorted set for chronological ordering
    const pipeline = this.redis.pipeline();
    pipeline.zadd(key, score, value);
    pipeline.zremrangebyrank(key, 0, -(this.maxMessages + 1)); // Keep only latest N messages
    pipeline.expire(key, fullMessage.ttl || this.ttl);

    await pipeline.exec();

    logger.debug(
      {
        messageId: fullMessage.id,
        room: message.room,
        from: message.from,
      },
      'Message stored'
    );

    return fullMessage;
  }

  /**
   * Get recent messages from a room
   */
  public async getRecentMessages(
    room: string,
    limit = 100,
    since?: number
  ): Promise<Message[]> {
    const key = this.getRoomKey(room);

    // Get messages with timestamp > since
    const minScore = since || '-inf';
    const values = await this.redis.zrangebyscore(
      key,
      minScore,
      '+inf',
      'LIMIT',
      0,
      limit
    );

    const messages: Message[] = [];

    for (const value of values) {
      try {
        const message: Message = JSON.parse(value);
        messages.push(message);
      } catch (error) {
        logger.warn({ error, value }, 'Failed to parse persisted message');
      }
    }

    return messages;
  }

  /**
   * Get messages in time range
   */
  public async getMessagesByTimeRange(
    room: string,
    startTime: number,
    endTime: number
  ): Promise<Message[]> {
    const key = this.getRoomKey(room);
    const values = await this.redis.zrangebyscore(key, startTime, endTime);

    const messages: Message[] = [];

    for (const value of values) {
      try {
        const message: Message = JSON.parse(value);
        messages.push(message);
      } catch (error) {
        logger.warn({ error }, 'Failed to parse message');
      }
    }

    return messages;
  }

  /**
   * Get message by ID
   */
  public async getMessage(room: string, messageId: string): Promise<Message | null> {
    const messages = await this.getRecentMessages(room, 1000);
    return messages.find(m => m.id === messageId) || null;
  }

  /**
   * Delete messages older than timestamp
   */
  public async deleteOldMessages(room: string, beforeTimestamp: number): Promise<number> {
    const key = this.getRoomKey(room);
    const deleted = await this.redis.zremrangebyscore(key, '-inf', beforeTimestamp);

    logger.debug({ room, deleted, beforeTimestamp }, 'Deleted old messages');

    return deleted;
  }

  /**
   * Clear all messages in a room
   */
  public async clearRoom(room: string): Promise<void> {
    const key = this.getRoomKey(room);
    await this.redis.del(key);

    logger.debug({ room }, 'Room messages cleared');
  }

  /**
   * Get message count for a room
   */
  public async getMessageCount(room: string): Promise<number> {
    const key = this.getRoomKey(room);
    return await this.redis.zcard(key);
  }

  /**
   * Get statistics
   */
  public async getStats(): Promise<{
    totalRooms: number;
    totalMessages: number;
    oldestMessage: number | null;
    newestMessage: number | null;
  }> {
    const pattern = `${this.keyPrefix}:room:*`;
    let totalMessages = 0;
    let oldestMessage: number | null = null;
    let newestMessage: number | null = null;

    let cursor = '0';
    let roomCount = 0;

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = newCursor;
      roomCount += keys.length;

      for (const key of keys) {
        const count = await this.redis.zcard(key);
        totalMessages += count;

        if (count > 0) {
          // Get oldest and newest timestamps
          const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
          const newest = await this.redis.zrange(key, -1, -1, 'WITHSCORES');

          if (oldest.length >= 2) {
            const timestamp = parseFloat(oldest[1]);
            if (oldestMessage === null || timestamp < oldestMessage) {
              oldestMessage = timestamp;
            }
          }

          if (newest.length >= 2) {
            const timestamp = parseFloat(newest[1]);
            if (newestMessage === null || timestamp > newestMessage) {
              newestMessage = timestamp;
            }
          }
        }
      }
    } while (cursor !== '0');

    return {
      totalRooms: roomCount,
      totalMessages,
      oldestMessage,
      newestMessage,
    };
  }

  /**
   * Cleanup expired messages across all rooms
   */
  public async cleanupExpired(): Promise<number> {
    const pattern = `${this.keyPrefix}:room:*`;
    let totalDeleted = 0;
    const now = Date.now();

    let cursor = '0';

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = newCursor;

      for (const key of keys) {
        const expiredBefore = now - this.ttl * 1000;
        const deleted = await this.redis.zremrangebyscore(key, '-inf', expiredBefore);
        totalDeleted += deleted;

        // Remove empty keys
        const remaining = await this.redis.zcard(key);
        if (remaining === 0) {
          await this.redis.del(key);
        }
      }
    } while (cursor !== '0');

    if (totalDeleted > 0) {
      logger.info({ totalDeleted }, 'Cleaned up expired messages');
    }

    return totalDeleted;
  }

  private getRoomKey(room: string): string {
    return `${this.keyPrefix}:room:${room}`;
  }
}

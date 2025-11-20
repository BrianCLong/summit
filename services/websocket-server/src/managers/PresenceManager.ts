/**
 * Presence Tracking Manager
 * Manages user presence across rooms with Redis persistence
 */

import Redis from 'ioredis';
import { PresenceInfo, PresenceStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class PresenceManager {
  private redis: Redis;
  private readonly ttl: number;
  private readonly keyPrefix = 'presence';

  constructor(redis: Redis, ttlSeconds = 300) {
    this.redis = redis;
    this.ttl = ttlSeconds;
  }

  /**
   * Set user presence in a room
   */
  public async setPresence(
    room: string,
    userId: string,
    data: Partial<PresenceInfo>
  ): Promise<void> {
    const key = this.getRoomKey(room);
    const presence: PresenceInfo = {
      userId,
      status: data.status || 'online',
      lastSeen: Date.now(),
      username: data.username,
      metadata: data.metadata,
    };

    await this.redis
      .multi()
      .hset(key, userId, JSON.stringify(presence))
      .expire(key, this.ttl)
      .exec();

    logger.debug({ room, userId, status: presence.status }, 'Presence set');
  }

  /**
   * Update user presence status
   */
  public async updateStatus(
    room: string,
    userId: string,
    status: PresenceStatus,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const key = this.getRoomKey(room);
    const existingData = await this.redis.hget(key, userId);

    if (existingData) {
      const presence: PresenceInfo = JSON.parse(existingData);
      presence.status = status;
      presence.lastSeen = Date.now();

      if (metadata) {
        presence.metadata = { ...presence.metadata, ...metadata };
      }

      await this.redis
        .multi()
        .hset(key, userId, JSON.stringify(presence))
        .expire(key, this.ttl)
        .exec();

      logger.debug({ room, userId, status }, 'Presence status updated');
    }
  }

  /**
   * Touch user presence (update lastSeen)
   */
  public async touchPresence(room: string, userId: string): Promise<void> {
    const key = this.getRoomKey(room);
    const existingData = await this.redis.hget(key, userId);

    if (existingData) {
      const presence: PresenceInfo = JSON.parse(existingData);
      presence.lastSeen = Date.now();

      await this.redis
        .multi()
        .hset(key, userId, JSON.stringify(presence))
        .expire(key, this.ttl)
        .exec();
    }
  }

  /**
   * Remove user presence from room
   */
  public async removePresence(room: string, userId: string): Promise<void> {
    const key = this.getRoomKey(room);
    await this.redis.hdel(key, userId);

    logger.debug({ room, userId }, 'Presence removed');
  }

  /**
   * Get all presence in a room
   */
  public async getRoomPresence(room: string): Promise<PresenceInfo[]> {
    const key = this.getRoomKey(room);
    const data = await this.redis.hgetall(key);

    const presence: PresenceInfo[] = [];
    const now = Date.now();
    const staleThreshold = this.ttl * 1000;

    for (const [userId, json] of Object.entries(data)) {
      try {
        const info: PresenceInfo = JSON.parse(json);

        // Filter out stale presence
        if (now - info.lastSeen < staleThreshold) {
          presence.push(info);
        } else {
          // Clean up stale entry
          await this.redis.hdel(key, userId);
        }
      } catch (error) {
        logger.warn({ userId, error }, 'Failed to parse presence data');
      }
    }

    return presence;
  }

  /**
   * Get user presence in a room
   */
  public async getUserPresence(room: string, userId: string): Promise<PresenceInfo | null> {
    const key = this.getRoomKey(room);
    const data = await this.redis.hget(key, userId);

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch (error) {
      logger.warn({ room, userId, error }, 'Failed to parse user presence');
      return null;
    }
  }

  /**
   * Get all rooms where user is present
   */
  public async getUserRooms(userId: string): Promise<string[]> {
    const pattern = `${this.keyPrefix}:room:*`;
    const rooms: string[] = [];

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
        const hasUser = await this.redis.hexists(key, userId);
        if (hasUser) {
          const room = key.replace(`${this.keyPrefix}:room:`, '');
          rooms.push(room);
        }
      }
    } while (cursor !== '0');

    return rooms;
  }

  /**
   * Clear all presence in a room
   */
  public async clearRoom(room: string): Promise<void> {
    const key = this.getRoomKey(room);
    await this.redis.del(key);
    logger.debug({ room }, 'Room presence cleared');
  }

  /**
   * Get presence statistics
   */
  public async getStats(): Promise<{
    totalRooms: number;
    totalUsers: number;
    byStatus: Record<PresenceStatus, number>;
  }> {
    const pattern = `${this.keyPrefix}:room:*`;
    const userIds = new Set<string>();
    const statusCounts: Record<PresenceStatus, number> = {
      online: 0,
      away: 0,
      busy: 0,
      offline: 0,
    };

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
        const data = await this.redis.hgetall(key);

        for (const [userId, json] of Object.entries(data)) {
          userIds.add(userId);

          try {
            const info: PresenceInfo = JSON.parse(json);
            statusCounts[info.status]++;
          } catch (error) {
            // Ignore parse errors in stats
          }
        }
      }
    } while (cursor !== '0');

    return {
      totalRooms: roomCount,
      totalUsers: userIds.size,
      byStatus: statusCounts,
    };
  }

  private getRoomKey(room: string): string {
    return `${this.keyPrefix}:room:${room}`;
  }
}

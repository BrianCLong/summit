/**
 * Notification Throttler
 *
 * Handles rate limiting, deduplication, quiet hours, and batching
 * to prevent notification fatigue while ensuring critical alerts are delivered.
 */

import type Redis from 'ioredis';
import type {
  AuditEvent,
  NotificationMessage,
  NotificationPreferences,
  NotificationSeverity,
  ThrottlingConfig,
  ThrottlingResult,
} from './types.js';
import { requiresImmediateNotification } from './severity-calculator.js';

export class NotificationThrottler {
  private redis: Redis;
  private config: ThrottlingConfig;

  constructor(redis: Redis, config: Partial<ThrottlingConfig> = {}) {
    this.redis = redis;
    this.config = {
      maxPerMinute: config.maxPerMinute ?? 10,
      maxPerHour: config.maxPerHour ?? 100,
      deduplicationWindow: config.deduplicationWindow ?? 5 * 60 * 1000, // 5 minutes
      batchingWindow: config.batchingWindow ?? 15 * 60 * 1000, // 15 minutes
      quietHoursEnabled: config.quietHoursEnabled ?? true,
    };
  }

  /**
   * Check if notification should be delivered based on throttling rules
   */
  async shouldDeliver(
    message: NotificationMessage,
    event: AuditEvent,
    preferences: NotificationPreferences
  ): Promise<ThrottlingResult> {
    // Critical/emergency events always bypass throttling
    if (
      message.severity === 'critical' ||
      message.severity === 'emergency' ||
      requiresImmediateNotification(event, message.severity)
    ) {
      return { shouldDeliver: true };
    }

    // Check quiet hours first
    if (this.config.quietHoursEnabled) {
      const inQuietHours = await this.isInQuietHours(preferences);
      if (inQuietHours) {
        // High severity can bypass quiet hours
        if (message.severity === 'high') {
          // Allow, but log that we bypassed quiet hours
        } else {
          await this.queueForLater(message);
          return {
            shouldDeliver: false,
            reason: 'quiet_hours',
            queuedForLater: true,
          };
        }
      }
    }

    // Check rate limits
    const rateLimitResult = await this.checkRateLimit(message, preferences);
    if (!rateLimitResult.allowed) {
      await this.logThrottled(message, 'rate_limit');
      return {
        shouldDeliver: false,
        reason: 'rate_limit',
      };
    }

    // Check deduplication
    const isDuplicate = await this.checkDeduplication(message, event);
    if (isDuplicate) {
      return {
        shouldDeliver: false,
        reason: 'duplicate',
      };
    }

    return { shouldDeliver: true };
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private async isInQuietHours(
    preferences: NotificationPreferences
  ): Promise<boolean> {
    if (
      !preferences.quiet_hours_start ||
      !preferences.quiet_hours_end ||
      !preferences.enabled
    ) {
      return false;
    }

    const timezone = preferences.quiet_hours_timezone || 'UTC';
    const now = new Date();

    // Convert current time to user's timezone
    const userTime = new Date(
      now.toLocaleString('en-US', { timeZone: timezone })
    );
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Parse quiet hours (format: "HH:MM:SS")
    const [startHour, startMinute] = preferences.quiet_hours_start
      .split(':')
      .map(Number);
    const [endHour, endMinute] = preferences.quiet_hours_end
      .split(':')
      .map(Number);

    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTimeInMinutes > endTimeInMinutes) {
      return (
        currentTimeInMinutes >= startTimeInMinutes ||
        currentTimeInMinutes <= endTimeInMinutes
      );
    }

    return (
      currentTimeInMinutes >= startTimeInMinutes &&
      currentTimeInMinutes <= endTimeInMinutes
    );
  }

  /**
   * Check rate limits (per minute and per hour)
   */
  private async checkRateLimit(
    message: NotificationMessage,
    preferences: NotificationPreferences
  ): Promise<{ allowed: boolean; remaining: number }> {
    const userId = message.userId;
    const channel = message.channel;

    // Per-minute rate limit
    const minuteKey = `rate:${userId}:${channel}:minute`;
    const minuteCount = await this.redis.incr(minuteKey);

    if (minuteCount === 1) {
      // First message in this window, set expiry
      await this.redis.expire(minuteKey, 60); // 1 minute
    }

    if (minuteCount > this.config.maxPerMinute) {
      return { allowed: false, remaining: 0 };
    }

    // Per-hour rate limit (use user preference if set)
    const hourLimit =
      preferences.max_notifications_per_hour || this.config.maxPerHour;
    const hourKey = `rate:${userId}:${channel}:hour`;
    const hourCount = await this.redis.incr(hourKey);

    if (hourCount === 1) {
      await this.redis.expire(hourKey, 3600); // 1 hour
    }

    if (hourCount > hourLimit) {
      return { allowed: false, remaining: 0 };
    }

    return {
      allowed: true,
      remaining: hourLimit - hourCount,
    };
  }

  /**
   * Check if this notification is a duplicate of a recent one
   */
  private async checkDeduplication(
    message: NotificationMessage,
    event: AuditEvent
  ): Promise<boolean> {
    // Create deduplication key based on event characteristics
    const dedupKey = this.createDeduplicationKey(message, event);

    const exists = await this.redis.exists(dedupKey);
    if (exists) {
      // Increment duplicate counter
      await this.redis.incr(`${dedupKey}:count`);
      return true;
    }

    // Set deduplication key with expiry
    const ttlSeconds = Math.floor(this.config.deduplicationWindow / 1000);
    await this.redis.setex(dedupKey, ttlSeconds, '1');
    await this.redis.setex(`${dedupKey}:count`, ttlSeconds, '1');

    return false;
  }

  /**
   * Create deduplication key based on event characteristics
   */
  private createDeduplicationKey(
    message: NotificationMessage,
    event: AuditEvent
  ): string {
    // For deduplication, consider:
    // - User ID (same user)
    // - Event type (same type of event)
    // - Resource (same resource being acted upon)
    const parts = [
      'dedup',
      message.userId,
      event.event_type,
      event.resource_type || 'none',
      event.resource_id || 'none',
    ];

    return parts.join(':');
  }

  /**
   * Queue notification for later delivery (after quiet hours)
   */
  private async queueForLater(message: NotificationMessage): Promise<void> {
    const queueKey = `queue:delayed:${message.userId}`;

    await this.redis.zadd(
      queueKey,
      Date.now() + this.config.batchingWindow,
      JSON.stringify(message)
    );

    // Set expiry on queue to prevent unbounded growth
    await this.redis.expire(queueKey, 86400); // 24 hours
  }

  /**
   * Get queued notifications ready for delivery
   */
  async getQueuedNotifications(
    userId: string
  ): Promise<NotificationMessage[]> {
    const queueKey = `queue:delayed:${userId}`;
    const now = Date.now();

    // Get all items with score <= now (ready for delivery)
    const items = await this.redis.zrangebyscore(queueKey, 0, now);

    if (items.length === 0) {
      return [];
    }

    // Remove delivered items from queue
    await this.redis.zremrangebyscore(queueKey, 0, now);

    return items.map((item) => JSON.parse(item) as NotificationMessage);
  }

  /**
   * Log throttled notification
   */
  private async logThrottled(
    message: NotificationMessage,
    reason: string
  ): Promise<void> {
    const logKey = `throttled:${message.userId}:${message.channel}`;

    await this.redis.hincrby(logKey, reason, 1);
    await this.redis.expire(logKey, 3600); // Keep for 1 hour

    // Also increment global throttle counter for monitoring
    await this.redis.hincrby('throttled:global', reason, 1);
  }

  /**
   * Get throttling statistics for a user
   */
  async getThrottlingStats(
    userId: string,
    channel: string
  ): Promise<Record<string, number>> {
    const logKey = `throttled:${userId}:${channel}`;
    const stats = await this.redis.hgetall(logKey);

    return Object.fromEntries(
      Object.entries(stats).map(([key, value]) => [key, parseInt(value, 10)])
    );
  }

  /**
   * Get global throttling statistics (for monitoring)
   */
  async getGlobalThrottlingStats(): Promise<Record<string, number>> {
    const stats = await this.redis.hgetall('throttled:global');

    return Object.fromEntries(
      Object.entries(stats).map(([key, value]) => [key, parseInt(value, 10)])
    );
  }

  /**
   * Check if user should receive digest email instead of individual notifications
   */
  shouldBatch(
    severity: NotificationSeverity,
    preferences: NotificationPreferences
  ): boolean {
    // Don't batch high-severity notifications
    if (
      severity === 'critical' ||
      severity === 'emergency' ||
      severity === 'high'
    ) {
      return false;
    }

    // Check user's digest preference
    if (preferences.email_digest_frequency === 'immediate') {
      return false;
    }

    return true;
  }

  /**
   * Add notification to batch queue
   */
  async addToBatch(
    message: NotificationMessage,
    preferences: NotificationPreferences
  ): Promise<void> {
    const batchKey = `batch:${message.userId}:${preferences.email_digest_frequency}`;

    await this.redis.rpush(batchKey, JSON.stringify(message));
    await this.redis.expire(batchKey, 86400); // 24 hours max

    // Set scheduled delivery time if not already set
    const scheduleKey = `batch:schedule:${message.userId}:${preferences.email_digest_frequency}`;
    const scheduleExists = await this.redis.exists(scheduleKey);

    if (!scheduleExists) {
      const deliveryTime = this.calculateBatchDeliveryTime(
        preferences.email_digest_frequency || 'daily'
      );
      await this.redis.setex(scheduleKey, 86400, deliveryTime.toString());
    }
  }

  /**
   * Get batched notifications ready for delivery
   */
  async getBatchedNotifications(
    userId: string,
    frequency: 'hourly' | 'daily'
  ): Promise<NotificationMessage[]> {
    const batchKey = `batch:${userId}:${frequency}`;
    const items = await this.redis.lrange(batchKey, 0, -1);

    if (items.length === 0) {
      return [];
    }

    // Clear the batch
    await this.redis.del(batchKey);

    // Clear the schedule
    await this.redis.del(`batch:schedule:${userId}:${frequency}`);

    return items.map((item) => JSON.parse(item) as NotificationMessage);
  }

  /**
   * Calculate when to deliver batch notifications
   */
  private calculateBatchDeliveryTime(
    frequency: 'hourly' | 'daily' | 'immediate' | 'never'
  ): number {
    const now = Date.now();

    switch (frequency) {
      case 'hourly':
        // Top of next hour
        return now + (3600 - ((now / 1000) % 3600)) * 1000;
      case 'daily':
        // 8am tomorrow
        const tomorrow = new Date(now + 86400000);
        tomorrow.setHours(8, 0, 0, 0);
        return tomorrow.getTime();
      default:
        return now;
    }
  }

  /**
   * Reset rate limits for a user (admin function)
   */
  async resetRateLimits(userId: string): Promise<void> {
    const pattern = `rate:${userId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Clear all throttling state for a user (admin function)
   */
  async clearThrottlingState(userId: string): Promise<void> {
    const patterns = [
      `rate:${userId}:*`,
      `dedup:${userId}:*`,
      `queue:delayed:${userId}`,
      `batch:${userId}:*`,
      `throttled:${userId}:*`,
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}

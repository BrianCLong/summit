import { DateTime, Duration } from 'luxon';
import Redis from 'ioredis';
import { QuotaStore, QuotaState } from './store';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

export class RedisQuotaStore implements QuotaStore {
  private client: Redis;

  constructor(redisClient: Redis = redis) {
    this.client = redisClient;
  }

  private getKey(model: string, unit: string, timestamp: number, period: 'minute' | 'hour' | 'day' | 'week'): string {
    let datePart;
    const dt = DateTime.fromMillis(timestamp);
    switch (period) {
      case 'minute': datePart = dt.toFormat('yyyyMMddHHmm'); break;
      case 'hour': datePart = dt.toFormat('yyyyMMddHH'); break;
      case 'day': datePart = dt.toFormat('yyyyMMdd'); break;
      case 'week': datePart = dt.toFormat('yyyyW'); break;
    }
    return `quota:${model}:${unit}:${period}:${datePart}`;
  }

  async record(model: string, unit: 'messages' | 'tokens' | 'requests', amount: number): Promise<void> {
    const now = Date.now();
    const pipeline = this.client.pipeline();

    // Record for minute, hour, day, week buckets
    const minuteKey = this.getKey(model, unit, now, 'minute');
    pipeline.incrby(minuteKey, amount);
    pipeline.expire(minuteKey, 60 * 60 * 24 * 7); // Keep for 7 days

    const hourKey = this.getKey(model, unit, now, 'hour');
    pipeline.incrby(hourKey, amount);
    pipeline.expire(hourKey, 60 * 60 * 24 * 7); // Keep for 7 days

    const dayKey = this.getKey(model, unit, now, 'day');
    pipeline.incrby(dayKey, amount);
    pipeline.expire(dayKey, 60 * 60 * 24 * 7); // Keep for 7 days

    const weekKey = this.getKey(model, unit, now, 'week');
    pipeline.incrby(weekKey, amount);
    pipeline.expire(weekKey, 60 * 60 * 24 * 7); // Keep for 7 days

    // Earliest event tracking for rolling window ETA
    const earliestEventKey = `quota:${model}:${unit}:earliest`;
    pipeline.zadd(earliestEventKey, 'NX', now, now.toString()); // Add if not exists
    pipeline.expire(earliestEventKey, 60 * 60 * 24 * 7); // Keep for 7 days

    await pipeline.exec();
  }

  async usedInRolling(model: string, unit: string, window: Duration): Promise<number> {
    const cutoff = DateTime.now().minus(window);
    const pipeline = this.client.pipeline();
    let totalUsed = 0;

    // Sum up minute buckets within the rolling window
    const startMinute = cutoff.startOf('minute');
    const endMinute = DateTime.now().startOf('minute');

    let currentMinute = startMinute;
    while (currentMinute <= endMinute) {
      const key = this.getKey(model, unit, currentMinute.toMillis(), 'minute');
      pipeline.get(key);
      currentMinute = currentMinute.plus({ minutes: 1 });
    }

    const results = await pipeline.exec();
    for (const [, result] of results) {
      if (result) totalUsed += parseInt(result as string, 10);
    }

    return totalUsed;
  }

  async usedInFixed(model: string, unit: string, period: 'daily' | 'weekly', tz: string): Promise<{ used: number; windowStart: string; windowEnd: string }> {
    const now = DateTime.now().setZone(tz);
    let start: DateTime;
    let end: DateTime;
    let key: string;

    if (period === 'daily') {
      start = now.startOf('day');
      end = now.endOf('day');
      key = this.getKey(model, unit, now.toMillis(), 'day');
    } else { // weekly
      start = now.startOf('week');
      end = now.endOf('week');
      key = this.getKey(model, unit, now.toMillis(), 'week');
    }

    const used = parseInt(await this.client.get(key) || '0', 10);
    return { used, windowStart: start.toISO(), windowEnd: end.toISO() };
  }

  async getEarliestEventTimestamp(model: string, unit: string): Promise<number | null> {
    const earliestEventKey = `quota:${model}:${unit}:earliest`;
    const result = await this.client.zrange(earliestEventKey, 0, 0);
    return result.length > 0 ? parseInt(result[0], 10) : null;
  }
}

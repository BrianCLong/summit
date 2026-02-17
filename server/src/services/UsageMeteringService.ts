/**
 * Usage Metering Service - records usage metrics for billing and analytics
 * Implementation Status (P1-2): Redis-backed storage with basic aggregation
 */

import { RedisService } from '../cache/redis.js';
import { logger } from '../config/logger.js';

export interface UsageEvent {
  id: string;
  tenantId: string;
  dimension: string;
  quantity: number;
  unit: string;
  source: string;
  metadata?: Record<string, any>;
  occurredAt: string;
  recordedAt: string;
}

export interface UsageAggregation {
  tenantId: string;
  dimension: string;
  totalQuantity: number;
  eventCount: number;
  startDate: string;
  endDate: string;
}

export class UsageMeteringService {
  private redis: RedisService;
  private readonly EVENT_TTL = 60 * 60 * 24 * 90; // 90 days retention

  constructor() {
    this.redis = RedisService.getInstance();
    logger.info('[UsageMeteringService] Initialized with Redis');
  }

  async record(event: UsageEvent): Promise<void> {
    if (!event.id) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 11);
      event.id = 'usage_' + timestamp + '_' + random;
    }

    const client = this.redis.getClient();
    const eventKey = `usage:event:${event.id}`;
    const timelineKey = `usage:events:zset:${event.tenantId}`;
    const score = new Date(event.occurredAt).getTime();

    // Store event data
    await client.setex(eventKey, this.EVENT_TTL, JSON.stringify(event));

    // Add to timeline
    await client.zadd(timelineKey, score, event.id);

    // Set expiry on timeline (approximate, refreshes on write)
    await client.expire(timelineKey, this.EVENT_TTL);

    logger.debug('[UsageMeteringService] Recorded:', event.tenantId, event.dimension, event.quantity);
  }

  async getAggregation(tenantId: string, dimension: string, startDate: string, endDate: string): Promise<UsageAggregation> {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const events = await this.getEvents(tenantId, { dimension, startDate, endDate, limit: 10000 }); // High limit for aggregation

    let totalQuantity = 0;

    for (const event of events) {
      totalQuantity += event.quantity;
    }

    return {
      tenantId,
      dimension,
      totalQuantity,
      eventCount: events.length,
      startDate,
      endDate
    };
  }

  async getEvents(tenantId: string, options?: { dimension?: string; startDate?: string; endDate?: string; limit?: number }): Promise<UsageEvent[]> {
    const start = options?.startDate ? new Date(options.startDate).getTime() : 0;
    const end = options?.endDate ? new Date(options.endDate).getTime() : Date.now();
    const limit = options?.limit || 1000;
    const dimension = options?.dimension;

    const client = this.redis.getClient();
    const timelineKey = `usage:events:zset:${tenantId}`;

    // Get event IDs from timeline (reverse chronological order)
    // Use zrevrangebyscore which is standard in ioredis
    const eventIds = await client.zrevrangebyscore(timelineKey, end, start);

    if (eventIds.length === 0) {
      return [];
    }

    // Fetch event details
    // We fetch all in range, then filter by dimension and limit
    // Note: If range is huge, this might be inefficient.
    // Optimization: create separate zsets per dimension if needed.

    const events: UsageEvent[] = [];
    const batchSize = 100; // Fetch in batches to avoid huge MGETs if needed, but MGET is fast

    // Simple MGET for now
    const eventKeys = eventIds.map(id => `usage:event:${id}`);

    // Redis MGET
    // Split into chunks if too many
    for (let i = 0; i < eventKeys.length; i += batchSize) {
        if (events.length >= limit) break;

        const keysChunk = eventKeys.slice(i, i + batchSize);
        const eventJsonList = await client.mget(...keysChunk);

        for (const json of eventJsonList) {
            if (!json) continue;
            try {
                const event = JSON.parse(json);
                if (dimension && event.dimension !== dimension) continue;
                events.push(event);
                if (events.length >= limit) break;
            } catch (e) {
                logger.warn('Failed to parse usage event JSON', e);
            }
        }
    }

    return events;
  }
}

export const usageMeteringService = new UsageMeteringService();

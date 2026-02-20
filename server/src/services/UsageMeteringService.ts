/**
 * Usage Metering Service - records usage metrics for billing and analytics
 * Implementation Status (P1-2): Redis storage with aggregation
 */

import { getRedisClient } from '../db/redis.js';
import logger from '../config/logger.js';

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
  private get redis() {
    return getRedisClient();
  }

  constructor() {
    logger.info('[UsageMeteringService] Initialized with Redis');
  }

  async record(event: UsageEvent): Promise<void> {
    if (!event.id) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 11);
      event.id = 'usage_' + timestamp + '_' + random;
    }

    const key = `usage:event:${event.id}`;
    const timelineKey = `usage:timeline:${event.tenantId}:${event.dimension}`;
    const score = new Date(event.occurredAt).getTime();

    const pipeline = this.redis.pipeline();

    // Store event data as a Hash
    const eventData: Record<string, string | number> = {
      id: event.id,
      tenantId: event.tenantId,
      dimension: event.dimension,
      quantity: event.quantity,
      unit: event.unit,
      source: event.source,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
    };

    if (event.metadata) {
      eventData.metadata = JSON.stringify(event.metadata);
    }

    pipeline.hset(key, eventData);
    // Index by timestamp for range queries
    pipeline.zadd(timelineKey, score, event.id);
    // Also index by tenant only if needed, but dimension is usually required for aggregation
    // We can also have a global tenant timeline: usage:timeline:<tenantId>
    pipeline.zadd(`usage:timeline:${event.tenantId}`, score, event.id);

    await pipeline.exec();
    logger.debug({ tenantId: event.tenantId, dimension: event.dimension, quantity: event.quantity }, '[UsageMeteringService] Recorded event');
  }

  async getAggregation(tenantId: string, dimension: string, startDate: string, endDate: string): Promise<UsageAggregation> {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const timelineKey = `usage:timeline:${tenantId}:${dimension}`;

    // Get event IDs in range
    const eventIds = await this.redis.zrangebyscore(timelineKey, start, end);

    let totalQuantity = 0;
    let eventCount = 0;

    if (eventIds.length > 0) {
      const pipeline = this.redis.pipeline();
      for (const id of eventIds) {
        pipeline.hget(id.startsWith('usage:event:') ? id : `usage:event:${id}`, 'quantity');
      }
      const results = await pipeline.exec();

      if (results) {
        for (const [err, quantity] of results) {
          if (!err && quantity) {
            totalQuantity += Number(quantity);
            eventCount++;
          }
        }
      }
    }

    return { tenantId, dimension, totalQuantity, eventCount, startDate, endDate };
  }

  async getEvents(tenantId: string, options?: { dimension?: string; startDate?: string; endDate?: string; limit?: number }): Promise<UsageEvent[]> {
    const start = options?.startDate ? new Date(options.startDate).getTime() : 0;
    const end = options?.endDate ? new Date(options.endDate).getTime() : Date.now();
    const limit = options?.limit || 1000;

    let eventIds: string[] = [];

    if (options?.dimension) {
      const timelineKey = `usage:timeline:${tenantId}:${options.dimension}`;
      // Use zrevrangebyscore for latest first
      eventIds = await this.redis.zrevrangebyscore(timelineKey, end, start, 'LIMIT', 0, limit);
    } else {
      const timelineKey = `usage:timeline:${tenantId}`;
      eventIds = await this.redis.zrevrangebyscore(timelineKey, end, start, 'LIMIT', 0, limit);
    }

    if (eventIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const id of eventIds) {
      pipeline.hgetall(id.startsWith('usage:event:') ? id : `usage:event:${id}`);
    }

    const results = await pipeline.exec();
    const events: UsageEvent[] = [];

    if (results) {
      for (const [err, data] of results) {
        if (!err && data && Object.keys(data).length > 0) {
          const event = data as any;
          // Parse metadata if it exists
          if (event.metadata && typeof event.metadata === 'string') {
            try {
              event.metadata = JSON.parse(event.metadata);
            } catch (e) {
              // ignore parse error
            }
          }
          // Convert numbers
          event.quantity = Number(event.quantity);
          events.push(event as UsageEvent);
        }
      }
    }

    return events;
  }
}

export const usageMeteringService = new UsageMeteringService();

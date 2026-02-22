/**
 * Usage Metering Service - records usage metrics for billing and analytics
 * Implementation Status (P1-2): Redis-backed storage with aggregations
 */

import { getRedisClient } from '../db/redis.js';

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
  private redis = getRedisClient();

  constructor() {
    console.info('[UsageMeteringService] Initialized with Redis');
  }

  async record(event: UsageEvent): Promise<void> {
    if (!event.id) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 11);
      event.id = 'usage_' + timestamp + '_' + random;
    }

    const eventKey = `metering:event:${event.id}`;
    const tenantKey = `metering:tenant:${event.tenantId}:events`;
    const score = new Date(event.occurredAt).getTime();

    // Store event data
    await this.redis.set(eventKey, JSON.stringify(event));
    // Index by tenant and time
    await this.redis.zadd(tenantKey, score, event.id);

    // Set expiry (optional, e.g. 90 days)
    await this.redis.expire(eventKey, 90 * 24 * 60 * 60);

    console.debug('[UsageMeteringService] Recorded:', event.tenantId, event.dimension, event.quantity);
  }

  async getAggregation(tenantId: string, dimension: string, startDate: string, endDate: string): Promise<UsageAggregation> {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const tenantKey = `metering:tenant:${tenantId}:events`;

    // Get event IDs in range
    const eventIds = await this.redis.zrangebyscore(tenantKey, start, end);

    let totalQuantity = 0;
    let eventCount = 0;

    if (eventIds.length > 0) {
        const pipeline = this.redis.pipeline();
        eventIds.forEach((id: string) => pipeline.get(`metering:event:${id}`));
        const results = await pipeline.exec();

        for (const [err, result] of results || []) {
            if (err || !result) continue;
            const event = JSON.parse(result as string) as UsageEvent;
            if (event.dimension === dimension) {
                totalQuantity += event.quantity;
                eventCount++;
            }
        }
    }

    return { tenantId, dimension, totalQuantity, eventCount, startDate, endDate };
  }

  async getEvents(tenantId: string, options?: { dimension?: string; startDate?: string; endDate?: string; limit?: number }): Promise<UsageEvent[]> {
    const start = options?.startDate ? new Date(options.startDate).getTime() : 0;
    const end = options?.endDate ? new Date(options.endDate).getTime() : Date.now();
    const limit = options?.limit || 1000;
    const tenantKey = `metering:tenant:${tenantId}:events`;

    // ZREVRANGEBYSCORE for descending order (newest first)
    // Note: ioredis uses string arguments for infinity
    const eventIds = await this.redis.zrevrangebyscore(tenantKey, end, start, 'LIMIT', 0, limit);

    const events: UsageEvent[] = [];
    if (eventIds.length > 0) {
        const pipeline = this.redis.pipeline();
        eventIds.forEach((id: string) => pipeline.get(`metering:event:${id}`));
        const results = await pipeline.exec();

        for (const [err, result] of results || []) {
            if (err || !result) continue;
             const event = JSON.parse(result as string) as UsageEvent;
             if (options?.dimension && event.dimension !== options.dimension) continue;
             events.push(event);
        }
    }

    return events;
  }
}

export const usageMeteringService = new UsageMeteringService();

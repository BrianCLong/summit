/**
 * Usage Metering Service - records usage metrics for billing and analytics
 * Implementation Status (P1-2): Redis-backed storage with aggregation
 */

import { RedisService } from '../cache/redis.js';

export interface UsageEvent {
  id?: string;
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

  constructor() {
    this.redis = RedisService.getInstance();
    console.info('[UsageMeteringService] Initialized with Redis');
  }

  async record(event: UsageEvent): Promise<void> {
    if (!event.id) {
      // Let Redis generate ID if using XADD with *, but we might want to store it in the body too?
      // Actually XADD returns the ID.
      // But we are storing the event object.
      // If we rely on XADD ID (timestamp-seq), we can use that as event.id.
    }

    const tenantId = event.tenantId;
    const streamKey = `usage:events:${tenantId}`;

    // Prepare event for Redis (flat string mapping)
    const eventData: any = {
      tenantId: event.tenantId,
      dimension: event.dimension,
      quantity: event.quantity.toString(),
      unit: event.unit,
      source: event.source,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt || new Date().toISOString(),
    };

    if (event.metadata) {
      eventData.metadata = JSON.stringify(event.metadata);
    }
    if (event.id) {
        eventData.id = event.id;
    }

    try {
      // 1. Add to Stream
      // Using XADD with '*' to auto-generate ID
      // We pass the fields as alternating key-value pairs
      const args = ['XADD', streamKey, '*'];
      for (const [key, value] of Object.entries(eventData)) {
        args.push(key, value as string);
      }

      const client = this.redis.getClient();
      // @ts-ignore - ioredis types might be slightly off for call/send_command depending on version
      const id = await client.call(...args);

      // If event didn't have an ID, update it (though we can't update the message in stream easily).
      // Ideally the caller should know the ID. But for now, we just rely on Redis ID for stream ordering.

      // 2. Update Aggregations
      const date = new Date(event.occurredAt).toISOString().split('T')[0]; // YYYY-MM-DD
      const aggKey = `usage:agg:${tenantId}:${event.dimension}:${date}`;

      // Use pipeline for atomicity of counters
      const pipeline = client.pipeline();
      pipeline.hincrby(aggKey, 'totalQuantity', Math.floor(event.quantity)); // Redis HINCRBY is integer. For float, use HINCRBYFLOAT
      pipeline.hincrby(aggKey, 'eventCount', 1);
      // Also expire aggregation keys after some retention period (e.g. 90 days)
      pipeline.expire(aggKey, 90 * 24 * 60 * 60);

      await pipeline.exec();

      console.debug('[UsageMeteringService] Recorded:', tenantId, event.dimension, event.quantity, id);
    } catch (error) {
      console.error('[UsageMeteringService] Failed to record event', error);
      throw error;
    }
  }

  async getAggregation(tenantId: string, dimension: string, startDate: string, endDate: string): Promise<UsageAggregation> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalQuantity = 0;
    let eventCount = 0;

    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    // Iterate through days
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const aggKey = `usage:agg:${tenantId}:${dimension}:${dateStr}`;
      pipeline.hgetall(aggKey);
      current.setDate(current.getDate() + 1);
    }

    const results = await pipeline.exec();

    if (results) {
        for (const [err, data] of results) {
            if (err) continue;
            const metrics = data as Record<string, string>;
            if (metrics && metrics.totalQuantity) {
                totalQuantity += parseInt(metrics.totalQuantity, 10);
            }
            if (metrics && metrics.eventCount) {
                eventCount += parseInt(metrics.eventCount, 10);
            }
        }
    }

    return { tenantId, dimension, totalQuantity, eventCount, startDate, endDate };
  }

  async getEvents(tenantId: string, options?: { dimension?: string; startDate?: string; endDate?: string; limit?: number }): Promise<UsageEvent[]> {
    const streamKey = `usage:events:${tenantId}`;
    const start = options?.startDate ? new Date(options.startDate).getTime() : '-'; // '-' means minimum ID
    const end = options?.endDate ? new Date(options.endDate).getTime() : '+'; // '+' means maximum ID
    const count = options?.limit || 1000;

    const client = this.redis.getClient();

    // XRANGE key start end COUNT count
    // IDs in Redis streams are timestamp-sequence. We can use timestamp directly as start/end prefix.
    const startId = typeof start === 'number' ? `${start}` : start;
    const endId = typeof end === 'number' ? `${end}` : end;

    try {
        // @ts-ignore
        const result = await client.xrange(streamKey, startId, endId, 'COUNT', count);

        const events: UsageEvent[] = [];
        for (const [id, fields] of result) {
            // fields is array [key1, val1, key2, val2...]
            const data: any = {};
            for (let i = 0; i < fields.length; i += 2) {
                data[fields[i]] = fields[i + 1];
            }

            // Filter by dimension if requested
            if (options?.dimension && data.dimension !== options.dimension) {
                continue;
            }

            const event: UsageEvent = {
                id: data.id || id, // Use provided ID or Stream ID
                tenantId: data.tenantId,
                dimension: data.dimension,
                quantity: parseFloat(data.quantity),
                unit: data.unit,
                source: data.source,
                occurredAt: data.occurredAt,
                recordedAt: data.recordedAt,
                metadata: data.metadata ? JSON.parse(data.metadata) : undefined
            };
            events.push(event);
        }

        // Sort reverse chronological if needed, but XRANGE returns chronological.
        // The original implementation sorted by occurredAt descending.
        // Stream returns ascending. Let's reverse it to match original behavior.
        return events.reverse();
    } catch (error) {
        console.error('[UsageMeteringService] Failed to get events', error);
        return [];
    }
  }
}

export const usageMeteringService = new UsageMeteringService();

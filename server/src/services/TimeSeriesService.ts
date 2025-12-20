import { getRedisClient } from '../db/redis.js';
import pino from 'pino';
import { z } from 'zod/v4';
import { alertingService } from './AlertingService.js';

const logger = pino();

export const TimeSeriesPointSchema = z.object({
  metric: z.string(),
  value: z.number(),
  timestamp: z.number(),
  tags: z.record(z.string(), z.string()).optional(),
});

export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;

export class TimeSeriesService {
  private redis: any;
  private retentionMs = 24 * 60 * 60 * 1000; // 24 hours default retention

  constructor() {
      this.redis = getRedisClient();
  }

  /**
   * Add a data point to a time series
   */
  async addPoint(metric: string, value: number, tags: Record<string, string> = {}): Promise<void> {
    const timestamp = Date.now();
    const key = `ts:${metric}`;

    // Format data as JSON for the stream
    const data = JSON.stringify({ value, tags });

    try {
      // Add to Redis Stream
      // MAXLEN ~ 24h of data assuming 1 point/sec = 86400. Let's cap at 100k for safety.
      await this.redis.xadd(key, 'MAXLEN', '~', 100000, '*', 'data', data, 'ts', timestamp.toString());

      // Also update a "latest" key for quick access
      await this.redis.set(`ts:latest:${metric}`, JSON.stringify({ value, timestamp, tags }));

      // Publish to pub/sub for real-time subscribers
      await this.redis.publish(`ts:update:${metric}`, JSON.stringify({ metric, value, timestamp, tags }));

      // Check for alerts
      alertingService.checkAlerts(metric, value, tags).catch(err => {
        logger.error({ err, metric }, 'Error checking alerts');
      });

    } catch (error) {
      logger.error({ error, metric }, 'Failed to add time series point');
      throw error;
    }
  }

  /**
   * Query time series data
   */
  async query(metric: string, startMs: number, endMs: number): Promise<TimeSeriesPoint[]> {
    const key = `ts:${metric}`;
    try {
      // XRANGE key start end
      // Redis stream IDs are timestamp-sequence. We can use timestamp as the start/end ID prefix.
      const startId = startMs.toString();
      const endId = endMs.toString();

      const results = await this.redis.xrange(key, startId, endId);

      return results.map(([id, fields]) => {
        // fields is ['data', '{"value":...}', 'ts', '123456789']
        // We need to parse the fields array.
        let dataStr = '{}';
        let tsStr = '0';

        for (let i = 0; i < fields.length; i += 2) {
            if (fields[i] === 'data') dataStr = fields[i+1];
            if (fields[i] === 'ts') tsStr = fields[i+1];
        }

        const data = JSON.parse(dataStr);
        const timestamp = parseInt(tsStr || id.split('-')[0]); // Use explicit ts or stream ID timestamp

        return {
          metric,
          value: data.value,
          timestamp,
          tags: data.tags
        };
      });
    } catch (error) {
      logger.error({ error, metric }, 'Failed to query time series data');
      return [];
    }
  }

  /**
   * Get the latest value for a metric
   */
  async getLatest(metric: string): Promise<TimeSeriesPoint | null> {
    try {
      const data = await this.redis.get(`ts:latest:${metric}`);
      if (!data) return null;

      const parsed = JSON.parse(data);
      return {
        metric,
        ...parsed
      };
    } catch (error) {
      logger.error({ error, metric }, 'Failed to get latest time series value');
      return null;
    }
  }
}

export const timeSeriesService = new TimeSeriesService();

// server/src/utils/performanceMonitor.ts
import { Redis } from 'ioredis';
import { logger } from './logger';

// Define interfaces
export interface PerformanceMetric {
  timestamp: number;
  duration: number; // in milliseconds
  operation: string;
  component: string;
  success: boolean;
  tags?: Record<string, string>;
}

export interface PerformanceMonitorConfig {
  redis: Redis;
  metricPrefix?: string;
  defaultTTL?: number; // in seconds
  histogramBuckets?: number[]; // for calculating percentiles
}

export class PerformanceMonitor {
  private redis: Redis;
  private readonly metricPrefix: string;
  private readonly defaultTTL: number;
  private readonly histogramBuckets: number[];

  constructor(config: PerformanceMonitorConfig) {
    this.redis = config.redis;
    this.metricPrefix = config.metricPrefix || 'perf:';
    this.defaultTTL = config.defaultTTL || 3600; // 1 hour default
    this.histogramBuckets = config.histogramBuckets || [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]; // ms buckets
  }

  /**
   * Measure the execution time of a function with performance tracking
   */
  async measure<T>(
    operation: string,
    component: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    
    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      await this.recordMetric({
        timestamp: startTime,
        duration,
        operation,
        component,
        success,
        tags
      });
    }
  }

  /**
   * Record a performance metric directly
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // Record the raw metric
      const metricKey = `${this.metricPrefix}raw:${metric.component}:${metric.operation}:${Date.now()}`;
      await this.redis.setex(metricKey, this.defaultTTL, JSON.stringify(metric));

      // Update histogram for this operation
      await this.updateHistogram(metric);

      // Publish for real-time monitoring
      await this.redis.publish('performance_metrics', JSON.stringify(metric));

      // Log interesting events
      if (metric.duration > 1000) { // Log slow operations (>1s)
        logger.warn(`Slow operation detected`, {
          operation: metric.operation,
          component: metric.component,
          duration: metric.duration,
          tags: metric.tags
        });
      } else if (!metric.success) {
        logger.error(`Operation failed`, {
          operation: metric.operation,
          component: metric.component,
          duration: metric.duration,
          tags: metric.tags
        });
      }
    } catch (error) {
      logger.error(`Failed to record performance metric`, error);
    }
  }

  /**
   * Update histogram data for percentile calculations
   */
  private async updateHistogram(metric: PerformanceMetric): Promise<void> {
    try {
      const histogramKey = `${this.metricPrefix}histogram:${metric.component}:${metric.operation}`;

      // Find the appropriate bucket for this duration
      let bucketIndex = this.histogramBuckets.findIndex(bucket => metric.duration <= bucket);
      if (bucketIndex === -1) {
        bucketIndex = this.histogramBuckets.length; // Put in overflow bucket
      }

      const bucketKey = `${histogramKey}:bucket:${bucketIndex}`;
      await this.redis.incr(bucketKey);
      await this.redis.expire(bucketKey, this.defaultTTL);

      // Also track total count and sum for averages
      await this.redis.hincrby(histogramKey, 'count', 1);
      await this.redis.hincrby(histogramKey, 'sum', metric.duration);
      await this.redis.expire(histogramKey, this.defaultTTL);

      // Keep a record of recent durations for detailed analysis
      const recentKey = `${histogramKey}:recent`;
      await this.redis.lpush(recentKey, metric.duration.toString());
      await this.redis.ltrim(recentKey, 0, 99); // Keep last 100 measurements
      await this.redis.expire(recentKey, this.defaultTTL);

      // Track success/failure counts
      const statusKey = `${histogramKey}:status:${metric.success ? 'success' : 'failure'}`;
      await this.redis.incr(statusKey);
      await this.redis.expire(statusKey, this.defaultTTL);
    } catch (error) {
      logger.error(`Failed to update histogram for metric`, error);
    }
  }

  /**
   * Get performance metrics for a specific operation
   */
  async getMetrics(component: string, operation: string): Promise<{
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
    count: number;
    errorRate: number;
    recentDurations: number[];
  } | null> {
    try {
      const histogramKey = `${this.metricPrefix}histogram:${component}:${operation}`;

      // Get count and sum for averages
      const stats = await this.redis.hgetall(histogramKey);
      if (!stats.count) {
        return null;
      }

      const count = parseInt(stats.count) || 0;
      const sum = parseInt(stats.sum) || 0;
      const avg = count > 0 ? Math.round(sum / count) : 0;

      // Get recent durations for percentile calculation
      const recentKey = `${histogramKey}:recent`;
      const recentDurationsRaw = await this.redis.lrange(recentKey, 0, -1);
      const recentDurations = recentDurationsRaw.map(d => parseInt(d)).sort((a, b) => a - b);

      // Calculate percentiles from recent durations
      const p50 = this.calculatePercentile(recentDurations, 50);
      const p90 = this.calculatePercentile(recentDurations, 90);
      const p95 = this.calculatePercentile(recentDurations, 95);
      const p99 = this.calculatePercentile(recentDurations, 99);

      // Calculate min/max from recent durations
      const min = recentDurations.length > 0 ? recentDurations[0] : 0;
      const max = recentDurations.length > 0 ? recentDurations[recentDurations.length - 1] : 0;

      // Calculate error rate
      const successKey = `${histogramKey}:status:success`;
      const failureKey = `${histogramKey}:status:failure`;
      const successCount = parseInt(await this.redis.get(successKey) || '0');
      const failureCount = parseInt(await this.redis.get(failureKey) || '0');
      const totalRequests = successCount + failureCount;
      const errorRate = totalRequests > 0 ? (failureCount / totalRequests) * 100 : 0;

      return {
        p50,
        p90,
        p95,
        p99,
        avg,
        min,
        max,
        count,
        errorRate,
        recentDurations
      };
    } catch (error) {
      logger.error(`Failed to retrieve performance metrics`, error);
      return null;
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    if (sortedValues.length === 1) return sortedValues[0];

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);

    if (lowerIndex === upperIndex) {
      return sortedValues[lowerIndex];
    }

    const weight = index - lowerIndex;
    return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
  }

  /**
   * Get top N slowest operations
   */
  async getSlowestOperations(limit: number = 5): Promise<Array<{
    component: string;
    operation: string;
    avgDuration: number;
    count: number;
  }>> {
    try {
      // Get all histogram keys
      const histogramKeys = await this.redis.keys(`${this.metricPrefix}histogram:*`);

      const operations: Array<{
        component: string;
        operation: string;
        avgDuration: number;
        count: number;
      }> = [];

      // For each histogram key, calculate average duration
      for (const key of histogramKeys) {
        // Extract component and operation from key (format: perf:histogram:component:operation)
        const parts = key.replace(`${this.metricPrefix}histogram:`, '').split(':');
        if (parts.length >= 2) {
          const [component, operation] = parts;
          const stats = await this.redis.hgetall(key);

          const count = parseInt(stats.count) || 0;
          const sum = parseInt(stats.sum) || 0;
          const avgDuration = count > 0 ? Math.round(sum / count) : 0;

          if (count > 0) { // Only include operations that have been called
            operations.push({
              component,
              operation,
              avgDuration,
              count
            });
          }
        }
      }

      // Sort by average duration descending and return top N
      return operations
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, limit);
    } catch (error) {
      logger.error(`Failed to retrieve slowest operations`, error);
      return [];
    }
  }

  /**
   * Subscribe to performance metrics stream
   */
  subscribeToMetrics(handler: (metric: PerformanceMetric) => void): () => void {
    // Create a Redis subscriber connection for performance metrics
    const subscriber = new Redis((this.redis as any).options);

    // Proper cleanup function
    const cleanup = async () => {
      try {
        await subscriber.unsubscribe('performance_metrics');
        await subscriber.quit();
      } catch (error) {
        logger.error('Error during performance metrics subscription cleanup', error);
      }
    };

    subscriber.subscribe('performance_metrics', (err) => {
      if (err) {
        logger.error('Failed to subscribe to performance metrics channel', err);
        return;
      }

      logger.info('Successfully subscribed to performance metrics');
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'performance_metrics') {
        try {
          const metric = JSON.parse(message) as PerformanceMetric;
          handler(metric);
        } catch (error) {
          logger.error('Failed to parse performance metric message', error);
        }
      }
    });

    logger.info('Performance metrics subscription set up');

    // Return the unsubscribe function
    return () => {
      void cleanup(); // Use void to ignore the promise
      logger.info('Performance metrics subscription unsubscribed');
    };
  }
}
/**
 * ER Backpressure Management System
 *
 * Implements backpressure handling for the Entity Resolution adjudication queue
 * to maintain system stability at 2x expected peak load with queue lag < 60s
 * and DLQ rate < 0.1%.
 */

import { EventEmitter } from 'events';
import { logger } from './utils/logger';
import { Pool } from 'pg';
import { Redis } from 'ioredis';

interface BackpressureConfig {
  maxQueueSize: number;
  maxProcessingRate: number; // items per second
  lagThresholdMs: number;
  dlqThresholdRetries: number;
  adaptiveRateLimiting: boolean;
  circuitBreakerConfig: {
    failureThreshold: number;
    recoveryTimeMs: number;
    halfOpenMaxCalls: number;
  };
}

interface QueueMetrics {
  currentSize: number;
  processingRate: number; // items/second
  avgProcessingTime: number; // milliseconds
  lagTime: number; // milliseconds
  dlqSize: number;
  errorRate: number;
  lastUpdated: Date;
}

interface BackpressureState {
  level: 'none' | 'light' | 'moderate' | 'heavy' | 'critical';
  activeStrategies: string[];
  rateLimit: number; // items per second
  dropProbability: number; // 0-1
  circuitBreakerOpen: boolean;
  lastUpdated: Date;
}

type BackpressureStrategy =
  | 'rate_limiting'
  | 'selective_dropping'
  | 'batch_optimization'
  | 'circuit_breaker'
  | 'load_shedding'
  | 'priority_queuing';

export class ERBackpressureManager extends EventEmitter {
  private config: BackpressureConfig;
  private db: Pool;
  private redis: Redis;
  private metrics: QueueMetrics;
  private state: BackpressureState;
  private metricsInterval?: NodeJS.Timeout;
  private adaptiveInterval?: NodeJS.Timeout;
  private strategyHistory: Map<BackpressureStrategy, number>;

  // Circuit breaker state
  private circuitBreaker: {
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    lastFailureTime: Date;
    halfOpenCalls: number;
  };

  constructor(
    config: BackpressureConfig,
    db: Pool,
    redis: Redis
  ) {
    super();

    this.config = config;
    this.db = db;
    this.redis = redis;

    this.metrics = {
      currentSize: 0,
      processingRate: 0,
      avgProcessingTime: 0,
      lagTime: 0,
      dlqSize: 0,
      errorRate: 0,
      lastUpdated: new Date()
    };

    this.state = {
      level: 'none',
      activeStrategies: [],
      rateLimit: config.maxProcessingRate,
      dropProbability: 0,
      circuitBreakerOpen: false,
      lastUpdated: new Date()
    };

    this.strategyHistory = new Map();

    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: new Date(),
      halfOpenCalls: 0
    };

    this.startMetricsCollection();

    if (config.adaptiveRateLimiting) {
      this.startAdaptiveControl();
    }
  }

  /**
   * Check if processing should be allowed based on current backpressure
   */
  async shouldAllowProcessing(item: any): Promise<{
    allowed: boolean;
    reason?: string;
    suggestedDelay?: number;
  }> {
    try {
      // Circuit breaker check
      if (this.circuitBreaker.state === 'open') {
        const timeSinceFailure = Date.now() - this.circuitBreaker.lastFailureTime.getTime();

        if (timeSinceFailure < this.config.circuitBreakerConfig.recoveryTimeMs) {
          return {
            allowed: false,
            reason: 'circuit_breaker_open',
            suggestedDelay: this.config.circuitBreakerConfig.recoveryTimeMs - timeSinceFailure
          };
        } else {
          // Transition to half-open
          this.circuitBreaker.state = 'half-open';
          this.circuitBreaker.halfOpenCalls = 0;
          logger.info('Circuit breaker transitioning to half-open state');
        }
      }

      // Half-open state check
      if (this.circuitBreaker.state === 'half-open') {
        if (this.circuitBreaker.halfOpenCalls >= this.config.circuitBreakerConfig.halfOpenMaxCalls) {
          return {
            allowed: false,
            reason: 'circuit_breaker_half_open_limit',
            suggestedDelay: 1000
          };
        }
        this.circuitBreaker.halfOpenCalls++;
      }

      // Queue size check
      if (this.metrics.currentSize >= this.config.maxQueueSize) {
        return {
          allowed: false,
          reason: 'queue_full',
          suggestedDelay: Math.max(1000, this.metrics.avgProcessingTime)
        };
      }

      // Lag time check
      if (this.metrics.lagTime > this.config.lagThresholdMs) {
        return {
          allowed: false,
          reason: 'excessive_lag',
          suggestedDelay: this.metrics.lagTime / 2
        };
      }

      // Priority-based dropping for non-critical items
      if (this.state.dropProbability > 0 && !this.isHighPriority(item)) {
        if (Math.random() < this.state.dropProbability) {
          return {
            allowed: false,
            reason: 'load_shedding',
            suggestedDelay: 0
          };
        }
      }

      // Rate limiting
      const currentRate = await this.getCurrentProcessingRate();
      if (currentRate > this.state.rateLimit) {
        const delayMs = Math.max(0, (1000 / this.state.rateLimit) - (1000 / currentRate));
        return {
          allowed: false,
          reason: 'rate_limited',
          suggestedDelay: delayMs
        };
      }

      return { allowed: true };

    } catch (error) {
      logger.error('Error in backpressure check:', error);
      return {
        allowed: false,
        reason: 'system_error',
        suggestedDelay: 5000
      };
    }
  }

  /**
   * Record successful processing
   */
  recordSuccess(processingTimeMs: number): void {
    // Update circuit breaker on success
    if (this.circuitBreaker.state === 'half-open') {
      // If we've completed enough successful calls, close the circuit
      if (this.circuitBreaker.halfOpenCalls >= this.config.circuitBreakerConfig.halfOpenMaxCalls) {
        this.circuitBreaker.state = 'closed';
        this.circuitBreaker.failureCount = 0;
        logger.info('Circuit breaker closed after successful recovery');
      }
    } else if (this.circuitBreaker.state === 'closed') {
      // Reset failure count on success
      this.circuitBreaker.failureCount = Math.max(0, this.circuitBreaker.failureCount - 1);
    }

    // Update processing time metrics
    this.updateProcessingTimeMetrics(processingTimeMs);
  }

  /**
   * Record processing failure
   */
  recordFailure(error: Error): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    // Check if we should open the circuit breaker
    if (this.circuitBreaker.failureCount >= this.config.circuitBreakerConfig.failureThreshold) {
      this.circuitBreaker.state = 'open';
      this.state.circuitBreakerOpen = true;
      logger.warn('Circuit breaker opened due to excessive failures', {
        failureCount: this.circuitBreaker.failureCount,
        threshold: this.config.circuitBreakerConfig.failureThreshold
      });

      this.emit('circuit_breaker_opened', { failureCount: this.circuitBreaker.failureCount });
    }
  }

  /**
   * Update current metrics by querying the database
   */
  private async updateMetrics(): Promise<void> {
    try {
      const [queueSizeResult, dlqSizeResult, lagResult] = await Promise.all([
        // Get current queue size
        this.db.query(`
          SELECT COUNT(*) as count
          FROM er_adjudication_queue
          WHERE status = 'pending'
        `),

        // Get DLQ size
        this.db.query(`
          SELECT COUNT(*) as count
          FROM er_adjudication_queue
          WHERE status = 'failed' AND retry_count >= $1
        `, [this.config.dlqThresholdRetries]),

        // Get queue lag (oldest pending item)
        this.db.query(`
          SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) * 1000 as lag_ms
          FROM er_adjudication_queue
          WHERE status = 'pending'
          ORDER BY created_at ASC
          LIMIT 1
        `)
      ]);

      const queueSize = parseInt(queueSizeResult.rows[0]?.count || '0');
      const dlqSize = parseInt(dlqSizeResult.rows[0]?.count || '0');
      const lagTime = parseFloat(lagResult.rows[0]?.lag_ms || '0');

      // Calculate processing rate from Redis metrics
      const processingRate = await this.getProcessingRateFromRedis();

      // Update metrics
      this.metrics = {
        currentSize: queueSize,
        processingRate,
        avgProcessingTime: await this.getAvgProcessingTime(),
        lagTime,
        dlqSize,
        errorRate: await this.getErrorRate(),
        lastUpdated: new Date()
      };

      // Update backpressure state based on new metrics
      this.updateBackpressureState();

    } catch (error) {
      logger.error('Failed to update backpressure metrics:', error);
    }
  }

  /**
   * Update backpressure state based on current metrics
   */
  private updateBackpressureState(): void {
    const oldLevel = this.state.level;
    const strategies: BackpressureStrategy[] = [];

    // Determine backpressure level
    let level: BackpressureState['level'] = 'none';

    if (this.metrics.currentSize > this.config.maxQueueSize * 0.9 ||
        this.metrics.lagTime > this.config.lagThresholdMs * 0.8) {
      level = 'critical';
      strategies.push('circuit_breaker', 'load_shedding', 'priority_queuing');
    } else if (this.metrics.currentSize > this.config.maxQueueSize * 0.7 ||
               this.metrics.lagTime > this.config.lagThresholdMs * 0.6) {
      level = 'heavy';
      strategies.push('rate_limiting', 'selective_dropping', 'batch_optimization');
    } else if (this.metrics.currentSize > this.config.maxQueueSize * 0.5 ||
               this.metrics.lagTime > this.config.lagThresholdMs * 0.4) {
      level = 'moderate';
      strategies.push('rate_limiting', 'batch_optimization');
    } else if (this.metrics.currentSize > this.config.maxQueueSize * 0.3 ||
               this.metrics.lagTime > this.config.lagThresholdMs * 0.2) {
      level = 'light';
      strategies.push('rate_limiting');
    }

    // Calculate adaptive parameters
    const queueUtilization = this.metrics.currentSize / this.config.maxQueueSize;
    const lagUtilization = this.metrics.lagTime / this.config.lagThresholdMs;
    const maxUtilization = Math.max(queueUtilization, lagUtilization);

    const rateLimit = Math.max(
      this.config.maxProcessingRate * 0.1,
      this.config.maxProcessingRate * (1 - maxUtilization)
    );

    const dropProbability = Math.max(0, Math.min(0.5, maxUtilization - 0.7));

    this.state = {
      level,
      activeStrategies: strategies,
      rateLimit,
      dropProbability,
      circuitBreakerOpen: this.circuitBreaker.state === 'open',
      lastUpdated: new Date()
    };

    // Emit events on level changes
    if (oldLevel !== level) {
      logger.info(`Backpressure level changed: ${oldLevel} → ${level}`, {
        queueSize: this.metrics.currentSize,
        lagTime: this.metrics.lagTime,
        strategies
      });

      this.emit('backpressure_level_changed', {
        oldLevel,
        newLevel: level,
        metrics: this.metrics,
        state: this.state
      });
    }
  }

  /**
   * Check if an item is high priority and should not be dropped
   */
  private isHighPriority(item: any): boolean {
    // High priority items based on confidence band or importance
    return item.confidence_band === 'HIGH' ||
           item.priority === 'urgent' ||
           item.tenant_tier === 'enterprise';
  }

  /**
   * Get current processing rate from Redis metrics
   */
  private async getProcessingRateFromRedis(): Promise<number> {
    try {
      const key = 'er:processing_rate';
      const rate = await this.redis.get(key);
      return rate ? parseFloat(rate) : 0;
    } catch (error) {
      logger.error('Failed to get processing rate from Redis:', error);
      return 0;
    }
  }

  /**
   * Get average processing time from recent samples
   */
  private async getAvgProcessingTime(): Promise<number> {
    try {
      const result = await this.redis.lrange('er:processing_times', 0, 99);
      if (result.length === 0) return 1000; // Default 1 second

      const times = result.map(t => parseFloat(t));
      return times.reduce((sum, time) => sum + time, 0) / times.length;
    } catch (error) {
      logger.error('Failed to get average processing time:', error);
      return 1000;
    }
  }

  /**
   * Get current error rate
   */
  private async getErrorRate(): Promise<number> {
    try {
      const successKey = 'er:success_count';
      const errorKey = 'er:error_count';

      const [successCount, errorCount] = await Promise.all([
        this.redis.get(successKey).then(v => parseInt(v || '0')),
        this.redis.get(errorKey).then(v => parseInt(v || '0'))
      ]);

      const total = successCount + errorCount;
      return total > 0 ? errorCount / total : 0;
    } catch (error) {
      logger.error('Failed to get error rate:', error);
      return 0;
    }
  }

  /**
   * Get current processing rate (items per second)
   */
  private async getCurrentProcessingRate(): Promise<number> {
    try {
      const key = 'er:current_rate';
      const rate = await this.redis.get(key);
      return rate ? parseFloat(rate) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Update processing time metrics
   */
  private updateProcessingTimeMetrics(processingTimeMs: number): void {
    // Store in Redis for moving average calculation
    this.redis.pipeline()
      .lpush('er:processing_times', processingTimeMs.toString())
      .ltrim('er:processing_times', 0, 99) // Keep last 100 samples
      .exec()
      .catch(error => logger.error('Failed to update processing time metrics:', error));
  }

  /**
   * Start metrics collection interval
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      await this.updateMetrics();
    }, 10000); // Update every 10 seconds
  }

  /**
   * Start adaptive control loop
   */
  private startAdaptiveControl(): void {
    this.adaptiveInterval = setInterval(() => {
      this.adaptBackpressureParameters();
    }, 30000); // Adapt every 30 seconds
  }

  /**
   * Adaptive algorithm to tune backpressure parameters
   */
  private adaptBackpressureParameters(): void {
    if (this.state.level === 'none') {
      // Gradually increase rate limit when things are going well
      this.state.rateLimit = Math.min(
        this.config.maxProcessingRate,
        this.state.rateLimit * 1.1
      );
    } else if (this.state.level === 'critical') {
      // Aggressively reduce rate limit under critical backpressure
      this.state.rateLimit = Math.max(
        this.config.maxProcessingRate * 0.1,
        this.state.rateLimit * 0.5
      );
    }

    // Log adaptive changes
    logger.debug('Adaptive backpressure control update', {
      level: this.state.level,
      rateLimit: this.state.rateLimit,
      dropProbability: this.state.dropProbability
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current backpressure state
   */
  getState(): BackpressureState {
    return { ...this.state };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): typeof this.circuitBreaker {
    return { ...this.circuitBreaker };
  }

  /**
   * Manually trigger circuit breaker (for testing)
   */
  triggerCircuitBreaker(): void {
    this.circuitBreaker.state = 'open';
    this.circuitBreaker.lastFailureTime = new Date();
    this.state.circuitBreakerOpen = true;
    logger.warn('Circuit breaker manually triggered');
  }

  /**
   * Reset circuit breaker (for recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.state = 'closed';
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.halfOpenCalls = 0;
    this.state.circuitBreakerOpen = false;
    logger.info('Circuit breaker manually reset');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.adaptiveInterval) {
      clearInterval(this.adaptiveInterval);
    }
    this.removeAllListeners();
  }
}

export default ERBackpressureManager;
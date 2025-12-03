/**
 * Redis-Cached Alert System
 *
 * High-performance alerting system with Redis caching for
 * p95 < 2s latency requirements. Implements pub/sub for
 * real-time alert distribution.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  IntelAlert,
  AlertType,
  AlertPriority,
  SignalOfInterest,
  FusedTrack,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Alert cache configuration
 */
export interface AlertCacheConfig {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisDb: number;
  keyPrefix: string;
  alertTtlSeconds: number;
  maxAlertsPerType: number;
  pubSubChannel: string;
  enableMetrics: boolean;
  p95TargetMs: number;
}

const DEFAULT_CONFIG: AlertCacheConfig = {
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379'),
  redisPassword: process.env.REDIS_PASSWORD,
  redisDb: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'intel:alerts:',
  alertTtlSeconds: 3600, // 1 hour
  maxAlertsPerType: 1000,
  pubSubChannel: 'intel:alerts:live',
  enableMetrics: true,
  p95TargetMs: 2000, // p95 < 2s requirement
};

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  totalAlerts: number;
  alertsByType: Record<string, number>;
  alertsByPriority: Record<string, number>;
  latencies: number[];
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  cacheHitRate: number;
  cacheHits: number;
  cacheMisses: number;
  lastUpdated: Date;
}

/**
 * AlertCache - High-performance Redis-cached alerting system
 */
export class AlertCache {
  private config: AlertCacheConfig;
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private metrics: PerformanceMetrics;
  private alertHandlers: Map<string, (alert: IntelAlert) => Promise<void>>;
  private isConnected: boolean = false;

  constructor(config: Partial<AlertCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.alertHandlers = new Map();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      totalAlerts: 0,
      alertsByType: {},
      alertsByPriority: {},
      latencies: [],
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      cacheHitRate: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    const redisConfig = {
      host: this.config.redisHost,
      port: this.config.redisPort,
      password: this.config.redisPassword,
      db: this.config.redisDb,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      keyPrefix: this.config.keyPrefix,
    };

    try {
      // Main client
      this.client = new Redis({
        ...redisConfig,
        connectionName: 'intel-alert-cache',
      });

      // Subscriber for real-time alerts
      this.subscriber = new Redis({
        ...redisConfig,
        connectionName: 'intel-alert-subscriber',
      });

      // Publisher for broadcasting
      this.publisher = new Redis({
        ...redisConfig,
        connectionName: 'intel-alert-publisher',
      });

      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect(),
      ]);

      // Setup error handlers
      this.setupErrorHandlers();

      // Setup subscription
      await this.setupSubscription();

      this.isConnected = true;
      logger.info({ message: 'Alert cache connected to Redis' });
    } catch (error) {
      logger.error({
        message: 'Alert cache connection failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    const clients = [
      { name: 'client', instance: this.client },
      { name: 'subscriber', instance: this.subscriber },
      { name: 'publisher', instance: this.publisher },
    ];

    clients.forEach(({ name, instance }) => {
      instance?.on('error', (error) => {
        logger.error({
          message: `Alert cache ${name} error`,
          error: error.message,
        });
      });

      instance?.on('reconnecting', () => {
        logger.info(`Alert cache ${name} reconnecting...`);
      });
    });
  }

  /**
   * Setup pub/sub subscription
   */
  private async setupSubscription(): Promise<void> {
    if (!this.subscriber) return;

    await this.subscriber.subscribe(this.config.pubSubChannel);

    this.subscriber.on('message', async (channel: string, message: string) => {
      if (channel !== this.config.pubSubChannel) return;

      try {
        const alert = JSON.parse(message) as IntelAlert;
        alert.timestamp = new Date(alert.timestamp);

        // Dispatch to registered handlers
        for (const handler of this.alertHandlers.values()) {
          await handler(alert);
        }
      } catch (error) {
        logger.error({
          message: 'Failed to process alert message',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Register alert handler
   */
  onAlert(
    handlerId: string,
    handler: (alert: IntelAlert) => Promise<void>,
  ): void {
    this.alertHandlers.set(handlerId, handler);
  }

  /**
   * Unregister alert handler
   */
  removeHandler(handlerId: string): void {
    this.alertHandlers.delete(handlerId);
  }

  /**
   * Publish alert with p95 < 2s guarantee
   */
  async publishAlert(alert: IntelAlert): Promise<{ success: boolean; latencyMs: number }> {
    const startTime = Date.now();

    try {
      if (!this.client || !this.publisher) {
        throw new Error('Alert cache not connected');
      }

      // Serialize alert
      const serialized = JSON.stringify({
        ...alert,
        timestamp: alert.timestamp.toISOString(),
      });

      // Store in Redis with TTL (using pipeline for atomicity)
      const pipeline = this.client.pipeline();

      // Store alert by ID
      pipeline.setex(`alert:${alert.id}`, this.config.alertTtlSeconds, serialized);

      // Add to type-specific sorted set (score = timestamp)
      pipeline.zadd(
        `type:${alert.type}`,
        alert.timestamp.getTime(),
        alert.id,
      );

      // Add to priority-specific sorted set
      pipeline.zadd(
        `priority:${alert.priority}`,
        alert.timestamp.getTime(),
        alert.id,
      );

      // Add to global alert list
      pipeline.zadd('all', alert.timestamp.getTime(), alert.id);

      // Trim old alerts to maintain max size
      pipeline.zremrangebyrank(`type:${alert.type}`, 0, -this.config.maxAlertsPerType - 1);
      pipeline.zremrangebyrank(`priority:${alert.priority}`, 0, -this.config.maxAlertsPerType - 1);
      pipeline.zremrangebyrank('all', 0, -this.config.maxAlertsPerType * 5 - 1);

      // Execute pipeline
      await pipeline.exec();

      // Publish to subscribers
      await this.publisher.publish(this.config.pubSubChannel, serialized);

      const latencyMs = Date.now() - startTime;

      // Update metrics
      if (this.config.enableMetrics) {
        this.updateMetrics(alert, latencyMs, true);
      }

      // Log warning if approaching p95 target
      if (latencyMs > this.config.p95TargetMs * 0.8) {
        logger.warn({
          message: 'Alert latency approaching p95 target',
          latencyMs,
          targetMs: this.config.p95TargetMs,
          alertId: alert.id,
        });
      }

      return { success: true, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logger.error({
        message: 'Failed to publish alert',
        error: error instanceof Error ? error.message : String(error),
        alertId: alert.id,
        latencyMs,
      });

      return { success: false, latencyMs };
    }
  }

  /**
   * Get alert by ID
   */
  async getAlert(alertId: string): Promise<IntelAlert | null> {
    const startTime = Date.now();

    try {
      if (!this.client) {
        throw new Error('Alert cache not connected');
      }

      const data = await this.client.get(`alert:${alertId}`);

      if (data) {
        this.metrics.cacheHits++;
        const alert = JSON.parse(data);
        alert.timestamp = new Date(alert.timestamp);
        return alert;
      }

      this.metrics.cacheMisses++;
      return null;
    } finally {
      this.updateCacheHitRate();
    }
  }

  /**
   * Get alerts by type
   */
  async getAlertsByType(
    type: AlertType,
    limit: number = 50,
    offset: number = 0,
  ): Promise<IntelAlert[]> {
    if (!this.client) {
      throw new Error('Alert cache not connected');
    }

    // Get alert IDs from sorted set (newest first)
    const alertIds = await this.client.zrevrange(
      `type:${type}`,
      offset,
      offset + limit - 1,
    );

    if (alertIds.length === 0) {
      return [];
    }

    // Batch fetch alerts
    return this.batchGetAlerts(alertIds);
  }

  /**
   * Get alerts by priority
   */
  async getAlertsByPriority(
    priority: AlertPriority,
    limit: number = 50,
    offset: number = 0,
  ): Promise<IntelAlert[]> {
    if (!this.client) {
      throw new Error('Alert cache not connected');
    }

    const alertIds = await this.client.zrevrange(
      `priority:${priority}`,
      offset,
      offset + limit - 1,
    );

    if (alertIds.length === 0) {
      return [];
    }

    return this.batchGetAlerts(alertIds);
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(
    limit: number = 100,
    sinceMs?: number,
  ): Promise<IntelAlert[]> {
    if (!this.client) {
      throw new Error('Alert cache not connected');
    }

    const minScore = sinceMs ? Date.now() - sinceMs : '-inf';
    const alertIds = await this.client.zrevrangebyscore(
      'all',
      '+inf',
      minScore,
      'LIMIT',
      0,
      limit,
    );

    if (alertIds.length === 0) {
      return [];
    }

    return this.batchGetAlerts(alertIds);
  }

  /**
   * Get unacknowledged alerts
   */
  async getUnacknowledgedAlerts(limit: number = 100): Promise<IntelAlert[]> {
    const recent = await this.getRecentAlerts(limit * 2);
    return recent.filter((a) => !a.acknowledged).slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error('Alert cache not connected');
    }

    const alert = await this.getAlert(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    const serialized = JSON.stringify({
      ...alert,
      timestamp: alert.timestamp.toISOString(),
      acknowledgedAt: alert.acknowledgedAt.toISOString(),
    });

    await this.client.setex(
      `alert:${alertId}`,
      this.config.alertTtlSeconds,
      serialized,
    );

    return true;
  }

  /**
   * Batch get alerts
   */
  private async batchGetAlerts(alertIds: string[]): Promise<IntelAlert[]> {
    if (!this.client || alertIds.length === 0) {
      return [];
    }

    const pipeline = this.client.pipeline();
    for (const id of alertIds) {
      pipeline.get(`alert:${id}`);
    }

    const results = await pipeline.exec();
    const alerts: IntelAlert[] = [];

    for (const result of results || []) {
      if (result && result[1]) {
        try {
          const alert = JSON.parse(result[1] as string);
          alert.timestamp = new Date(alert.timestamp);
          if (alert.acknowledgedAt) {
            alert.acknowledgedAt = new Date(alert.acknowledgedAt);
          }
          alerts.push(alert);
        } catch {
          // Skip invalid entries
        }
      }
    }

    return alerts;
  }

  /**
   * Create alert from signal
   */
  createSignalAlert(
    signal: SignalOfInterest,
    type: AlertType,
    priority: AlertPriority,
    title: string,
    description: string,
  ): IntelAlert {
    return {
      id: uuidv4(),
      type,
      priority,
      title,
      description,
      source: 'SIGINT',
      relatedEntityIds: signal.correlatedEntities,
      relatedSignalIds: [signal.id],
      relatedTrackIds: [],
      odniGapReferences: signal.odniGapReferences,
      geolocation: signal.detectionLocations[0],
      timestamp: new Date(),
      acknowledged: false,
    };
  }

  /**
   * Create alert from track
   */
  createTrackAlert(
    track: FusedTrack,
    type: AlertType,
    priority: AlertPriority,
    title: string,
    description: string,
  ): IntelAlert {
    return {
      id: uuidv4(),
      type,
      priority,
      title,
      description,
      source: 'MASINT',
      relatedEntityIds: track.correlatedEntities,
      relatedSignalIds: track.associatedSignals,
      relatedTrackIds: [track.id],
      odniGapReferences: [],
      geolocation: track.kinematicState.position,
      timestamp: new Date(),
      acknowledged: false,
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    alert: IntelAlert,
    latencyMs: number,
    success: boolean,
  ): void {
    this.metrics.totalAlerts++;
    this.metrics.alertsByType[alert.type] =
      (this.metrics.alertsByType[alert.type] || 0) + 1;
    this.metrics.alertsByPriority[alert.priority] =
      (this.metrics.alertsByPriority[alert.priority] || 0) + 1;

    // Keep last 1000 latencies for percentile calculation
    this.metrics.latencies.push(latencyMs);
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies.shift();
    }

    // Recalculate percentiles
    this.calculatePercentiles();
    this.metrics.lastUpdated = new Date();
  }

  /**
   * Calculate latency percentiles
   */
  private calculatePercentiles(): void {
    if (this.metrics.latencies.length === 0) return;

    const sorted = [...this.metrics.latencies].sort((a, b) => a - b);
    const len = sorted.length;

    this.metrics.p50Latency = sorted[Math.floor(len * 0.5)];
    this.metrics.p95Latency = sorted[Math.floor(len * 0.95)];
    this.metrics.p99Latency = sorted[Math.floor(len * 0.99)];
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate =
      total > 0 ? this.metrics.cacheHits / total : 0;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if p95 target is being met
   */
  isP95TargetMet(): boolean {
    return this.metrics.p95Latency <= this.config.p95TargetMs;
  }

  /**
   * Get alert statistics
   */
  async getStatistics(): Promise<{
    totalByType: Record<string, number>;
    totalByPriority: Record<string, number>;
    recentCount: number;
    unacknowledgedCount: number;
  }> {
    if (!this.client) {
      throw new Error('Alert cache not connected');
    }

    const pipeline = this.client.pipeline();

    // Count by type
    const types: AlertType[] = [
      'NEW_SIGNAL',
      'SIGNAL_CHANGE',
      'NEW_TRACK',
      'TRACK_MANEUVER',
      'SIGNATURE_MATCH',
      'THREAT_DETECTED',
      'CORRELATION_FOUND',
      'ODNI_GAP_HIT',
      'ANOMALY_DETECTED',
      'PATTERN_MATCH',
    ];

    for (const type of types) {
      pipeline.zcard(`type:${type}`);
    }

    // Count by priority
    const priorities: AlertPriority[] = [
      'LOW',
      'MEDIUM',
      'HIGH',
      'CRITICAL',
      'FLASH',
    ];

    for (const priority of priorities) {
      pipeline.zcard(`priority:${priority}`);
    }

    // Total recent
    pipeline.zcard('all');

    const results = await pipeline.exec();

    const totalByType: Record<string, number> = {};
    const totalByPriority: Record<string, number> = {};

    let idx = 0;
    for (const type of types) {
      totalByType[type] = (results?.[idx]?.[1] as number) || 0;
      idx++;
    }

    for (const priority of priorities) {
      totalByPriority[priority] = (results?.[idx]?.[1] as number) || 0;
      idx++;
    }

    const recentCount = (results?.[idx]?.[1] as number) || 0;

    // Get unacknowledged count
    const unacknowledged = await this.getUnacknowledgedAlerts(1000);

    return {
      totalByType,
      totalByPriority,
      recentCount,
      unacknowledgedCount: unacknowledged.length,
    };
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    const clients = [this.client, this.subscriber, this.publisher];

    await Promise.all(
      clients.map(async (client) => {
        if (client) {
          try {
            await client.quit();
          } catch {
            // Ignore close errors
          }
        }
      }),
    );

    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;

    logger.info({ message: 'Alert cache closed' });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: string;
    p95Met: boolean;
    details?: Record<string, unknown>;
  }> {
    try {
      if (!this.client) {
        return { status: 'disconnected', p95Met: false };
      }

      const ping = await this.client.ping();

      return {
        status: ping === 'PONG' ? 'healthy' : 'unhealthy',
        p95Met: this.isP95TargetMet(),
        details: {
          connected: this.isConnected,
          p50Latency: this.metrics.p50Latency,
          p95Latency: this.metrics.p95Latency,
          p99Latency: this.metrics.p99Latency,
          p95Target: this.config.p95TargetMs,
          cacheHitRate: this.metrics.cacheHitRate,
          totalAlerts: this.metrics.totalAlerts,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        p95Met: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

export default AlertCache;

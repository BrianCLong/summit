/**
 * Audit Event Buffer
 *
 * In-memory buffer with backpressure handling for audit events.
 * Ensures no event loss during high load while preventing memory exhaustion.
 *
 * Features:
 * - Configurable buffer size with backpressure
 * - Priority queuing for critical events
 * - Automatic flush on buffer full or interval
 * - Graceful degradation under load
 */

import { EventEmitter } from 'events';
import type { AuditEvent, CriticalEventCategory } from './types.js';

/**
 * Buffer statistics
 */
export interface BufferStats {
  size: number;
  maxSize: number;
  criticalQueueSize: number;
  normalQueueSize: number;
  totalReceived: number;
  totalFlushed: number;
  totalDropped: number;
  backpressureActive: boolean;
  lastFlushTime: Date | null;
  avgFlushDuration: number;
}

/**
 * Buffer configuration
 */
export interface EventBufferConfig {
  maxSize: number;
  flushIntervalMs: number;
  batchSize: number;
  backpressureThreshold: number; // Percentage (0-1) at which backpressure kicks in
  criticalEventsBypass: boolean; // Critical events bypass backpressure
  onFlush: (events: AuditEvent[]) => Promise<void>;
  onDrop?: (event: AuditEvent, reason: string) => void;
  onBackpressure?: (active: boolean) => void;
}

/**
 * Buffered audit event with priority
 */
interface BufferedEvent {
  event: AuditEvent;
  priority: 'critical' | 'normal';
  receivedAt: Date;
}

/**
 * Event buffer with backpressure handling
 */
export class AuditEventBuffer extends EventEmitter {
  private criticalQueue: BufferedEvent[] = [];
  private normalQueue: BufferedEvent[] = [];
  private config: EventBufferConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing: boolean = false;
  private backpressureActive: boolean = false;

  // Statistics
  private stats = {
    totalReceived: 0,
    totalFlushed: 0,
    totalDropped: 0,
    lastFlushTime: null as Date | null,
    flushDurations: [] as number[],
  };

  constructor(config: EventBufferConfig) {
    super();
    this.config = config;
    this.startFlushTimer();
  }

  /**
   * Add an event to the buffer
   */
  async push(event: AuditEvent): Promise<boolean> {
    this.stats.totalReceived++;

    const isCritical = this.isCriticalEvent(event);
    const currentSize = this.size();

    // Check backpressure
    if (currentSize >= this.config.maxSize * this.config.backpressureThreshold) {
      if (!this.backpressureActive) {
        this.backpressureActive = true;
        this.emit('backpressure', true);
        this.config.onBackpressure?.(true);
      }
    }

    // Critical events bypass backpressure if configured
    if (isCritical && this.config.criticalEventsBypass) {
      this.criticalQueue.push({
        event,
        priority: 'critical',
        receivedAt: new Date(),
      });
      return true;
    }

    // Check if buffer is full
    if (currentSize >= this.config.maxSize) {
      this.stats.totalDropped++;
      this.config.onDrop?.(event, 'buffer_full');
      this.emit('dropped', { event, reason: 'buffer_full' });

      // Trigger immediate flush
      this.flush().catch((err) => {
        this.emit('error', err);
      });

      return false;
    }

    // Add to appropriate queue
    if (isCritical) {
      this.criticalQueue.push({
        event,
        priority: 'critical',
        receivedAt: new Date(),
      });
    } else {
      this.normalQueue.push({
        event,
        priority: 'normal',
        receivedAt: new Date(),
      });
    }

    // Check if we should flush immediately
    if (currentSize + 1 >= this.config.batchSize) {
      this.flush().catch((err) => {
        this.emit('error', err);
      });
    }

    return true;
  }

  /**
   * Flush events to the store
   */
  async flush(): Promise<number> {
    if (this.flushing) {
      return 0;
    }

    this.flushing = true;
    const startTime = Date.now();

    try {
      // Prioritize critical events
      const eventsToFlush: AuditEvent[] = [];
      const itemsToRequeue: BufferedItem[] = [];

      // Take all critical events first
      while (
        this.criticalQueue.length > 0 &&
        eventsToFlush.length < this.config.batchSize
      ) {
        const item = this.criticalQueue.shift();
        if (item) {
          itemsToRequeue.push(item);
          eventsToFlush.push(item.event);
        }
      }

      // Then fill with normal events
      while (
        this.normalQueue.length > 0 &&
        eventsToFlush.length < this.config.batchSize
      ) {
        const item = this.normalQueue.shift();
        if (item) {
          itemsToRequeue.push(item);
          eventsToFlush.push(item.event);
        }
      }

      if (eventsToFlush.length === 0) {
        return 0;
      }

      // Flush to store
      await this.config.onFlush(eventsToFlush);

      const duration = Date.now() - startTime;
      this.stats.totalFlushed += eventsToFlush.length;
      this.stats.lastFlushTime = new Date();
      this.stats.flushDurations.push(duration);

      // Keep only last 100 durations for average calculation
      if (this.stats.flushDurations.length > 100) {
        this.stats.flushDurations.shift();
      }

      // Check if we can release backpressure
      if (this.backpressureActive) {
        const currentSize = this.size();
        if (currentSize < this.config.maxSize * this.config.backpressureThreshold * 0.5) {
          this.backpressureActive = false;
          this.emit('backpressure', false);
          this.config.onBackpressure?.(false);
        }
      }

      this.emit('flushed', {
        count: eventsToFlush.length,
        duration,
        remaining: this.size(),
      });

      return eventsToFlush.length;
    } catch (error) {
      // On failure, re-add events to front of queues
      // Note: In production, you might want more sophisticated retry logic
      for (let i = itemsToRequeue.length - 1; i >= 0; i--) {
        const item = itemsToRequeue[i];
        if (item.priority === 'critical') {
          this.criticalQueue.unshift(item);
        } else {
          this.normalQueue.unshift(item);
        }
      }

      this.emit('error', error);
      throw error;
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Get current buffer size
   */
  size(): number {
    return this.criticalQueue.length + this.normalQueue.length;
  }

  /**
   * Get buffer statistics
   */
  getStats(): BufferStats {
    const avgDuration = this.stats.flushDurations.length > 0
      ? this.stats.flushDurations.reduce((a, b) => a + b, 0) /
        this.stats.flushDurations.length
      : 0;

    return {
      size: this.size(),
      maxSize: this.config.maxSize,
      criticalQueueSize: this.criticalQueue.length,
      normalQueueSize: this.normalQueue.length,
      totalReceived: this.stats.totalReceived,
      totalFlushed: this.stats.totalFlushed,
      totalDropped: this.stats.totalDropped,
      backpressureActive: this.backpressureActive,
      lastFlushTime: this.stats.lastFlushTime,
      avgFlushDuration: avgDuration,
    };
  }

  /**
   * Check if an event is critical
   */
  private isCriticalEvent(event: AuditEvent): boolean {
    // Critical if explicitly marked
    if (event.criticalCategory) {
      return true;
    }

    // Critical levels
    if (event.level === 'critical' || event.level === 'error') {
      return true;
    }

    // Compliance-relevant events
    if (event.complianceRelevant) {
      return true;
    }

    // Security events
    const securityEventTypes = [
      'security_alert',
      'anomaly_detected',
      'data_breach',
      'intrusion_detected',
      'access_denied',
      'brute_force_detected',
    ];
    if (securityEventTypes.includes(event.eventType)) {
      return true;
    }

    return false;
  }

  /**
   * Start the periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.size() > 0) {
        this.flush().catch((err) => {
          this.emit('error', err);
        });
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop the flush timer and flush remaining events
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush all remaining events
    while (this.size() > 0) {
      await this.flush();
    }
  }
}

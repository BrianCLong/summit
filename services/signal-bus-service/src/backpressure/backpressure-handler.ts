/**
 * Backpressure Handler
 *
 * Manages backpressure in the signal processing pipeline.
 * Features:
 * - Bounded in-memory queue with configurable limits
 * - Spill-to-disk when queue fills up
 * - Automatic pause/resume of consumers
 * - Lag metrics per partition and tenant
 *
 * @module backpressure
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

import type { Logger } from 'pino';

import type { BackpressureState, PartitionLag, ProcessingSignal } from '../types.js';

/**
 * Backpressure handler configuration
 */
export interface BackpressureConfig {
  /** Maximum queue size */
  maxQueueSize: number;
  /** High water mark (pause consumers when reached) */
  highWaterMark: number;
  /** Low water mark (resume consumers when reached) */
  lowWaterMark: number;
  /** Enable spill to disk */
  spillToDisk: boolean;
  /** Directory for spill files */
  spillDirectory: string;
  /** Maximum spill size in bytes */
  maxSpillSizeBytes: number;
  /** Pause consumers on high water mark */
  pauseOnHighWaterMark: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: BackpressureConfig = {
  maxQueueSize: 10000,
  highWaterMark: 8000,
  lowWaterMark: 2000,
  spillToDisk: true,
  spillDirectory: '/tmp/signal-bus-spill',
  maxSpillSizeBytes: 1073741824, // 1GB
  pauseOnHighWaterMark: true,
};

/**
 * Backpressure events
 */
export interface BackpressureEvents {
  highWaterMark: [];
  lowWaterMark: [];
  spillStarted: [];
  spillEnded: [];
  queueFull: [];
  error: [Error];
}

/**
 * Backpressure Handler class
 */
export class BackpressureHandler extends EventEmitter {
  private config: BackpressureConfig;
  private logger: Logger;
  private queue: ProcessingSignal[] = [];
  private spilledFiles: string[] = [];
  private spilledCount = 0;
  private spilledBytes = 0;
  private pausedPartitions = new Set<number>();
  private isHighWaterMarkActive = false;
  private lastStateChange = Date.now();
  private partitionLags = new Map<string, PartitionLag>();

  constructor(logger: Logger, config?: Partial<BackpressureConfig>) {
    super();
    this.logger = logger.child({ component: 'backpressure-handler' });
    this.config = { ...defaultConfig, ...config };

    this.initializeSpillDirectory().catch((error) => {
      this.logger.error({ error }, 'Failed to initialize spill directory');
    });
  }

  /**
   * Initialize the spill directory
   */
  private async initializeSpillDirectory(): Promise<void> {
    if (!this.config.spillToDisk) return;

    try {
      await fs.mkdir(this.config.spillDirectory, { recursive: true });
      this.logger.info(
        { directory: this.config.spillDirectory },
        'Spill directory initialized',
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to create spill directory');
      throw error;
    }
  }

  /**
   * Enqueue a signal for processing
   */
  async enqueue(signal: ProcessingSignal): Promise<boolean> {
    // Check if queue is full
    if (this.queue.length >= this.config.maxQueueSize) {
      if (this.config.spillToDisk && this.spilledBytes < this.config.maxSpillSizeBytes) {
        await this.spillToDisk([signal]);
        return true;
      }
      this.emit('queueFull');
      return false;
    }

    this.queue.push(signal);

    // Check high water mark
    if (
      !this.isHighWaterMarkActive &&
      this.queue.length >= this.config.highWaterMark
    ) {
      this.isHighWaterMarkActive = true;
      this.lastStateChange = Date.now();
      this.emit('highWaterMark');
      this.logger.warn(
        { queueSize: this.queue.length, highWaterMark: this.config.highWaterMark },
        'High water mark reached',
      );
    }

    return true;
  }

  /**
   * Enqueue multiple signals
   */
  async enqueueBatch(signals: ProcessingSignal[]): Promise<{
    enqueued: number;
    spilled: number;
    dropped: number;
  }> {
    let enqueued = 0;
    let spilled = 0;
    let dropped = 0;

    const availableSpace = this.config.maxQueueSize - this.queue.length;
    const toEnqueue = signals.slice(0, availableSpace);
    const toSpill = signals.slice(availableSpace);

    // Enqueue what fits
    this.queue.push(...toEnqueue);
    enqueued = toEnqueue.length;

    // Spill the rest
    if (toSpill.length > 0 && this.config.spillToDisk) {
      if (this.spilledBytes < this.config.maxSpillSizeBytes) {
        await this.spillToDisk(toSpill);
        spilled = toSpill.length;
      } else {
        dropped = toSpill.length;
      }
    } else if (toSpill.length > 0) {
      dropped = toSpill.length;
    }

    // Check water marks
    this.checkWaterMarks();

    return { enqueued, spilled, dropped };
  }

  /**
   * Dequeue signals for processing
   */
  async dequeue(maxCount: number): Promise<ProcessingSignal[]> {
    const signals: ProcessingSignal[] = [];

    // First, get from in-memory queue
    const fromQueue = this.queue.splice(0, maxCount);
    signals.push(...fromQueue);

    // If we need more and have spilled files, recover from disk
    if (signals.length < maxCount && this.spilledFiles.length > 0) {
      const fromDisk = await this.recoverFromDisk(maxCount - signals.length);
      signals.push(...fromDisk);
    }

    // Check low water mark
    this.checkWaterMarks();

    return signals;
  }

  /**
   * Check and emit water mark events
   */
  private checkWaterMarks(): void {
    const currentSize = this.queue.length;

    if (!this.isHighWaterMarkActive && currentSize >= this.config.highWaterMark) {
      this.isHighWaterMarkActive = true;
      this.lastStateChange = Date.now();
      this.emit('highWaterMark');
      this.logger.warn({ queueSize: currentSize }, 'High water mark reached');
    } else if (
      this.isHighWaterMarkActive &&
      currentSize <= this.config.lowWaterMark
    ) {
      this.isHighWaterMarkActive = false;
      this.lastStateChange = Date.now();
      this.emit('lowWaterMark');
      this.logger.info({ queueSize: currentSize }, 'Low water mark reached');
    }
  }

  /**
   * Spill signals to disk
   */
  private async spillToDisk(signals: ProcessingSignal[]): Promise<void> {
    if (signals.length === 0) return;

    const filename = `spill-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
    const filepath = path.join(this.config.spillDirectory, filename);

    const data = JSON.stringify(signals);
    await fs.writeFile(filepath, data, 'utf-8');

    this.spilledFiles.push(filepath);
    this.spilledCount += signals.length;
    this.spilledBytes += Buffer.byteLength(data, 'utf-8');

    if (this.spilledFiles.length === 1) {
      this.emit('spillStarted');
    }

    this.logger.debug(
      { filepath, count: signals.length, totalSpilled: this.spilledCount },
      'Spilled signals to disk',
    );
  }

  /**
   * Recover signals from disk
   */
  private async recoverFromDisk(maxCount: number): Promise<ProcessingSignal[]> {
    const signals: ProcessingSignal[] = [];

    while (signals.length < maxCount && this.spilledFiles.length > 0) {
      const filepath = this.spilledFiles.shift()!;

      try {
        const data = await fs.readFile(filepath, 'utf-8');
        const recovered: ProcessingSignal[] = JSON.parse(data);
        signals.push(...recovered.slice(0, maxCount - signals.length));

        // Delete the spill file
        await fs.unlink(filepath);

        this.spilledCount -= recovered.length;
        this.spilledBytes -= Buffer.byteLength(data, 'utf-8');

        this.logger.debug(
          { filepath, count: recovered.length, remainingSpilled: this.spilledCount },
          'Recovered signals from disk',
        );
      } catch (error) {
        this.logger.error({ error, filepath }, 'Failed to recover spill file');
        this.emit('error', error as Error);
      }
    }

    if (this.spilledFiles.length === 0 && this.spilledCount <= 0) {
      this.spilledCount = 0;
      this.spilledBytes = 0;
      this.emit('spillEnded');
    }

    return signals;
  }

  /**
   * Pause a partition
   */
  pausePartition(partition: number): void {
    this.pausedPartitions.add(partition);
    this.logger.debug({ partition }, 'Partition paused');
  }

  /**
   * Resume a partition
   */
  resumePartition(partition: number): void {
    this.pausedPartitions.delete(partition);
    this.logger.debug({ partition }, 'Partition resumed');
  }

  /**
   * Check if a partition is paused
   */
  isPartitionPaused(partition: number): boolean {
    return this.pausedPartitions.has(partition);
  }

  /**
   * Update lag metrics for a partition
   */
  updateLag(
    topic: string,
    partition: number,
    currentOffset: string,
    highWaterMark: string,
  ): void {
    const key = `${topic}:${partition}`;
    const lag = parseInt(highWaterMark, 10) - parseInt(currentOffset, 10);

    this.partitionLags.set(key, {
      topic,
      partition,
      currentOffset,
      highWaterMark,
      lag: Math.max(0, lag),
      lastUpdated: Date.now(),
    });
  }

  /**
   * Get lag for a specific partition
   */
  getLag(topic: string, partition: number): PartitionLag | undefined {
    return this.partitionLags.get(`${topic}:${partition}`);
  }

  /**
   * Get total lag across all partitions
   */
  getTotalLag(): number {
    let total = 0;
    for (const lag of this.partitionLags.values()) {
      total += lag.lag;
    }
    return total;
  }

  /**
   * Get all partition lags
   */
  getAllLags(): PartitionLag[] {
    return Array.from(this.partitionLags.values());
  }

  /**
   * Get current backpressure state
   */
  getState(): BackpressureState {
    return {
      active: this.isHighWaterMarkActive,
      queueSize: this.queue.length,
      maxQueueSize: this.config.maxQueueSize,
      spilledToDisk: this.spilledFiles.length > 0,
      spilledCount: this.spilledCount,
      spilledBytes: this.spilledBytes,
      pausedPartitions: Array.from(this.pausedPartitions),
      lastStateChange: this.lastStateChange,
    };
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueSize: number;
    maxQueueSize: number;
    utilizationPercent: number;
    spilledCount: number;
    spilledBytes: number;
    spilledFiles: number;
    pausedPartitions: number;
    isHighWaterMarkActive: boolean;
    totalLag: number;
  } {
    return {
      queueSize: this.queue.length,
      maxQueueSize: this.config.maxQueueSize,
      utilizationPercent: (this.queue.length / this.config.maxQueueSize) * 100,
      spilledCount: this.spilledCount,
      spilledBytes: this.spilledBytes,
      spilledFiles: this.spilledFiles.length,
      pausedPartitions: this.pausedPartitions.size,
      isHighWaterMarkActive: this.isHighWaterMarkActive,
      totalLag: this.getTotalLag(),
    };
  }

  /**
   * Clear all queued signals (for shutdown)
   */
  async clear(): Promise<void> {
    this.queue = [];
    this.pausedPartitions.clear();
    this.isHighWaterMarkActive = false;

    // Clean up spill files
    for (const filepath of this.spilledFiles) {
      try {
        await fs.unlink(filepath);
      } catch {
        // Ignore cleanup errors
      }
    }

    this.spilledFiles = [];
    this.spilledCount = 0;
    this.spilledBytes = 0;

    this.logger.info('Backpressure handler cleared');
  }

  /**
   * Shutdown the handler
   */
  async shutdown(): Promise<void> {
    await this.clear();
    this.removeAllListeners();
    this.logger.info('Backpressure handler shut down');
  }
}

/**
 * Create a backpressure handler instance
 */
export function createBackpressureHandler(
  logger: Logger,
  config?: Partial<BackpressureConfig>,
): BackpressureHandler {
  return new BackpressureHandler(logger, config);
}

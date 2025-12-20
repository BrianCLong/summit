// @ts-nocheck
/**
 * Backpressure Controller
 *
 * Implements token bucket rate limiting, concurrency control, and flow
 * management for ingest pipelines. Provides drain mode, brownout, and
 * adaptive throttling based on sink feedback.
 */

import { EventEmitter } from 'events';
import type {
  BackpressureConfig,
  BackpressureState,
  BackpressureMetrics,
} from '../types/index.js';

export interface BackpressureControllerEvents {
  stateChange: (state: BackpressureState, metrics: BackpressureMetrics) => void;
  throttle: (waitMs: number) => void;
  drop: (reason: string) => void;
}

export class BackpressureController extends EventEmitter {
  private config: Required<BackpressureConfig>;
  private state: BackpressureState = 'normal';
  private concurrencyUsed = 0;
  private queueDepth = 0;
  private tokensAvailable: number;
  private lastRefillTime: number;
  private throttleCount = 0;
  private dropCount = 0;
  private recordsProcessed = 0;
  private windowStart: number;
  private readonly windowMs = 1000;

  constructor(config: BackpressureConfig) {
    super();
    this.config = {
      max_concurrency: config.max_concurrency,
      rate_limit_rps: config.rate_limit_rps ?? 1000,
      token_bucket_capacity: config.token_bucket_capacity ?? config.rate_limit_rps ?? 1000,
      token_refill_rate: config.token_refill_rate ?? config.rate_limit_rps ?? 1000,
      high_water_mark: config.high_water_mark ?? 10000,
      low_water_mark: config.low_water_mark ?? 1000,
      drain_mode: config.drain_mode ?? false,
      brownout_enabled: config.brownout_enabled ?? false,
      brownout_sample_rate: config.brownout_sample_rate ?? 0.1,
    };

    this.tokensAvailable = this.config.token_bucket_capacity;
    this.lastRefillTime = Date.now();
    this.windowStart = Date.now();
  }

  /**
   * Acquire a concurrency slot and token for processing.
   * Returns true if acquisition succeeded, false if should back off.
   */
  async acquire(priority: number = 50): Promise<{ acquired: boolean; waitMs?: number }> {
    // Check drain mode
    if (this.config.drain_mode) {
      return { acquired: false, waitMs: 0 };
    }

    // Check brownout - drop non-critical records probabilistically
    if (this.state === 'brownout' && this.config.brownout_enabled) {
      if (priority < 50 && Math.random() > this.config.brownout_sample_rate) {
        this.dropCount++;
        this.emit('drop', 'brownout');
        return { acquired: false, waitMs: 0 };
      }
    }

    // Check concurrency limit
    if (this.concurrencyUsed >= this.config.max_concurrency) {
      this.throttleCount++;
      this.updateState();
      const waitMs = this.calculateBackoffMs();
      this.emit('throttle', waitMs);
      return { acquired: false, waitMs };
    }

    // Refill tokens
    this.refillTokens();

    // Check token availability
    if (this.tokensAvailable < 1) {
      this.throttleCount++;
      this.updateState();
      const waitMs = this.calculateTokenWaitMs();
      this.emit('throttle', waitMs);
      return { acquired: false, waitMs };
    }

    // Acquire resources
    this.concurrencyUsed++;
    this.tokensAvailable--;
    this.recordsProcessed++;

    return { acquired: true };
  }

  /**
   * Release a concurrency slot after processing completes.
   */
  release(): void {
    if (this.concurrencyUsed > 0) {
      this.concurrencyUsed--;
    }
    this.updateState();
  }

  /**
   * Update queue depth (from external queue monitoring).
   */
  setQueueDepth(depth: number): void {
    this.queueDepth = depth;
    this.updateState();
  }

  /**
   * Signal backpressure from downstream sink.
   */
  signalBackpressure(severity: 'light' | 'moderate' | 'severe'): void {
    switch (severity) {
      case 'light':
        if (this.state === 'normal') {
          this.setState('throttled');
        }
        break;
      case 'moderate':
        this.setState('throttled');
        // Reduce concurrency temporarily
        this.config.max_concurrency = Math.max(1, Math.floor(this.config.max_concurrency * 0.75));
        break;
      case 'severe':
        this.setState('brownout');
        this.config.max_concurrency = Math.max(1, Math.floor(this.config.max_concurrency * 0.5));
        break;
    }
  }

  /**
   * Release backpressure after sink recovers.
   */
  releaseBackpressure(): void {
    this.setState('normal');
    // Restore concurrency gradually
    this.config.max_concurrency = Math.min(
      this.config.max_concurrency * 1.25,
      this.config.token_bucket_capacity
    );
  }

  /**
   * Enable drain mode - finish in-flight work but stop accepting new records.
   */
  enableDrain(): void {
    this.config.drain_mode = true;
    this.setState('drain');
  }

  /**
   * Disable drain mode - resume accepting records.
   */
  disableDrain(): void {
    this.config.drain_mode = false;
    this.updateState();
  }

  /**
   * Enable brownout mode - sample/drop non-critical streams.
   */
  enableBrownout(sampleRate: number = 0.1): void {
    this.config.brownout_enabled = true;
    this.config.brownout_sample_rate = Math.max(0, Math.min(1, sampleRate));
    this.setState('brownout');
  }

  /**
   * Disable brownout mode.
   */
  disableBrownout(): void {
    this.config.brownout_enabled = false;
    this.updateState();
  }

  /**
   * Get current metrics.
   */
  getMetrics(): BackpressureMetrics {
    // Calculate current RPS
    const now = Date.now();
    const windowElapsed = now - this.windowStart;
    let rps = 0;
    if (windowElapsed >= this.windowMs) {
      rps = (this.recordsProcessed / windowElapsed) * 1000;
      this.recordsProcessed = 0;
      this.windowStart = now;
    }

    return {
      state: this.state,
      concurrency_used: this.concurrencyUsed,
      concurrency_max: this.config.max_concurrency,
      queue_depth: this.queueDepth,
      tokens_available: Math.floor(this.tokensAvailable),
      records_per_second: Math.round(rps),
      throttle_count: this.throttleCount,
      drop_count: this.dropCount,
    };
  }

  /**
   * Check if currently accepting new records.
   */
  isAccepting(): boolean {
    return (
      !this.config.drain_mode &&
      this.state !== 'paused' &&
      this.concurrencyUsed < this.config.max_concurrency
    );
  }

  /**
   * Pause all processing.
   */
  pause(): void {
    this.setState('paused');
  }

  /**
   * Resume processing.
   */
  resume(): void {
    if (this.state === 'paused') {
      this.updateState();
    }
  }

  /**
   * Reset metrics counters.
   */
  resetMetrics(): void {
    this.throttleCount = 0;
    this.dropCount = 0;
    this.recordsProcessed = 0;
    this.windowStart = Date.now();
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = (elapsed / 1000) * this.config.token_refill_rate;

    this.tokensAvailable = Math.min(
      this.tokensAvailable + tokensToAdd,
      this.config.token_bucket_capacity
    );
    this.lastRefillTime = now;
  }

  private calculateBackoffMs(): number {
    // Exponential backoff based on current load
    const loadFactor = this.concurrencyUsed / this.config.max_concurrency;
    const baseMs = 10;
    const maxMs = 1000;
    return Math.min(maxMs, baseMs * Math.pow(2, loadFactor * 5));
  }

  private calculateTokenWaitMs(): number {
    // Time until next token is available
    if (this.config.token_refill_rate <= 0) return 1000;
    return Math.ceil(1000 / this.config.token_refill_rate);
  }

  private updateState(): void {
    const previousState = this.state;

    if (this.config.drain_mode) {
      this.state = 'drain';
    } else if (this.state === 'paused') {
      // Keep paused until explicitly resumed
    } else if (this.queueDepth > this.config.high_water_mark) {
      this.state = this.config.brownout_enabled ? 'brownout' : 'throttled';
    } else if (
      this.queueDepth < this.config.low_water_mark &&
      this.concurrencyUsed < this.config.max_concurrency * 0.8
    ) {
      this.state = 'normal';
    } else if (this.concurrencyUsed >= this.config.max_concurrency) {
      this.state = 'throttled';
    }

    if (previousState !== this.state) {
      this.emit('stateChange', this.state, this.getMetrics());
    }
  }

  private setState(state: BackpressureState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('stateChange', state, this.getMetrics());
    }
  }
}

/**
 * Create a semaphore for limiting concurrent operations.
 */
export function createSemaphore(maxConcurrency: number) {
  let current = 0;
  const queue: Array<() => void> = [];

  return {
    async acquire(): Promise<() => void> {
      if (current < maxConcurrency) {
        current++;
        return () => {
          current--;
          if (queue.length > 0) {
            const next = queue.shift();
            if (next) {
              current++;
              next();
            }
          }
        };
      }

      return new Promise<() => void>((resolve) => {
        queue.push(() => {
          resolve(() => {
            current--;
            if (queue.length > 0) {
              const next = queue.shift();
              if (next) {
                current++;
                next();
              }
            }
          });
        });
      });
    },

    get available(): number {
      return maxConcurrency - current;
    },

    get waiting(): number {
      return queue.length;
    },
  };
}

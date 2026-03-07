/**
 * Backpressure Controller
 *
 * Implements flow control for ingest workers with:
 * - Concurrency limiting via semaphore
 * - Token bucket rate limiting
 * - Queue depth monitoring
 * - Drain and brownout modes
 */

import { EventEmitter } from "events";
import type { BackpressureConfig, WorkerState, WorkerMetrics } from "./types.js";
import { TokenBucket } from "./rate-limiter.js";

export interface BackpressureEvents {
  stateChange: (state: WorkerState, metrics: WorkerMetrics) => void;
  throttle: (waitMs: number, reason: string) => void;
  drop: (reason: string) => void;
}

export class BackpressureController extends EventEmitter {
  private state: WorkerState = "idle";
  private concurrencyUsed = 0;
  private queueDepth = 0;
  private tokenBucket: TokenBucket;

  // Metrics
  private totalProcessed = 0;
  private totalFailed = 0;
  private totalRetried = 0;
  private totalDropped = 0;
  private throttleCount = 0;
  private recordsInWindow = 0;
  private windowStart = Date.now();
  private readonly windowMs = 1000;

  // Mode flags
  private drainMode = false;
  private brownoutMode = false;

  constructor(
    private config: BackpressureConfig,
    private maxConcurrency: number
  ) {
    super();
    this.tokenBucket = new TokenBucket({
      capacity: config.tokenBucketCapacity,
      refillRate: config.tokenRefillRate,
    });
  }

  /**
   * Acquire resources for processing a task.
   * Returns true if resources were acquired, false otherwise.
   */
  async acquire(priority: number = 50): Promise<{
    acquired: boolean;
    waitMs?: number;
    reason?: string;
  }> {
    // Check drain mode
    if (this.drainMode) {
      return { acquired: false, waitMs: 0, reason: "drain_mode" };
    }

    // Check brownout - drop low-priority tasks probabilistically
    if (this.brownoutMode && priority < 50) {
      if (Math.random() > this.config.brownoutSampleRate) {
        this.totalDropped++;
        this.emit("drop", "brownout");
        return { acquired: false, waitMs: 0, reason: "brownout" };
      }
    }

    // Check concurrency limit
    if (this.concurrencyUsed >= this.maxConcurrency) {
      this.throttleCount++;
      this.updateState();
      const waitMs = this.calculateBackoffMs();
      this.emit("throttle", waitMs, "concurrency");
      return { acquired: false, waitMs, reason: "concurrency_limit" };
    }

    // Check token bucket
    if (!this.tokenBucket.tryConsume(1)) {
      this.throttleCount++;
      this.updateState();
      const waitMs = this.tokenBucket.getWaitTime(1);
      this.emit("throttle", waitMs, "rate_limit");
      return { acquired: false, waitMs, reason: "rate_limit" };
    }

    // Acquire concurrency slot
    this.concurrencyUsed++;
    this.recordsInWindow++;
    this.updateState();

    return { acquired: true };
  }

  /**
   * Release resources after task completion.
   */
  release(success: boolean = true, retried: boolean = false): void {
    if (this.concurrencyUsed > 0) {
      this.concurrencyUsed--;
    }

    if (success) {
      this.totalProcessed++;
    } else {
      this.totalFailed++;
    }

    if (retried) {
      this.totalRetried++;
    }

    this.updateState();
  }

  /**
   * Update queue depth from external monitoring.
   */
  setQueueDepth(depth: number): void {
    this.queueDepth = depth;
    this.updateState();
  }

  /**
   * Signal backpressure from downstream.
   */
  signalBackpressure(severity: "light" | "moderate" | "severe"): void {
    switch (severity) {
      case "light":
        // Minor throttling
        break;
      case "moderate":
        this.setState("running");
        break;
      case "severe":
        this.enableBrownout();
        break;
    }
  }

  /**
   * Enable drain mode - finish in-flight work, stop accepting new tasks.
   */
  enableDrain(): void {
    this.drainMode = true;
    this.setState("draining");
  }

  /**
   * Disable drain mode.
   */
  disableDrain(): void {
    this.drainMode = false;
    this.updateState();
  }

  /**
   * Enable brownout mode - sample/drop non-critical tasks.
   */
  enableBrownout(sampleRate?: number): void {
    this.brownoutMode = true;
    if (sampleRate !== undefined) {
      this.config.brownoutSampleRate = Math.max(0, Math.min(1, sampleRate));
    }
    this.setState("brownout");
  }

  /**
   * Disable brownout mode.
   */
  disableBrownout(): void {
    this.brownoutMode = false;
    this.updateState();
  }

  /**
   * Pause all processing.
   */
  pause(): void {
    this.setState("paused");
  }

  /**
   * Resume processing.
   */
  resume(): void {
    if (this.state === "paused") {
      this.updateState();
    }
  }

  /**
   * Stop the controller.
   */
  stop(): void {
    this.setState("stopped");
  }

  /**
   * Start the controller.
   */
  start(): void {
    if (this.state === "stopped" || this.state === "idle") {
      this.setState("running");
    }
  }

  /**
   * Check if accepting new tasks.
   */
  isAccepting(): boolean {
    return (
      !this.drainMode &&
      this.state !== "paused" &&
      this.state !== "stopped" &&
      this.concurrencyUsed < this.maxConcurrency
    );
  }

  /**
   * Check if draining.
   */
  isDraining(): boolean {
    return this.drainMode;
  }

  /**
   * Check if all in-flight work is complete.
   */
  isDrained(): boolean {
    return this.drainMode && this.concurrencyUsed === 0;
  }

  /**
   * Get current metrics.
   */
  getMetrics(): Omit<WorkerMetrics, "circuitState"> {
    // Calculate current RPS
    const now = Date.now();
    const elapsed = now - this.windowStart;
    let rps = 0;

    if (elapsed >= this.windowMs) {
      rps = (this.recordsInWindow / elapsed) * 1000;
      this.recordsInWindow = 0;
      this.windowStart = now;
    }

    return {
      state: this.state,
      concurrencyUsed: this.concurrencyUsed,
      concurrencyMax: this.maxConcurrency,
      queueDepth: this.queueDepth,
      tokensAvailable: Math.floor(this.tokenBucket.getTokens()),
      recordsPerSecond: Math.round(rps),
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      totalRetried: this.totalRetried,
      totalDropped: this.totalDropped,
    };
  }

  /**
   * Reset metrics counters.
   */
  resetMetrics(): void {
    this.totalProcessed = 0;
    this.totalFailed = 0;
    this.totalRetried = 0;
    this.totalDropped = 0;
    this.throttleCount = 0;
    this.recordsInWindow = 0;
    this.windowStart = Date.now();
  }

  /**
   * Update max concurrency dynamically.
   */
  setMaxConcurrency(max: number): void {
    this.maxConcurrency = Math.max(1, max);
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private updateState(): void {
    const previousState = this.state;

    if (this.state === "stopped") {
      return; // Don't change from stopped
    }

    if (this.state === "paused") {
      return; // Don't change from paused (must explicitly resume)
    }

    if (this.drainMode) {
      this.state = "draining";
    } else if (this.brownoutMode) {
      this.state = "brownout";
    } else if (this.queueDepth > this.config.highWaterMark) {
      // Auto-enable brownout on high queue depth
      this.brownoutMode = true;
      this.state = "brownout";
    } else if (this.queueDepth < this.config.lowWaterMark) {
      this.brownoutMode = false;
      this.state = "running";
    } else if (this.concurrencyUsed > 0) {
      this.state = "running";
    } else {
      this.state = "idle";
    }

    if (previousState !== this.state) {
      this.emit("stateChange", this.state, { ...this.getMetrics(), circuitState: "closed" });
    }
  }

  private setState(state: WorkerState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit("stateChange", state, { ...this.getMetrics(), circuitState: "closed" });
    }
  }

  private calculateBackoffMs(): number {
    const loadFactor = this.concurrencyUsed / this.maxConcurrency;
    const baseMs = 10;
    const maxMs = 1000;
    return Math.min(maxMs, baseMs * Math.pow(2, loadFactor * 5));
  }
}

/**
 * Semaphore for limiting concurrent operations.
 */
export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(private readonly maxPermits: number) {
    this.permits = maxPermits;
  }

  /**
   * Acquire a permit, waiting if necessary.
   */
  async acquire(): Promise<Releaser> {
    if (this.permits > 0) {
      this.permits--;
      return () => this.release();
    }

    return new Promise<Releaser>((resolve) => {
      this.queue.push(() => {
        this.permits--;
        resolve(() => this.release());
      });
    });
  }

  /**
   * Try to acquire a permit without waiting.
   */
  tryAcquire(): Releaser | null {
    if (this.permits > 0) {
      this.permits--;
      return () => this.release();
    }
    return null;
  }

  /**
   * Release a permit.
   */
  private release(): void {
    this.permits++;

    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    }
  }

  /**
   * Get available permits.
   */
  get available(): number {
    return this.permits;
  }

  /**
   * Get number of waiters.
   */
  get waiting(): number {
    return this.queue.length;
  }
}

export type Releaser = () => void;

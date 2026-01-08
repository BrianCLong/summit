/**
 * Ingest Worker
 *
 * Main worker implementation combining all components:
 * - Backpressure control
 * - Rate limiting
 * - Circuit breaking
 * - Retry with exponential backoff
 * - Idempotency checking
 * - DLQ routing
 */

import { EventEmitter } from "events";
import { trace, context, SpanStatusCode, type Span } from "@opentelemetry/api";
import pino from "pino";

import type {
  WorkerConfig,
  WorkerState,
  WorkerMetrics,
  Task,
  TaskResult,
  TaskHandler,
  DLQHandler,
  DLQReasonCode,
  WorkerEvents,
} from "./types.js";
import { BackpressureController, Semaphore } from "./backpressure.js";
import { MultiTenantRateLimiter } from "./rate-limiter.js";
import { CircuitBreaker, CircuitBreakerError } from "./circuit-breaker.js";
import { retry, classifyError, isRetryable } from "./retry.js";
import type { IdempotencyStore } from "./idempotency.js";

const tracer = trace.getTracer("@intelgraph/ingest-worker");

export interface WorkerDependencies {
  /** Logger instance */
  logger?: pino.Logger;
  /** Idempotency store */
  idempotencyStore?: IdempotencyStore;
}

export class IngestWorker<T = unknown, R = unknown> extends EventEmitter {
  private state: WorkerState = "idle";
  private backpressure: BackpressureController;
  private rateLimiter: MultiTenantRateLimiter;
  private circuitBreaker: CircuitBreaker;
  private semaphore: Semaphore;
  private logger: pino.Logger;
  private idempotencyStore?: IdempotencyStore;
  private taskHandler?: TaskHandler<T, R>;
  private dlqHandler?: DLQHandler<T>;
  private events: WorkerEvents<T>;

  // Processing state
  private activeTasks = new Map<string, Task<T>>();
  private taskQueue: Array<{ task: Task<T>; resolve: (result: TaskResult<R>) => void }> = [];
  private processLoopRunning = false;

  constructor(
    private config: WorkerConfig,
    deps: WorkerDependencies = {},
    events: WorkerEvents<T> = {}
  ) {
    super();

    this.logger = deps.logger ?? pino({ name: config.name, level: "info" });
    this.idempotencyStore = deps.idempotencyStore;
    this.events = events;

    // Initialize backpressure controller
    this.backpressure = new BackpressureController(config.backpressure, config.maxConcurrency);

    // Initialize rate limiter
    const tenantConfigs: Record<string, { capacity: number; refillRate: number }> = {};
    if (config.tenantRateLimits) {
      for (const [tenantId, rps] of Object.entries(config.tenantRateLimits)) {
        tenantConfigs[tenantId] = { capacity: rps * 2, refillRate: rps };
      }
    }

    this.rateLimiter = new MultiTenantRateLimiter(
      {
        capacity: (config.globalRateLimit ?? 1000) * 2,
        refillRate: config.globalRateLimit ?? 1000,
      },
      {
        capacity: 200,
        refillRate: 100,
      },
      tenantConfigs
    );

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);

    // Initialize semaphore
    this.semaphore = new Semaphore(config.maxConcurrency);

    // Wire up events
    this.backpressure.on("stateChange", (state: WorkerState, metrics: WorkerMetrics) => {
      this.state = state;
      this.events.onStateChange?.(state, this.getMetrics());
      this.events.onBackpressure?.(this.getMetrics());
    });

    this.circuitBreaker.on("stateChange", (state: "closed" | "open" | "half-open") => {
      this.events.onCircuitStateChange?.(state);
    });
  }

  /**
   * Set the task handler function.
   */
  setTaskHandler(handler: TaskHandler<T, R>): void {
    this.taskHandler = handler;
  }

  /**
   * Set the DLQ handler function.
   */
  setDLQHandler(handler: DLQHandler<T>): void {
    this.dlqHandler = handler;
  }

  /**
   * Start the worker.
   */
  async start(): Promise<void> {
    this.backpressure.start();
    this.startProcessLoop();
    this.logger.info({ name: this.config.name }, "Worker started");
  }

  /**
   * Stop the worker gracefully.
   */
  async stop(): Promise<void> {
    this.backpressure.stop();
    this.processLoopRunning = false;

    // Wait for active tasks to complete
    while (this.activeTasks.size > 0) {
      await this.sleep(100);
    }

    if (this.idempotencyStore) {
      await this.idempotencyStore.close();
    }

    this.logger.info({ name: this.config.name }, "Worker stopped");
  }

  /**
   * Drain the worker - finish in-flight work but stop accepting new tasks.
   */
  async drain(): Promise<void> {
    this.backpressure.enableDrain();
    this.logger.info({ name: this.config.name }, "Drain mode enabled");

    // Wait for drain to complete
    while (!this.backpressure.isDrained()) {
      await this.sleep(100);
    }

    this.logger.info({ name: this.config.name }, "Drain complete");
  }

  /**
   * Submit a task for processing.
   */
  async submit(task: Task<T>): Promise<TaskResult<R>> {
    return new Promise((resolve) => {
      this.taskQueue.push({ task, resolve });
    });
  }

  /**
   * Process a task immediately (bypass queue).
   */
  async process(task: Task<T>): Promise<TaskResult<R>> {
    return this.processTask(task);
  }

  /**
   * Get current worker metrics.
   */
  getMetrics(): WorkerMetrics {
    const backpressureMetrics = this.backpressure.getMetrics();
    return {
      ...backpressureMetrics,
      circuitState: this.circuitBreaker.getState(),
    };
  }

  /**
   * Get worker state.
   */
  getState(): WorkerState {
    return this.state;
  }

  /**
   * Check if worker is accepting tasks.
   */
  isAccepting(): boolean {
    return this.backpressure.isAccepting();
  }

  /**
   * Enable brownout mode.
   */
  enableBrownout(sampleRate?: number): void {
    this.backpressure.enableBrownout(sampleRate);
  }

  /**
   * Disable brownout mode.
   */
  disableBrownout(): void {
    this.backpressure.disableBrownout();
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private startProcessLoop(): void {
    if (this.processLoopRunning) return;
    this.processLoopRunning = true;

    const loop = async () => {
      while (this.processLoopRunning) {
        if (this.taskQueue.length === 0 || !this.backpressure.isAccepting()) {
          await this.sleep(10);
          continue;
        }

        const item = this.taskQueue.shift();
        if (!item) continue;

        // Process in background
        this.processTask(item.task).then(item.resolve);
      }
    };

    loop().catch((error) => {
      this.logger.error({ error }, "Process loop error");
    });
  }

  private async processTask(task: Task<T>): Promise<TaskResult<R>> {
    return tracer.startActiveSpan("ingest.worker.process", async (span): Promise<TaskResult<R>> => {
      span.setAttribute("task.id", task.id);
      span.setAttribute("task.tenant_id", task.tenantId);
      span.setAttribute("task.priority", task.priority);

      try {
        // Check idempotency
        if (task.dedupeKey && this.idempotencyStore) {
          const alreadyProcessed = await this.idempotencyStore.has(task.dedupeKey);
          if (alreadyProcessed) {
            span.addEvent("task_skipped_duplicate");
            return {
              success: true,
              attempts: 0,
              totalDelayMs: 0,
            } as TaskResult<R>;
          }
        }

        // Acquire backpressure slot
        const { acquired, waitMs, reason } = await this.backpressure.acquire(task.priority);

        if (!acquired) {
          if (reason === "brownout" || reason === "drain_mode") {
            span.addEvent("task_dropped", { reason });
            this.events.onTaskDrop?.(task, reason);
            return {
              success: false,
              attempts: 0,
              totalDelayMs: 0,
              reasonCode: "RATE_LIMITED",
            };
          }

          // Wait and retry
          if (waitMs && waitMs > 0) {
            await this.sleep(waitMs);
          }
        }

        // Acquire rate limit
        const rateLimitWait = await this.rateLimiter.acquire(task.tenantId);
        if (rateLimitWait > 0) {
          span.addEvent("rate_limited", { waitMs: rateLimitWait });
        }

        // Acquire semaphore
        const release = await this.semaphore.acquire();

        try {
          // Track active task
          this.activeTasks.set(task.id, task);
          this.events.onTaskStart?.(task);

          // Execute with circuit breaker and retry
          const result = await this.executeWithRetry(task, span);

          if (result.success) {
            // Mark as processed in idempotency store
            if (task.dedupeKey && this.idempotencyStore) {
              await this.idempotencyStore.set(task.dedupeKey, {
                taskId: task.id,
                tenantId: task.tenantId,
              });
            }

            this.events.onTaskSuccess?.(task, result.value);
            this.backpressure.release(true, result.attempts > 1);
            span.setStatus({ code: SpanStatusCode.OK });
          } else {
            // Send to DLQ
            await this.sendToDLQ(task, result.reasonCode!, result.error!);
            this.backpressure.release(false, result.attempts > 1);
            span.setStatus({ code: SpanStatusCode.ERROR, message: result.error?.message });
          }

          return result;
        } finally {
          release();
          this.activeTasks.delete(task.id);
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error as Error);

        const reasonCode = classifyError(error);
        await this.sendToDLQ(task, reasonCode, error as Error);
        this.backpressure.release(false);

        return {
          success: false,
          error: error as Error,
          attempts: 1,
          totalDelayMs: 0,
          reasonCode,
        };
      } finally {
        span.end();
      }
    });
  }

  private async executeWithRetry(task: Task<T>, parentSpan: Span): Promise<TaskResult<R>> {
    if (!this.taskHandler) {
      throw new Error("Task handler not set");
    }

    return retry<R>(
      async () => {
        // Execute with circuit breaker
        return this.circuitBreaker.execute(async () => {
          return this.taskHandler!(task);
        });
      },
      this.config.retry,
      {
        onRetry: (ctx) => {
          this.events.onTaskRetry?.(task, ctx.lastError!, ctx.attempt);
          this.logger.debug(
            { taskId: task.id, attempt: ctx.attempt, delay: ctx.totalDelayMs },
            "Retrying task"
          );
        },
        onError: (error, ctx) => {
          this.logger.warn(
            { taskId: task.id, attempt: ctx.attempt, error: error.message },
            "Task attempt failed"
          );
        },
        shouldRetry: (error, ctx) => {
          // Don't retry circuit breaker errors
          if (error instanceof CircuitBreakerError) {
            return false;
          }
          return isRetryable(error, this.config.retry);
        },
      }
    );
  }

  private async sendToDLQ(task: Task<T>, reason: DLQReasonCode, error: Error): Promise<void> {
    this.events.onTaskDLQ?.(task, reason, error);

    if (this.dlqHandler) {
      try {
        await this.dlqHandler(task, reason, error);
      } catch (dlqError) {
        this.logger.error({ taskId: task.id, reason, dlqError }, "Failed to send task to DLQ");
      }
    }

    this.logger.warn({ taskId: task.id, reason, error: error.message }, "Task sent to DLQ");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a worker with default configuration.
 */
export function createWorker<T = unknown, R = unknown>(
  name: string,
  options: Partial<WorkerConfig> = {},
  deps: WorkerDependencies = {},
  events: WorkerEvents<T> = {}
): IngestWorker<T, R> {
  const config: WorkerConfig = {
    name,
    maxConcurrency: options.maxConcurrency ?? 10,
    globalRateLimit: options.globalRateLimit ?? 1000,
    tenantRateLimits: options.tenantRateLimits,
    retry: options.retry ?? {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2.0,
      jitterFactor: 0.1,
    },
    circuitBreaker: options.circuitBreaker ?? {
      failureThreshold: 5,
      recoveryTimeMs: 30000,
      successThreshold: 3,
      windowSizeMs: 60000,
    },
    backpressure: options.backpressure ?? {
      tokenBucketCapacity: 2000,
      tokenRefillRate: 1000,
      highWaterMark: 10000,
      lowWaterMark: 1000,
      brownoutSampleRate: 0.1,
    },
    idempotency: options.idempotency,
  };

  return new IngestWorker<T, R>(config, deps, events);
}

/**
 * @intelgraph/ingest-worker
 *
 * Standard worker library for ingest/ETL pipelines with:
 * - Concurrency tokens and semaphores
 * - Token bucket rate limiting with per-tenant limits
 * - Exponential backoff with jitter and bounded retries
 * - Circuit breakers for sink protection
 * - Dead-letter routing after K retries
 * - Drain mode and brownout support
 */

export * from "./backpressure.js";
export * from "./retry.js";
export * from "./circuit-breaker.js";
export * from "./idempotency.js";
export * from "./rate-limiter.js";
export * from "./worker.js";
export type {
  WorkerState,
  DLQReasonCode,
  WorkerConfig,
  RetryConfig,
  CircuitBreakerConfig,
  BackpressureConfig,
  IdempotencyConfig,
  WorkerMetrics,
  Task,
  TaskResult,
  TaskHandler,
  DLQHandler,
  WorkerEvents,
} from "./types.js";

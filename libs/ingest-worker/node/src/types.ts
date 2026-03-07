/**
 * Worker Library Types
 */

export type WorkerState = "idle" | "running" | "draining" | "brownout" | "paused" | "stopped";

export type DLQReasonCode =
  | "SCHEMA_DRIFT"
  | "VALIDATION_FAIL"
  | "OLDER_REVISION"
  | "SINK_TIMEOUT"
  | "CONSTRAINT_VIOLATION"
  | "SERIALIZATION_ERROR"
  | "CONNECTION_ERROR"
  | "RATE_LIMITED"
  | "CIRCUIT_OPEN"
  | "MAX_RETRIES_EXCEEDED"
  | "UNKNOWN";

export interface WorkerConfig {
  /** Worker name for logging and metrics */
  name: string;

  /** Maximum concurrent tasks */
  maxConcurrency: number;

  /** Global rate limit (records per second) */
  globalRateLimit?: number;

  /** Per-tenant rate limits */
  tenantRateLimits?: Record<string, number>;

  /** Retry configuration */
  retry: RetryConfig;

  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;

  /** Backpressure configuration */
  backpressure: BackpressureConfig;

  /** Idempotency configuration */
  idempotency?: IdempotencyConfig;
}

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Initial delay in milliseconds */
  initialDelayMs: number;

  /** Maximum delay in milliseconds */
  maxDelayMs: number;

  /** Backoff multiplier */
  backoffMultiplier: number;

  /** Jitter factor (0-1) */
  jitterFactor: number;

  /** Error codes that should not be retried */
  nonRetryableErrors?: DLQReasonCode[];
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;

  /** Time in ms before trying half-open state */
  recoveryTimeMs: number;

  /** Number of successes in half-open before closing */
  successThreshold: number;

  /** Window size for failure counting */
  windowSizeMs: number;
}

export interface BackpressureConfig {
  /** Token bucket capacity */
  tokenBucketCapacity: number;

  /** Token refill rate per second */
  tokenRefillRate: number;

  /** Queue high water mark - trigger backpressure */
  highWaterMark: number;

  /** Queue low water mark - release backpressure */
  lowWaterMark: number;

  /** Brownout sample rate (0-1) when in brownout mode */
  brownoutSampleRate: number;
}

export interface IdempotencyConfig {
  /** Enable idempotency checking */
  enabled: boolean;

  /** Store type for idempotency keys */
  storeType: "redis" | "postgres";

  /** TTL for idempotency keys in seconds */
  ttlSeconds: number;

  /** Key prefix */
  keyPrefix: string;
}

export interface WorkerMetrics {
  state: WorkerState;
  concurrencyUsed: number;
  concurrencyMax: number;
  queueDepth: number;
  tokensAvailable: number;
  recordsPerSecond: number;
  totalProcessed: number;
  totalFailed: number;
  totalRetried: number;
  totalDropped: number;
  circuitState: "closed" | "open" | "half-open";
}

export interface Task<T = unknown> {
  /** Unique task ID */
  id: string;

  /** Tenant ID for rate limiting */
  tenantId: string;

  /** Task priority (0-100, higher = more urgent) */
  priority: number;

  /** Idempotency key */
  dedupeKey?: string;

  /** Task payload */
  payload: T;

  /** Retry count */
  retryCount: number;

  /** First attempt timestamp */
  firstAttemptAt?: string;

  /** Last attempt timestamp */
  lastAttemptAt?: string;

  /** Error from last attempt */
  lastError?: string;
}

export interface TaskResult<T = unknown> {
  /** Whether the task succeeded */
  success: boolean;

  /** Result value if successful */
  value?: T;

  /** Error if failed */
  error?: Error;

  /** Number of attempts made */
  attempts: number;

  /** Total delay incurred from retries */
  totalDelayMs: number;

  /** Final DLQ reason code if failed */
  reasonCode?: DLQReasonCode;
}

export type TaskHandler<T, R> = (task: Task<T>) => Promise<R>;

export type DLQHandler<T> = (task: Task<T>, reason: DLQReasonCode, error: Error) => Promise<void>;

export interface WorkerEvents<T> {
  /** Called when worker state changes */
  onStateChange?: (state: WorkerState, metrics: WorkerMetrics) => void;

  /** Called when task starts processing */
  onTaskStart?: (task: Task<T>) => void;

  /** Called when task completes successfully */
  onTaskSuccess?: (task: Task<T>, result: unknown) => void;

  /** Called when task fails and will be retried */
  onTaskRetry?: (task: Task<T>, error: Error, attempt: number) => void;

  /** Called when task fails and is sent to DLQ */
  onTaskDLQ?: (task: Task<T>, reason: DLQReasonCode, error: Error) => void;

  /** Called when task is dropped (brownout) */
  onTaskDrop?: (task: Task<T>, reason: string) => void;

  /** Called when circuit breaker state changes */
  onCircuitStateChange?: (state: "closed" | "open" | "half-open") => void;

  /** Called when backpressure state changes */
  onBackpressure?: (metrics: WorkerMetrics) => void;
}

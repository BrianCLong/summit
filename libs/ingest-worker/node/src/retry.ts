/**
 * Retry Logic with Exponential Backoff and Jitter
 *
 * Provides bounded retries with configurable backoff strategy
 * for resilient ingest processing.
 */

import type { RetryConfig, DLQReasonCode, TaskResult } from "./types.js";

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2.0,
  jitterFactor: 0.1,
  nonRetryableErrors: [
    "SCHEMA_DRIFT",
    "VALIDATION_FAIL",
    "OLDER_REVISION",
    "CONSTRAINT_VIOLATION",
    "SERIALIZATION_ERROR",
  ],
};

/**
 * Calculate delay for a given attempt with exponential backoff and jitter.
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  // Base delay with exponential backoff (attempt is 1-indexed)
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (±jitter_factor * delay)
  const jitterRange = cappedDelay * config.jitterFactor;
  const jitter = (Math.random() * 2 - 1) * jitterRange;

  return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classify an error into a DLQ reason code.
 */
export function classifyError(error: Error | unknown): DLQReasonCode {
  if (!error) return "UNKNOWN";

  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message.toLowerCase();
  const name = err.name.toLowerCase();

  if (message.includes("validation") || message.includes("invalid")) {
    return "VALIDATION_FAIL";
  }

  if (message.includes("schema") || message.includes("drift")) {
    return "SCHEMA_DRIFT";
  }

  if (message.includes("revision") || message.includes("older") || message.includes("stale")) {
    return "OLDER_REVISION";
  }

  if (message.includes("timeout") || message.includes("timed out") || name.includes("timeout")) {
    return "SINK_TIMEOUT";
  }

  if (
    message.includes("constraint") ||
    message.includes("duplicate") ||
    message.includes("unique") ||
    message.includes("23505") // PostgreSQL unique violation
  ) {
    return "CONSTRAINT_VIOLATION";
  }

  if (message.includes("serialize") || message.includes("json") || message.includes("parse")) {
    return "SERIALIZATION_ERROR";
  }

  if (
    message.includes("connection") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("socket hang up")
  ) {
    return "CONNECTION_ERROR";
  }

  if (
    message.includes("rate") ||
    message.includes("429") ||
    message.includes("throttle") ||
    message.includes("too many")
  ) {
    return "RATE_LIMITED";
  }

  if (message.includes("circuit") || message.includes("breaker")) {
    return "CIRCUIT_OPEN";
  }

  return "UNKNOWN";
}

/**
 * Check if an error is retryable based on its reason code.
 */
export function isRetryable(error: Error | unknown, config: RetryConfig): boolean {
  const reasonCode = classifyError(error);
  return !config.nonRetryableErrors?.includes(reasonCode);
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  totalDelayMs: number;
  lastError?: Error;
}

export type RetryCallback = (context: RetryContext) => void;

/**
 * Execute a function with retry logic.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  callbacks?: {
    onRetry?: RetryCallback;
    onError?: (error: Error, context: RetryContext) => void;
    shouldRetry?: (error: Error, context: RetryContext) => boolean;
  }
): Promise<TaskResult<T>> {
  let lastError: Error | undefined;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const context: RetryContext = {
      attempt,
      maxAttempts: config.maxAttempts,
      totalDelayMs,
      lastError,
    };

    try {
      const value = await fn();
      return {
        success: true,
        value,
        attempts: attempt,
        totalDelayMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Call error callback
      callbacks?.onError?.(lastError, context);

      // Check if we should retry
      if (attempt < config.maxAttempts) {
        const shouldRetry = callbacks?.shouldRetry
          ? callbacks.shouldRetry(lastError, context)
          : isRetryable(lastError, config);

        if (!shouldRetry) {
          // Non-retryable error
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDelayMs,
            reasonCode: classifyError(lastError),
          };
        }

        // Calculate and apply delay
        const delayMs = calculateDelay(attempt, config);
        totalDelayMs += delayMs;

        // Call retry callback
        callbacks?.onRetry?.({ ...context, totalDelayMs });

        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
    totalDelayMs,
    reasonCode: lastError ? classifyError(lastError) : "MAX_RETRIES_EXCEEDED",
  };
}

/**
 * Create a reusable retry wrapper.
 */
export function createRetrier(config: RetryConfig = DEFAULT_RETRY_CONFIG) {
  return {
    /**
     * Execute with retry.
     */
    async execute<T>(
      fn: () => Promise<T>,
      callbacks?: Parameters<typeof retry>[2]
    ): Promise<TaskResult<T>> {
      return retry(fn, config, callbacks);
    },

    /**
     * Execute with retry, throwing on failure.
     */
    async executeOrThrow<T>(
      fn: () => Promise<T>,
      callbacks?: Parameters<typeof retry>[2]
    ): Promise<T> {
      const result = await retry(fn, config, callbacks);
      if (!result.success) {
        throw result.error ?? new Error("Retry failed");
      }
      return result.value!;
    },

    /**
     * Get the config.
     */
    getConfig(): RetryConfig {
      return { ...config };
    },
  };
}

/**
 * Decorator for retrying class methods.
 */
export function Retryable(config: RetryConfig = DEFAULT_RETRY_CONFIG) {
  return function <T>(
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: unknown[]) => Promise<T>>
  ): TypedPropertyDescriptor<(...args: unknown[]) => Promise<T>> {
    const originalMethod = descriptor.value;

    if (!originalMethod) {
      return descriptor;
    }

    descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<T> {
      const result = await retry<T>(() => originalMethod.apply(this, args), config);

      if (!result.success) {
        throw result.error ?? new Error("Retry failed");
      }

      return result.value!;
    };

    return descriptor;
  };
}

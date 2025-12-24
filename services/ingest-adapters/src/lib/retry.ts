/**
 * Retry Logic with Exponential Backoff and Jitter
 *
 * Implements bounded retries with configurable backoff strategy
 * for resilient ingest processing.
 */

import type { RetryConfig, DLQReasonCode } from '../types/index.js';

export interface RetryResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
  finalReasonCode?: DLQReasonCode;
}

export interface RetryContext {
  attempt: number;
  totalAttempts: number;
  lastError?: Error;
  lastDelayMs: number;
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  max_attempts: 3,
  initial_delay_ms: 1000,
  max_delay_ms: 30000,
  backoff_multiplier: 2.0,
  jitter_factor: 0.1,
};

/**
 * Calculate delay for a given attempt with exponential backoff and jitter.
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Base delay with exponential backoff
  const exponentialDelay = config.initial_delay_ms * Math.pow(config.backoff_multiplier, attempt - 1);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.max_delay_ms);

  // Add jitter (±jitter_factor * delay)
  const jitterRange = cappedDelay * config.jitter_factor;
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
 * Retry a function with exponential backoff.
 */
export async function retry<T>(
  fn: (context: RetryContext) => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  shouldRetry?: (error: Error, context: RetryContext) => boolean
): Promise<RetryResult<T>> {
  let lastError: Error | undefined;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= config.max_attempts; attempt++) {
    const context: RetryContext = {
      attempt,
      totalAttempts: config.max_attempts,
      lastError,
      lastDelayMs: attempt > 1 ? calculateDelay(attempt - 1, config) : 0,
    };

    try {
      const value = await fn(context);
      return {
        success: true,
        value,
        attempts: attempt,
        totalDelayMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < config.max_attempts) {
        if (shouldRetry && !shouldRetry(lastError, context)) {
          // Non-retryable error
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDelayMs,
            finalReasonCode: classifyError(lastError),
          };
        }

        // Calculate and apply delay
        const delayMs = calculateDelay(attempt, config);
        totalDelayMs += delayMs;
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError,
    attempts: config.max_attempts,
    totalDelayMs,
    finalReasonCode: classifyError(lastError),
  };
}

/**
 * Retry with a circuit breaker pattern.
 */
export class RetryWithCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private config: RetryConfig & {
      failureThreshold: number;
      recoveryTimeMs: number;
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    // Check circuit state
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure < this.config.recoveryTimeMs) {
        return {
          success: false,
          error: new Error('Circuit breaker is open'),
          attempts: 0,
          totalDelayMs: 0,
          finalReasonCode: 'CONNECTION_ERROR',
        };
      }
      // Try half-open
      this.state = 'half-open';
    }

    const result = await retry(
      async () => fn(),
      this.config,
      (error) => this.isRetryableError(error)
    );

    if (result.success) {
      this.onSuccess();
    } else {
      this.onFailure();
    }

    return result;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  private isRetryableError(error: Error): boolean {
    // Add logic to determine if error is retryable
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('socket hang up') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('504')
    );
  }

  get circuitState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  get failureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}

/**
 * Classify an error into a DLQ reason code.
 */
export function classifyError(error: Error | undefined): DLQReasonCode {
  if (!error) return 'UNKNOWN';

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (message.includes('validation') || message.includes('invalid')) {
    return 'VALIDATION_FAIL';
  }

  if (message.includes('schema') || message.includes('drift')) {
    return 'SCHEMA_DRIFT';
  }

  if (message.includes('revision') || message.includes('older')) {
    return 'OLDER_REVISION';
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return 'SINK_TIMEOUT';
  }

  if (
    message.includes('constraint') ||
    message.includes('duplicate') ||
    message.includes('unique')
  ) {
    return 'CONSTRAINT_VIOLATION';
  }

  if (message.includes('serialize') || message.includes('json')) {
    return 'SERIALIZATION_ERROR';
  }

  if (
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return 'CONNECTION_ERROR';
  }

  if (message.includes('rate') || message.includes('429') || message.includes('throttle')) {
    return 'RATE_LIMITED';
  }

  return 'UNKNOWN';
}

/**
 * Check if an error is retryable based on common patterns.
 */
export function isRetryableError(error: Error): boolean {
  const reasonCode = classifyError(error);

  // These are typically retryable
  const retryableCodes: DLQReasonCode[] = [
    'SINK_TIMEOUT',
    'CONNECTION_ERROR',
    'RATE_LIMITED',
  ];

  // These are not retryable
  const nonRetryableCodes: DLQReasonCode[] = [
    'SCHEMA_DRIFT',
    'VALIDATION_FAIL',
    'OLDER_REVISION',
    'CONSTRAINT_VIOLATION',
    'SERIALIZATION_ERROR',
  ];

  if (retryableCodes.includes(reasonCode)) {
    return true;
  }

  if (nonRetryableCodes.includes(reasonCode)) {
    return false;
  }

  // Default: retry unknown errors
  return true;
}

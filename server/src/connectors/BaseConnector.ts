/**
 * Base Connector with Resilience Patterns
 *
 * Provides retry logic with exponential backoff and jitter to prevent
 * thundering herd issues when recovering from failures.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.2 (Incident Detection)
 *
 * @module connectors/BaseConnector
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { ConnectorContext } from '../data-model/types.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';

// ============================================================================
// Types
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;
  /** Jitter factor (0-1, e.g., 0.5 means +/- 50% of delay) */
  jitterFactor: number;
  /** Error types to retry on (empty means retry all) */
  retryableErrors: string[];
  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;
}

export interface RetryStats {
  attempts: number;
  totalDelayMs: number;
  errors: Array<{ attempt: number; error: string; delayMs: number }>;
  finalSuccess: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'connector-retry-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'BaseConnector',
  };
}

/**
 * Calculate retry delay with exponential backoff and jitter
 *
 * The jitter prevents the "thundering herd" problem where many clients
 * retry at the same time after a service recovers.
 *
 * Formula: delay = baseDelay * 2^attempt * (1 - jitter/2 + random * jitter)
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Calculate exponential backoff
  let delay = config.exponentialBackoff
    ? config.baseDelayMs * Math.pow(2, attempt)
    : config.baseDelayMs;

  // Apply jitter: adds randomness to spread out retries
  // jitterFactor of 0.5 means delay can vary by +/- 25%
  const jitterRange = delay * config.jitterFactor;
  const jitter = jitterRange * (Math.random() - 0.5);
  delay = delay + jitter;

  // Ensure we don't exceed max delay
  return Math.min(Math.max(delay, 0), config.maxDelayMs);
}

/**
 * Check if an error is retryable based on configuration
 */
function isRetryableError(error: unknown, config: RetryConfig): boolean {
  // If no specific errors configured, retry all
  if (config.retryableErrors.length === 0) {
    return true;
  }

  const errorName = error instanceof Error ? error.name : 'UnknownError';
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check if error matches any retryable patterns
  return config.retryableErrors.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(errorName) || regex.test(errorMessage);
  });
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.5, // +/- 25% of delay
  retryableErrors: [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'NetworkError',
    'TimeoutError',
    'ServiceUnavailable',
    '503',
    '502',
    '504',
    '429', // Too Many Requests - retry with backoff
  ],
  exponentialBackoff: true,
};

// ============================================================================
// Base Connector Implementation
// ============================================================================

export abstract class BaseConnector {
  protected logger: pino.Logger;
  protected retryConfig: RetryConfig;

  constructor(logger?: pino.Logger, retryConfig?: Partial<RetryConfig>) {
    this.logger = logger || (pino as any)({ name: this.constructor.name });
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Execute an operation with resilience (retry with exponential backoff + jitter)
   */
  protected async withResilience<T>(
    operation: () => Promise<T>,
    ctx: ConnectorContext,
    config?: Partial<RetryConfig>
  ): Promise<DataEnvelope<T>> {
    const effectiveConfig = { ...this.retryConfig, ...config };
    const stats: RetryStats = {
      attempts: 0,
      totalDelayMs: 0,
      errors: [],
      finalSuccess: false,
    };

    let lastError: unknown;

    for (let attempt = 0; attempt <= effectiveConfig.maxRetries; attempt++) {
      stats.attempts = attempt + 1;

      try {
        const result = await operation();
        stats.finalSuccess = true;

        // Log success after retries
        if (attempt > 0) {
          this.logger.info(
            {
              pipeline: ctx.pipelineKey,
              attempts: stats.attempts,
              totalDelayMs: stats.totalDelayMs,
            },
            'Operation succeeded after retries'
          );
        }

        return createDataEnvelope(result, {
          source: 'BaseConnector',
          governanceVerdict: createVerdict(
            GovernanceResult.ALLOW,
            `Operation completed after ${stats.attempts} attempt(s)`
          ),
          classification: DataClassification.INTERNAL,
        });
      } catch (error: any) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if we should retry
        if (attempt >= effectiveConfig.maxRetries) {
          this.logger.error(
            {
              error,
              pipeline: ctx.pipelineKey,
              attempts: stats.attempts,
              totalDelayMs: stats.totalDelayMs,
            },
            'Operation failed after all retries exhausted'
          );
          break;
        }

        if (!isRetryableError(error, effectiveConfig)) {
          this.logger.error(
            {
              error,
              pipeline: ctx.pipelineKey,
            },
            'Non-retryable error encountered'
          );
          break;
        }

        // Calculate delay with jitter
        const delayMs = calculateRetryDelay(attempt, effectiveConfig);
        stats.totalDelayMs += delayMs;
        stats.errors.push({
          attempt: attempt + 1,
          error: errorMessage,
          delayMs,
        });

        this.logger.warn(
          {
            error: errorMessage,
            attempt: attempt + 1,
            maxRetries: effectiveConfig.maxRetries,
            delayMs,
            pipeline: ctx.pipelineKey,
          },
          'Connector operation failed, retrying with backoff'
        );

        // Wait before retry
        await this.sleep(delayMs);
      }
    }

    // All retries failed
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);

    throw new ConnectorRetryExhaustedError(
      `Operation failed after ${stats.attempts} attempts: ${errorMessage}`,
      stats,
      createVerdict(
        GovernanceResult.DENY,
        `All ${stats.attempts} retry attempts failed`
      )
    );
  }

  /**
   * Execute an operation with a timeout
   */
  protected async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new ConnectorTimeoutError(operationName, timeoutMs));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  /**
   * Execute an operation with both timeout and retry
   */
  protected async withResilienceAndTimeout<T>(
    operation: () => Promise<T>,
    ctx: ConnectorContext,
    timeoutMs: number,
    retryConfig?: Partial<RetryConfig>
  ): Promise<DataEnvelope<T>> {
    return this.withResilience(
      () => this.withTimeout(operation, timeoutMs, 'ConnectorOperation'),
      ctx,
      retryConfig
    );
  }

  /**
   * Sleep helper with promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Update retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }
}

// ============================================================================
// Custom Errors
// ============================================================================

/**
 * Error thrown when all retry attempts are exhausted
 */
export class ConnectorRetryExhaustedError extends Error {
  public readonly stats: RetryStats;
  public readonly governanceVerdict: GovernanceVerdict;

  constructor(message: string, stats: RetryStats, verdict: GovernanceVerdict) {
    super(message);
    this.name = 'ConnectorRetryExhaustedError';
    this.stats = stats;
    this.governanceVerdict = verdict;
  }
}

/**
 * Error thrown when an operation times out
 */
export class ConnectorTimeoutError extends Error {
  public readonly operationName: string;
  public readonly timeoutMs: number;

  constructor(operationName: string, timeoutMs: number) {
    super(`Operation '${operationName}' timed out after ${timeoutMs}ms`);
    this.name = 'ConnectorTimeoutError';
    this.operationName = operationName;
    this.timeoutMs = timeoutMs;
  }
}

// ============================================================================
// Retry Presets
// ============================================================================

export const RETRY_PRESETS = {
  /** Fast retry for transient errors */
  fast: {
    maxRetries: 3,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    jitterFactor: 0.3,
  } as Partial<RetryConfig>,

  /** Default balanced retry */
  default: DEFAULT_RETRY_CONFIG,

  /** Aggressive retry for critical operations */
  aggressive: {
    maxRetries: 5,
    baseDelayMs: 500,
    maxDelayMs: 60000,
    jitterFactor: 0.5,
  } as Partial<RetryConfig>,

  /** Slow retry for rate-limited APIs */
  rateLimited: {
    maxRetries: 5,
    baseDelayMs: 5000,
    maxDelayMs: 120000,
    jitterFactor: 0.7,
    retryableErrors: ['429', 'TooManyRequests', 'RateLimitExceeded'],
  } as Partial<RetryConfig>,
};

export default BaseConnector;

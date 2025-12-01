/**
 * Retry Policy Middleware
 *
 * Implements intelligent retry strategies for failed requests
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('retry-policy');

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
  jitter?: boolean;
}

export class RetryPolicy {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = {
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
      jitter: true,
      ...config,
    };
  }

  shouldRetry(error: Error, statusCode?: number, attempt?: number): boolean {
    if (attempt !== undefined && attempt >= this.config.maxRetries) {
      return false;
    }

    // Check status code
    if (statusCode && this.config.retryableStatusCodes?.includes(statusCode)) {
      return true;
    }

    // Check error type
    const errorMessage = error.message || String(error);
    return this.config.retryableErrors?.some(err => errorMessage.includes(err)) || false;
  }

  calculateDelay(attempt: number): number {
    let delay: number;

    if (this.config.exponentialBackoff) {
      delay = Math.min(
        this.config.initialDelay * Math.pow(2, attempt),
        this.config.maxDelay
      );
    } else {
      delay = this.config.initialDelay;
    }

    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.config.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.shouldRetry(lastError, undefined, attempt)) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);

        logger.warn('Request failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          delay,
          error: lastError.message,
          context,
        });

        await this.sleep(delay);
        attempt++;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

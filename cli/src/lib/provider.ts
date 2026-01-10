/**
 * Provider Reliability Module
 *
 * Provides production-grade reliability for provider/model interactions:
 * - Retry with exponential backoff (respects Retry-After)
 * - Timeout handling
 * - Budget enforcement (time, requests, tokens)
 * - Deterministic diagnostics
 */

import { EXIT_CODES } from './constants.js';

// Exit code for provider errors after retries exhausted
export const PROVIDER_EXIT_CODE = 3;

/**
 * Error categories for provider errors
 */
export type ErrorCategory =
  | 'transient'        // Retryable: network errors, 429, 5xx, timeouts
  | 'permanent'        // Non-retryable: 4xx (except 429), invalid auth, malformed request
  | 'user_cancelled'   // User cancelled the operation
  | 'budget_exceeded'  // Budget limits reached
  | 'network_denied';  // Network access not allowed

/**
 * Provider error classification
 */
export interface ClassifiedError {
  category: ErrorCategory;
  message: string;
  statusCode?: number;
  retryAfterMs?: number;
  details: string[];
}

/**
 * Provider options
 */
export interface ProviderOptions {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  timeoutMs: number;
  budgetMs: number | null;      // null = unlimited
  maxRequests: number | null;   // null = unlimited
  tokenBudget: number | null;   // null = unlimited (not enforced if unavailable)
  ci: boolean;
  sessionId?: string;           // For deterministic jitter seed in CI
  allowNetwork: boolean;
}

/**
 * Provider request result
 */
export interface ProviderResult<T> {
  success: boolean;
  data?: T;
  error?: ClassifiedError;
  diagnostics: ProviderDiagnostics;
}

/**
 * Provider diagnostics for deterministic output
 */
export interface ProviderDiagnostics {
  provider_name: string;
  requests_made: number;
  retries_total: number;
  timeout_ms: number;
  budget_ms: number | null;
  remaining_ms: number | null;
  tokens_used: number | null;
  error_category: ErrorCategory | null;
  duration_ms: number;
  request_history: RequestHistoryEntry[];
}

/**
 * Request history entry for diagnostics
 */
export interface RequestHistoryEntry {
  attempt: number;
  timestamp: string;
  duration_ms: number;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  status_code?: number;
  error_category?: ErrorCategory;
  retry_after_ms?: number;
}

/**
 * Provider error for failures after retries exhausted
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public diagnostics: ProviderDiagnostics,
    public exitCode: number = PROVIDER_EXIT_CODE
  ) {
    super(message);
    this.name = 'ProviderError';
  }

  format(): string {
    const sortedDetails = Object.entries(this.diagnostics)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join('\n  ');
    return `Provider Error (${this.category}): ${this.message}\nDiagnostics:\n  ${sortedDetails}`;
  }
}

/**
 * Budget exceeded error
 */
export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public budgetType: 'time' | 'requests' | 'tokens',
    public limit: number,
    public used: number,
    public exitCode: number = EXIT_CODES.POLICY_ERROR
  ) {
    super(message);
    this.name = 'BudgetExceededError';
  }

  format(): string {
    return `Budget Exceeded (${this.budgetType}): ${this.message}\n  limit: ${this.limit}\n  used: ${this.used}`;
  }
}

/**
 * Classify an error into a category
 */
export function classifyError(
  error: unknown,
  statusCode?: number
): ClassifiedError {
  const details: string[] = [];
  let category: ErrorCategory = 'permanent';
  let message = 'Unknown error';
  let retryAfterMs: number | undefined;

  if (error instanceof Error) {
    message = error.message;
    details.push(`error_type: ${error.name}`);

    // Network errors are transient
    if (
      error.message.includes('ECONNRESET') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('socket hang up') ||
      error.message.includes('network')
    ) {
      category = 'transient';
      details.push('reason: network_error');
    }

    // Timeout errors are transient
    if (error.message.includes('timeout') || error.name === 'TimeoutError') {
      category = 'transient';
      details.push('reason: timeout');
    }

    // User cancellation
    if (error.message.includes('cancelled') || error.message.includes('aborted')) {
      category = 'user_cancelled';
      details.push('reason: user_cancelled');
    }
  }

  // HTTP status code classification
  if (statusCode !== undefined) {
    details.push(`status_code: ${statusCode}`);

    if (statusCode === 429) {
      category = 'transient';
      details.push('reason: rate_limited');
    } else if (statusCode >= 500) {
      category = 'transient';
      details.push('reason: server_error');
    } else if (statusCode >= 400 && statusCode < 500) {
      category = 'permanent';
      details.push('reason: client_error');
    }
  }

  return {
    category,
    message,
    statusCode,
    retryAfterMs,
    details: details.sort(),
  };
}

/**
 * Calculate backoff delay with optional deterministic jitter
 */
export function calculateBackoff(
  attempt: number,
  initialBackoffMs: number,
  maxBackoffMs: number,
  ci: boolean,
  seed?: number
): number {
  // Exponential backoff: initial * 2^attempt
  const exponentialDelay = initialBackoffMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxBackoffMs);

  // In CI mode, use deterministic jitter based on seed
  if (ci && seed !== undefined) {
    // Simple deterministic pseudo-random based on seed and attempt
    const deterministicFactor = ((seed * (attempt + 1) * 1103515245 + 12345) % 2147483648) / 2147483648;
    const jitter = cappedDelay * 0.5 * deterministicFactor;
    return Math.floor(cappedDelay + jitter);
  }

  // Non-CI: use random jitter
  const jitter = cappedDelay * 0.5 * Math.random();
  return Math.floor(cappedDelay + jitter);
}

/**
 * Parse Retry-After header value
 */
export function parseRetryAfter(retryAfter: string | number | undefined): number | undefined {
  if (retryAfter === undefined) return undefined;

  if (typeof retryAfter === 'number') {
    return retryAfter * 1000; // Convert seconds to milliseconds
  }

  // Try parsing as number (seconds)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return undefined;
}

/**
 * Default provider options
 */
export const DEFAULT_PROVIDER_OPTIONS: ProviderOptions = {
  maxRetries: 3,
  initialBackoffMs: 500,
  maxBackoffMs: 8000,
  timeoutMs: 120000,
  budgetMs: null,
  maxRequests: null,
  tokenBudget: null,
  ci: false,
  allowNetwork: true,
};

/**
 * Provider wrapper class for reliable provider interactions
 */
export class ProviderWrapper {
  private options: ProviderOptions;
  private startTime: number;
  private requestsMade: number = 0;
  private retriesTotal: number = 0;
  private tokensUsed: number = 0;
  private requestHistory: RequestHistoryEntry[] = [];
  private providerName: string;
  private seed: number;

  constructor(providerName: string, options: Partial<ProviderOptions> = {}) {
    this.providerName = providerName;
    this.options = { ...DEFAULT_PROVIDER_OPTIONS, ...options };
    this.startTime = Date.now();

    // Generate deterministic seed from session ID or use current time
    this.seed = options.sessionId
      ? this.hashString(options.sessionId)
      : Date.now();
  }

  /**
   * Simple string hash for deterministic seed
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get elapsed time since start
   */
  private getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get remaining budget in milliseconds
   */
  private getRemainingBudgetMs(): number | null {
    if (this.options.budgetMs === null) return null;
    return Math.max(0, this.options.budgetMs - this.getElapsedMs());
  }

  /**
   * Check if budget allows another request
   */
  private checkBudget(): void {
    // Check time budget
    if (this.options.budgetMs !== null) {
      const remaining = this.getRemainingBudgetMs();
      if (remaining !== null && remaining <= 0) {
        throw new BudgetExceededError(
          'Time budget exceeded',
          'time',
          this.options.budgetMs,
          this.getElapsedMs()
        );
      }
    }

    // Check request budget
    if (this.options.maxRequests !== null && this.requestsMade >= this.options.maxRequests) {
      throw new BudgetExceededError(
        'Request budget exceeded',
        'requests',
        this.options.maxRequests,
        this.requestsMade
      );
    }

    // Check token budget
    if (this.options.tokenBudget !== null && this.tokensUsed >= this.options.tokenBudget) {
      throw new BudgetExceededError(
        'Token budget exceeded',
        'tokens',
        this.options.tokenBudget,
        this.tokensUsed
      );
    }
  }

  /**
   * Check if network access is allowed
   */
  private checkNetworkAccess(): void {
    if (!this.options.allowNetwork) {
      throw new ProviderError(
        'Network access not allowed',
        'network_denied',
        this.getDiagnostics('network_denied'),
        EXIT_CODES.POLICY_ERROR
      );
    }
  }

  /**
   * Build diagnostics object
   */
  private getDiagnostics(errorCategory: ErrorCategory | null = null): ProviderDiagnostics {
    return {
      provider_name: this.providerName,
      requests_made: this.requestsMade,
      retries_total: this.retriesTotal,
      timeout_ms: this.options.timeoutMs,
      budget_ms: this.options.budgetMs,
      remaining_ms: this.getRemainingBudgetMs(),
      tokens_used: this.tokensUsed || null,
      error_category: errorCategory,
      duration_ms: this.getElapsedMs(),
      request_history: [...this.requestHistory].sort((a, b) => a.attempt - b.attempt),
    };
  }

  /**
   * Execute a provider request with retry and backoff
   */
  async execute<T>(
    requestFn: (signal: AbortSignal) => Promise<T>,
    options: {
      extractTokens?: (result: T) => number;
      extractRetryAfter?: (error: unknown) => string | number | undefined;
      extractStatusCode?: (error: unknown) => number | undefined;
    } = {}
  ): Promise<ProviderResult<T>> {
    // Check network access first
    try {
      this.checkNetworkAccess();
    } catch (error) {
      if (error instanceof ProviderError) {
        return {
          success: false,
          error: {
            category: error.category,
            message: error.message,
            details: [],
          },
          diagnostics: error.diagnostics,
        };
      }
      throw error;
    }

    let lastError: ClassifiedError | undefined;
    let attempt = 0;

    while (attempt <= this.options.maxRetries) {
      // Check budget before each attempt
      try {
        this.checkBudget();
      } catch (error) {
        if (error instanceof BudgetExceededError) {
          return {
            success: false,
            error: {
              category: 'budget_exceeded',
              message: error.message,
              details: [`budget_type: ${error.budgetType}`, `limit: ${error.limit}`, `used: ${error.used}`].sort(),
            },
            diagnostics: this.getDiagnostics('budget_exceeded'),
          };
        }
        throw error;
      }

      const requestStart = Date.now();
      const historyEntry: RequestHistoryEntry = {
        attempt,
        timestamp: new Date().toISOString(),
        duration_ms: 0,
        status: 'success',
      };

      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);

        this.requestsMade++;

        const result = await requestFn(controller.signal);
        clearTimeout(timeoutId);

        // Extract and track token usage if available
        if (options.extractTokens) {
          const tokens = options.extractTokens(result);
          this.tokensUsed += tokens;
        }

        historyEntry.duration_ms = Date.now() - requestStart;
        historyEntry.status = 'success';
        this.requestHistory.push(historyEntry);

        return {
          success: true,
          data: result,
          diagnostics: this.getDiagnostics(null),
        };
      } catch (error) {
        historyEntry.duration_ms = Date.now() - requestStart;

        // Extract status code if available
        const statusCode = options.extractStatusCode?.(error);
        historyEntry.status_code = statusCode;

        // Classify the error
        const classified = classifyError(error, statusCode);
        lastError = classified;
        historyEntry.error_category = classified.category;

        // Check for Retry-After header
        const retryAfterHeader = options.extractRetryAfter?.(error);
        const retryAfterMs = parseRetryAfter(retryAfterHeader);
        if (retryAfterMs !== undefined) {
          classified.retryAfterMs = retryAfterMs;
          historyEntry.retry_after_ms = retryAfterMs;
        }

        // Determine if we should retry
        if (classified.category === 'transient' && attempt < this.options.maxRetries) {
          historyEntry.status = classified.message.includes('timeout') ? 'timeout' : 'error';
          this.requestHistory.push(historyEntry);
          this.retriesTotal++;

          // Calculate backoff delay
          let delay = calculateBackoff(
            attempt,
            this.options.initialBackoffMs,
            this.options.maxBackoffMs,
            this.options.ci,
            this.seed
          );

          // Respect Retry-After if larger than computed backoff
          if (retryAfterMs !== undefined && retryAfterMs > delay) {
            delay = retryAfterMs;
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt++;
          continue;
        }

        // Non-retryable error or max retries exceeded
        if (classified.category === 'user_cancelled') {
          historyEntry.status = 'cancelled';
        } else {
          historyEntry.status = 'error';
        }
        this.requestHistory.push(historyEntry);

        return {
          success: false,
          error: classified,
          diagnostics: this.getDiagnostics(classified.category),
        };
      }
    }

    // Should not reach here, but handle just in case
    return {
      success: false,
      error: lastError || {
        category: 'permanent',
        message: 'Max retries exceeded',
        details: ['reason: max_retries_exceeded'],
      },
      diagnostics: this.getDiagnostics(lastError?.category || 'permanent'),
    };
  }

  /**
   * Get current diagnostics (for status reporting)
   */
  getDiagnosticsSnapshot(): ProviderDiagnostics {
    return this.getDiagnostics(null);
  }

  /**
   * Update token usage manually
   */
  addTokenUsage(tokens: number): void {
    this.tokensUsed += tokens;
  }

  /**
   * Check if within budget (for pre-flight checks)
   */
  isWithinBudget(): boolean {
    try {
      this.checkBudget();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create provider wrapper with options merged with defaults
 */
export function createProviderWrapper(
  providerName: string,
  options: Partial<ProviderOptions> = {}
): ProviderWrapper {
  return new ProviderWrapper(providerName, options);
}

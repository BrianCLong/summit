/**
 * Circuit Breaker Implementation
 *
 * Protects downstream services from cascade failures by tracking
 * failures and temporarily blocking requests when a threshold is exceeded.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Failures exceeded threshold, requests are blocked
 * - HALF_OPEN: Testing if service recovered
 */

import { EventEmitter } from "events";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;

  /** Time in ms before trying half-open state */
  recoveryTimeMs: number;

  /** Number of successes in half-open before closing */
  successThreshold: number;

  /** Window size for failure counting in ms */
  windowSizeMs: number;

  /** Timeout for individual calls in ms */
  callTimeoutMs?: number;

  /** Name for logging/metrics */
  name?: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  totalTimeouts: number;
  totalRejected: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = "closed";
  private failures: number[] = [];
  private consecutiveSuccesses = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalCalls = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private totalTimeouts = 0;
  private totalRejected = 0;
  private halfOpenCalls = 0;

  constructor(private config: CircuitBreakerConfig) {
    super();
  }

  /**
   * Execute a function with circuit breaker protection.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit allows the call
    if (!this.canExecute()) {
      this.totalRejected++;
      throw new CircuitBreakerError("Circuit breaker is open", this.state);
    }

    this.totalCalls++;

    // Track half-open calls
    if (this.state === "half-open") {
      this.halfOpenCalls++;
    }

    try {
      // Execute with optional timeout
      const result = this.config.callTimeoutMs
        ? await this.executeWithTimeout(fn, this.config.callTimeoutMs)
        : await fn();

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Check if circuit allows execution.
   */
  canExecute(): boolean {
    switch (this.state) {
      case "closed":
        return true;

      case "open":
        // Check if recovery time has passed
        if (
          this.lastFailureTime &&
          Date.now() - this.lastFailureTime >= this.config.recoveryTimeMs
        ) {
          this.transitionTo("half-open");
          return true;
        }
        return false;

      case "half-open":
        // Allow limited calls in half-open state
        return this.halfOpenCalls < this.config.successThreshold;

      default:
        return false;
    }
  }

  /**
   * Manually trip the circuit (force open).
   */
  trip(): void {
    this.transitionTo("open");
    this.lastFailureTime = Date.now();
  }

  /**
   * Manually reset the circuit (force closed).
   */
  reset(): void {
    this.transitionTo("closed");
    this.failures = [];
    this.consecutiveSuccesses = 0;
    this.halfOpenCalls = 0;
  }

  /**
   * Get current circuit state.
   */
  getState(): CircuitState {
    // Check for automatic transition from open to half-open
    if (this.state === "open" && this.lastFailureTime) {
      if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeMs) {
        this.transitionTo("half-open");
      }
    }
    return this.state;
  }

  /**
   * Get circuit statistics.
   */
  getStats(): CircuitBreakerStats {
    // Clean up old failures
    this.cleanupFailures();

    return {
      state: this.getState(),
      failures: this.failures.length,
      successes: this.consecutiveSuccesses,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      totalTimeouts: this.totalTimeouts,
      totalRejected: this.totalRejected,
    };
  }

  /**
   * Check if an error should be counted as a failure.
   * Can be overridden to customize failure detection.
   */
  isFailure(error: Error): boolean {
    // By default, all errors are failures
    // Override to exclude certain errors (e.g., validation errors)
    return true;
  }

  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    this.consecutiveSuccesses++;

    switch (this.state) {
      case "half-open":
        // Check if we've had enough successes to close
        if (this.consecutiveSuccesses >= this.config.successThreshold) {
          this.transitionTo("closed");
          this.halfOpenCalls = 0;
        }
        break;

      case "closed":
        // Success in closed state - nothing special
        break;
    }
  }

  private onFailure(error: Error): void {
    if (!this.isFailure(error)) {
      return;
    }

    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.consecutiveSuccesses = 0;

    if (error instanceof TimeoutError) {
      this.totalTimeouts++;
    }

    switch (this.state) {
      case "half-open":
        // Any failure in half-open immediately opens
        this.transitionTo("open");
        this.halfOpenCalls = 0;
        break;

      case "closed":
        // Record failure and check threshold
        this.failures.push(Date.now());
        this.cleanupFailures();

        if (this.failures.length >= this.config.failureThreshold) {
          this.transitionTo("open");
        }
        break;
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.emit("stateChange", newState, oldState);

      if (newState === "half-open") {
        this.halfOpenCalls = 0;
      }
    }
  }

  private cleanupFailures(): void {
    const windowStart = Date.now() - this.config.windowSizeMs;
    this.failures = this.failures.filter((ts) => ts > windowStart);
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(`Circuit breaker call timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}

/**
 * Error thrown when circuit breaker is open.
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState
  ) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

/**
 * Error thrown when a call times out.
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Factory for creating circuit breakers with shared configuration.
 */
export class CircuitBreakerFactory {
  private breakers: Map<string, CircuitBreaker> = new Map();

  constructor(private defaultConfig: CircuitBreakerConfig) {}

  /**
   * Get or create a circuit breaker by name.
   */
  get(name: string, configOverrides?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let breaker = this.breakers.get(name);

    if (!breaker) {
      breaker = new CircuitBreaker({
        ...this.defaultConfig,
        ...configOverrides,
        name,
      });
      this.breakers.set(name, breaker);
    }

    return breaker;
  }

  /**
   * Get all circuit breakers.
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get stats for all circuit breakers.
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }

    return stats;
  }

  /**
   * Reset all circuit breakers.
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

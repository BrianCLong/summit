// @ts-ignore
import { default as pino } from 'pino';

// @ts-ignore
const logger = (pino as any)();

/**
 * Enum representing the possible states of a Circuit Breaker.
 */
enum CircuitBreakerState {
  /**
   * Normal operation; requests are passed through.
   */
  CLOSED = 'CLOSED',
  /**
   * The circuit is open; requests are rejected immediately.
   */
  OPEN = 'OPEN',
  /**
   * The circuit is testing if the service has recovered; limited requests allowed.
   */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Options for configuring the Circuit Breaker.
 */
interface CircuitBreakerOptions {
  /**
   * Number of consecutive failures before opening the circuit.
   */
  failureThreshold: number;
  /**
   * Number of consecutive successes before closing the circuit from half-open.
   */
  successThreshold: number;
  /**
   * Time in milliseconds to wait before transitioning from OPEN to HALF_OPEN.
   */
  resetTimeout: number;
  /**
   * P95 latency threshold in milliseconds. If exceeded, the circuit may open.
   */
  p95ThresholdMs: number;
  /**
   * Error rate percentage (e.g., 0.5 for 50%) that triggers opening the circuit.
   */
  errorRateThreshold: number;
}

/**
 * Circuit Breaker implementation to prevent cascading failures.
 *
 * It monitors the execution of a command and manages the state (CLOSED, OPEN, HALF_OPEN)
 * based on failures, latency, and error rates.
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private options: CircuitBreakerOptions;
  private metrics: {
    requestHistory: Array<{ success: boolean; latency: number; timestamp: number }>;
    stateChanges: number;
    totalRequests: number; // Historical total (optional)
    failedRequests: number; // Historical total (optional)
  };

  /**
   * Creates an instance of CircuitBreaker.
   *
   * @param options - Configuration options for the circuit breaker.
   */
  constructor(options: Partial<CircuitBreakerOptions>) {
    this.options = {
      failureThreshold: 5,
      successThreshold: 3,
      resetTimeout: 30000, // 30 seconds
      p95ThresholdMs: 2000, // 2 seconds
      errorRateThreshold: 0.5, // 50%
      ...options,
    };

    this.metrics = {
      requestHistory: [],
      totalRequests: 0,
      failedRequests: 0,
      stateChanges: 0,
    };

    logger.info(
      `Circuit Breaker initialized with options: ${JSON.stringify(this.options)}`,
    );
  }

  /**
   * Gets the current state of the circuit breaker.
   *
   * @returns The current CircuitBreakerState.
   */
  public getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Retrieves current metrics for the circuit breaker.
   *
   * @returns An object containing metrics such as total requests, failed requests, P95 latency, error rate, and current state.
   */
  public getMetrics() {
    const recent = this.getRecentRequests();
    const totalRequests = recent.length;
    const failedRequests = recent.filter(r => !r.success).length;

    return {
      totalRequests,
      failedRequests,
      p95Latency: this.calculateP95Latency(recent),
      errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      state: this.state,
      stateChanges: this.metrics.stateChanges
    };
  }

  private getRecentRequests() {
    // Return last 100 requests for rolling window
    return this.metrics.requestHistory.slice(-100);
  }

  private calculateP95Latency(recent: Array<{ latency: number }>): number {
    if (recent.length === 0) {
      return 0;
    }
    const sortedLatencies = recent.map(r => r.latency).sort((a, b) => a - b);
    const p95Index = Math.ceil(sortedLatencies.length * 0.95) - 1;
    return sortedLatencies[p95Index];
  }

  private recordRequest(success: boolean, latency: number) {
    this.metrics.requestHistory.push({
      success,
      latency,
      timestamp: Date.now()
    });

    // Keep only last 1000 items in history to prevent memory bloat
    if (this.metrics.requestHistory.length > 1000) {
      this.metrics.requestHistory.shift();
    }

    if (success) {
      this.metrics.totalRequests++;
    } else {
      this.metrics.totalRequests++;
      this.metrics.failedRequests++;
    }
  }

  private evaluateState() {
    const metrics = this.getMetrics();
    const { p95Latency, errorRate } = metrics;

    if (this.state === CircuitBreakerState.CLOSED) {
      // Check for opening conditions
      const hasHighFailureCount = this.failureCount >= this.options.failureThreshold;
      const hasHighLatency = p95Latency > this.options.p95ThresholdMs;
      // Only check error rate after a minimum number of requests (e.g. 5) to avoid noise
      const hasHighErrorRate = metrics.totalRequests >= 5 && errorRate > this.options.errorRateThreshold;

      if (hasHighFailureCount || hasHighLatency || hasHighErrorRate) {
        this.open();
      }
    } else if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.halfOpen();
      }
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      // State transition handled by success/failure in execute
    }
  }

  private open() {
    this.state = CircuitBreakerState.OPEN;
    this.lastFailureTime = Date.now();
    this.metrics.stateChanges++;
    logger.warn('Circuit Breaker: OPENED');
  }

  private halfOpen() {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0; // Reset success count for half-open
    this.metrics.stateChanges++;
    logger.info('Circuit Breaker: HALF_OPEN');
  }

  private close() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.metrics.stateChanges++;
    logger.info('Circuit Breaker: CLOSED');
  }

  /**
  * Executes a command within the context of the circuit breaker.
  *
  * @typeParam T - The return type of the command.
  * @param command - The function to execute.
  * @param fallback - Optional fallback function if the circuit is OPEN or the command fails.
  * @returns The result of the command or the fallback.
  * @throws Error if the circuit is OPEN and no fallback is provided, or if the command itself fails.
  */
  public async execute<T>(command: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.evaluateState(); // Evaluate state before execution

    if (this.state === CircuitBreakerState.OPEN) {
      if (fallback) {
        logger.debug('Circuit Breaker: Request rejected (OPEN), executing fallback');
        return fallback();
      }
      logger.debug('Circuit Breaker: Request rejected (OPEN)');
      throw new Error('CircuitBreaker: Service is currently unavailable');
    }

    const startTime = Date.now();
    try {
      const result = await command();
      const latency = Date.now() - startTime;
      this.recordRequest(true, latency);

      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.options.successThreshold) {
          this.close();
        }
      } else if (this.state === CircuitBreakerState.CLOSED) {
        this.failureCount = 0; // Reset consecutive failures on success
      }
      return result;
    } catch (error: any) {
      const latency = Date.now() - startTime;
      this.recordRequest(false, latency);
      this.lastFailureTime = Date.now(); // Update last failure time

      if (this.state === CircuitBreakerState.HALF_OPEN) {
        // If a failure occurs in HALF_OPEN, immediately open the circuit again
        this.open();
      } else if (this.state === CircuitBreakerState.CLOSED) {
        this.failureCount++;
        this.evaluateState(); // Re-evaluate state on failure
      }

      logger.error(
        `Circuit Breaker: Command failed. State: ${this.state}, Failure Count: ${this.failureCount}. Error: ${error.message}`,
      );

      if (fallback) {
        logger.info('Circuit Breaker: Executing fallback after command failure');
        return fallback();
      }

      throw error;
    }
  }
}

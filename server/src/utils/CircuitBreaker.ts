import pino from 'pino';

const logger = pino();

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  failureThreshold: number; // Number of consecutive failures before opening
  successThreshold: number; // Number of consecutive successes before closing from half-open
  resetTimeout: number; // Time in milliseconds to wait before transitioning from OPEN to HALF_OPEN
  p95ThresholdMs: number; // P95 latency threshold in milliseconds
  errorRateThreshold: number; // Error rate percentage (e.g., 0.5 for 50%)
}

/**
 * Implements the Circuit Breaker pattern to handle faults in distributed systems.
 * Monitors execution metrics like failure rate and latency to prevent cascading failures.
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private options: CircuitBreakerOptions;
  private metrics: {
    totalRequests: number;
    failedRequests: number;
    latencies: number[]; // Store recent latencies for P95 calculation
    stateChanges: number;
  };

  /**
   * Creates a new CircuitBreaker instance.
   * @param {Partial<CircuitBreakerOptions>} options - Configuration options for the circuit breaker.
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
      totalRequests: 0,
      failedRequests: 0,
      latencies: [],
      stateChanges: 0,
    };

    logger.info(
      `Circuit Breaker initialized with options: ${JSON.stringify(this.options)}`,
    );
  }

  /**
   * Returns the current state of the circuit breaker.
   * @returns {CircuitBreakerState} The current state (CLOSED, OPEN, HALF_OPEN).
   */
  public getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Retrieves performance metrics for the circuit breaker.
   * @returns {object} An object containing metrics like error rate, p95 latency, and current state.
   */
  public getMetrics() {
    return {
      ...this.metrics,
      p95Latency: this.calculateP95Latency(),
      errorRate:
        this.metrics.totalRequests > 0
          ? this.metrics.failedRequests / this.metrics.totalRequests
          : 0,
      state: this.state,
    };
  }

  /**
   * Gets the current consecutive failure count.
   * @returns {number} The number of consecutive failures.
   */
  public getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Gets the timestamp of the last failure.
   * @returns {number} The timestamp in milliseconds.
   */
  public getLastFailureTime(): number {
    return this.lastFailureTime;
  }

  private calculateP95Latency(): number {
    if (this.metrics.latencies.length === 0) {
      return 0;
    }
    const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
    const p95Index = Math.ceil(sortedLatencies.length * 0.95) - 1;
    return sortedLatencies[p95Index];
  }

  private recordLatency(latency: number) {
    this.metrics.latencies.push(latency);
    // Keep only a recent window of latencies (e.g., last 100)
    if (this.metrics.latencies.length > 100) {
      this.metrics.latencies.shift();
    }
  }

  private evaluateState() {
    const { p95Latency, errorRate } = this.getMetrics();

    if (this.state === CircuitBreakerState.CLOSED) {
      if (
        this.failureCount >= this.options.failureThreshold ||
        p95Latency > this.options.p95ThresholdMs ||
        errorRate > this.options.errorRateThreshold
      ) {
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
   * Executes a command wrapped by the circuit breaker.
   * Checks the circuit state before execution.
   *
   * @template T
   * @param {() => Promise<T>} command - The async function to execute.
   * @returns {Promise<T>} The result of the command.
   * @throws {Error} If the circuit is OPEN or if the command fails.
   */
  public async execute<T>(command: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++;
    this.evaluateState(); // Evaluate state before execution

    if (this.state === CircuitBreakerState.OPEN) {
      logger.debug('Circuit Breaker: Request rejected (OPEN)');
      throw new Error('CircuitBreaker: Service is currently unavailable');
    }

    try {
      const startTime = Date.now();
      const result = await command();
      const latency = Date.now() - startTime;
      this.recordLatency(latency);

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
      this.metrics.failedRequests++;
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
      throw error;
    }
  }
}

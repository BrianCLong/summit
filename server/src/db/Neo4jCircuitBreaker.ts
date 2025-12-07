/**
 * Neo4j Circuit Breaker Wrapper
 *
 * Adds circuit breaker pattern to Neo4j connection manager for
 * production-grade resilience and fault tolerance.
 *
 * Gap Analysis Reference: Gap 7.3 - Add circuit breakers to Neo4j
 */

import { EventEmitter } from 'events';
import pino from 'pino';
import { Neo4jConnectionManager, getNeo4jConnectionManager, QueryStats } from './Neo4jConnectionManager.js';

const logger = pino({ name: 'neo4j-circuit-breaker' });

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  volumeThreshold: number;
  slowRequestThreshold: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  circuitOpenCount: number;
  lastCircuitOpenTime: number | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: parseInt(process.env.NEO4J_CB_FAILURE_THRESHOLD || '5', 10),
  recoveryTimeout: parseInt(process.env.NEO4J_CB_RECOVERY_TIMEOUT || '30000', 10),
  monitoringWindow: parseInt(process.env.NEO4J_CB_MONITORING_WINDOW || '60000', 10),
  volumeThreshold: parseInt(process.env.NEO4J_CB_VOLUME_THRESHOLD || '10', 10),
  slowRequestThreshold: parseInt(process.env.NEO4J_CB_SLOW_THRESHOLD || '5000', 10),
};

export class Neo4jCircuitBreaker extends EventEmitter {
  private connectionManager: Neo4jConnectionManager;
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: Array<{ timestamp: number; error: string }> = [];
  private requests: Array<{ timestamp: number; success: boolean; duration: number }> = [];
  private consecutiveFailures = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime = 0;
  private circuitOpenCount = 0;
  private lastCircuitOpenTime: number | null = null;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.connectionManager = getNeo4jConnectionManager();

    // Periodic cleanup of old failure records
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);

    logger.info({
      config: this.config,
    }, 'Neo4j circuit breaker initialized');
  }

  /**
   * Execute a read query with circuit breaker protection
   */
  async executeRead<T = any>(
    query: string,
    params: any = {},
    options: { timeout?: number; database?: string } = {},
  ): Promise<T[]> {
    return this.execute(() =>
      this.connectionManager.executeRead<T>(query, params, options)
    );
  }

  /**
   * Execute a write query with circuit breaker protection
   */
  async executeWrite<T = any>(
    query: string,
    params: any = {},
    options: { timeout?: number; database?: string } = {},
  ): Promise<T[]> {
    return this.execute(() =>
      this.connectionManager.executeWrite<T>(query, params, options)
    );
  }

  /**
   * Execute a transaction with circuit breaker protection
   */
  async executeTransaction<T = any>(
    transactionWork: (tx: any) => Promise<T>,
    accessMode: 'READ' | 'WRITE' = 'WRITE',
    options: { timeout?: number; database?: string } = {},
  ): Promise<T> {
    return this.execute(() =>
      this.connectionManager.executeTransaction<T>(transactionWork, accessMode, options)
    );
  }

  /**
   * Core circuit breaker execution wrapper
   */
  private async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error('Neo4j circuit breaker is OPEN');
        (error as any).code = 'CIRCUIT_OPEN';
        (error as any).retryAfter = this.nextAttemptTime - Date.now();
        this.emit('rejected', { state: this.state, error });
        throw error;
      }

      // Transition to half-open for test request
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    try {
      const result = await fn();
      this.onSuccess(startTime);
      return result;
    } catch (error) {
      this.onFailure(error as Error, startTime);
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(startTime: number): void {
    const duration = Date.now() - startTime;

    this.requests.push({
      timestamp: Date.now(),
      success: true,
      duration,
    });

    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();

    // Track slow requests
    if (duration > this.config.slowRequestThreshold) {
      this.emit('slowRequest', { duration, threshold: this.config.slowRequestThreshold });
      logger.warn({ duration }, 'Slow Neo4j request detected');
    }

    // Reset circuit if in half-open state
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.CLOSED);
      logger.info('Neo4j circuit breaker reset to CLOSED after successful request');
    }

    this.emit('success', { duration });
  }

  /**
   * Handle failed request
   */
  private onFailure(error: Error, startTime: number): void {
    const duration = Date.now() - startTime;

    this.requests.push({
      timestamp: Date.now(),
      success: false,
      duration,
    });

    // Skip expected/transient errors that shouldn't trip the circuit
    if (this.isTransientError(error)) {
      this.emit('transientError', { error: error.message });
      return;
    }

    this.failures.push({
      timestamp: Date.now(),
      error: error.message,
    });

    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    this.emit('failure', { error: error.message, consecutiveFailures: this.consecutiveFailures });

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Determine if the circuit should open based on failure threshold
   */
  private shouldOpenCircuit(): boolean {
    // Need minimum volume before tripping
    const recentRequests = this.getRecentRequests();
    if (recentRequests.length < this.config.volumeThreshold) {
      return false;
    }

    // Check consecutive failures
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    // Check failure rate in monitoring window
    const recentFailures = this.getRecentFailures();
    const failureRate = recentFailures.length / recentRequests.length;
    if (failureRate >= 0.5 && recentFailures.length >= this.config.failureThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Check if error is transient and should not trip circuit
   */
  private isTransientError(error: Error): boolean {
    const transientPatterns = [
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'socket hang up',
      'network',
    ];

    const message = error.message.toLowerCase();
    return transientPatterns.some(pattern =>
      message.includes(pattern.toLowerCase())
    );
  }

  /**
   * Transition circuit to new state
   */
  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;

    logger.info({
      previousState,
      newState,
      consecutiveFailures: this.consecutiveFailures,
    }, 'Neo4j circuit breaker state transition');

    if (newState === CircuitState.OPEN) {
      this.circuitOpenCount++;
      this.lastCircuitOpenTime = Date.now();
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;

      this.emit('open', {
        failures: this.consecutiveFailures,
        nextAttempt: this.nextAttemptTime,
      });
    } else if (newState === CircuitState.HALF_OPEN) {
      this.emit('halfOpen', {});
    } else if (newState === CircuitState.CLOSED) {
      this.consecutiveFailures = 0;
      this.failures = [];
      this.emit('closed', {});
    }
  }

  /**
   * Get failures within monitoring window
   */
  private getRecentFailures(): Array<{ timestamp: number; error: string }> {
    const cutoff = Date.now() - this.config.monitoringWindow;
    return this.failures.filter(f => f.timestamp > cutoff);
  }

  /**
   * Get requests within monitoring window
   */
  private getRecentRequests(): Array<{ timestamp: number; success: boolean; duration: number }> {
    const cutoff = Date.now() - this.config.monitoringWindow;
    return this.requests.filter(r => r.timestamp > cutoff);
  }

  /**
   * Cleanup old records
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.config.monitoringWindow * 2;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
    this.requests = this.requests.filter(r => r.timestamp > cutoff);
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const recentRequests = this.getRecentRequests();
    return {
      state: this.state,
      totalRequests: recentRequests.length,
      successfulRequests: recentRequests.filter(r => r.success).length,
      failedRequests: recentRequests.filter(r => !r.success).length,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      circuitOpenCount: this.circuitOpenCount,
      lastCircuitOpenTime: this.lastCircuitOpenTime,
    };
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{
    circuitBreaker: CircuitBreakerMetrics;
    connectionPool: any;
  }> {
    return {
      circuitBreaker: this.getMetrics(),
      connectionPool: await this.connectionManager.getHealth(),
    };
  }

  /**
   * Force circuit to open (for testing/manual intervention)
   */
  forceOpen(): void {
    logger.warn('Neo4j circuit breaker manually forced OPEN');
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Force circuit to close (for testing/manual intervention)
   */
  forceClose(): void {
    logger.warn('Neo4j circuit breaker manually forced CLOSED');
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.removeAllListeners();
  }
}

// Singleton instance
let circuitBreaker: Neo4jCircuitBreaker | null = null;

export function getNeo4jCircuitBreaker(config?: Partial<CircuitBreakerConfig>): Neo4jCircuitBreaker {
  if (!circuitBreaker) {
    circuitBreaker = new Neo4jCircuitBreaker(config);
  }
  return circuitBreaker;
}

export function resetNeo4jCircuitBreaker(): void {
  if (circuitBreaker) {
    circuitBreaker.destroy();
    circuitBreaker = null;
  }
}

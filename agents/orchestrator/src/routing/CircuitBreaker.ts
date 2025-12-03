/**
 * Circuit Breaker Implementation
 *
 * Implements the circuit breaker pattern for resilient LLM provider
 * failover with configurable thresholds and recovery strategies.
 */

import { EventEmitter } from 'eventemitter3';
import {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerState,
} from '../types/index.js';

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private nextAttempt?: Date;
  private config: CircuitBreakerConfig;
  private providerId: string;

  constructor(providerId: string, config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.providerId = providerId;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 3,
      timeout: config.timeout ?? 30000, // 30 seconds
      monitoringWindow: config.monitoringWindow ?? 60000, // 1 minute
    };
  }

  /**
   * Check if the circuit allows the request
   */
  canExecute(): boolean {
    this.checkWindowExpiry();

    switch (this.state) {
      case 'closed':
        return true;
      case 'open':
        if (this.nextAttempt && new Date() >= this.nextAttempt) {
          this.transitionTo('half-open');
          return true;
        }
        return false;
      case 'half-open':
        return true;
      default:
        return false;
    }
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    this.lastSuccess = new Date();
    this.successes++;

    switch (this.state) {
      case 'half-open':
        if (this.successes >= this.config.successThreshold) {
          this.transitionTo('closed');
        }
        break;
      case 'closed':
        // Reset failure count on success
        this.failures = 0;
        break;
    }

    this.emit('success', {
      providerId: this.providerId,
      state: this.state,
      successes: this.successes,
    });
  }

  /**
   * Record a failed execution
   */
  recordFailure(error?: Error): void {
    this.lastFailure = new Date();
    this.failures++;

    switch (this.state) {
      case 'closed':
        if (this.failures >= this.config.failureThreshold) {
          this.transitionTo('open');
        }
        break;
      case 'half-open':
        // Any failure in half-open state reopens the circuit
        this.transitionTo('open');
        break;
    }

    this.emit('failure', {
      providerId: this.providerId,
      state: this.state,
      failures: this.failures,
      error: error?.message,
    });
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      nextAttempt: this.nextAttempt,
    };
  }

  /**
   * Force circuit to a specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    this.transitionTo(state);
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = undefined;
    this.lastSuccess = undefined;
    this.nextAttempt = undefined;
    this.emit('reset', { providerId: this.providerId });
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    switch (newState) {
      case 'open':
        this.nextAttempt = new Date(Date.now() + this.config.timeout);
        this.successes = 0;
        this.emit('circuit:opened', {
          providerId: this.providerId,
          failures: this.failures,
          nextAttempt: this.nextAttempt,
        });
        break;
      case 'half-open':
        this.successes = 0;
        this.emit('circuit:half-open', {
          providerId: this.providerId,
        });
        break;
      case 'closed':
        this.failures = 0;
        this.successes = 0;
        this.nextAttempt = undefined;
        this.emit('circuit:closed', {
          providerId: this.providerId,
        });
        break;
    }

    this.emit('state-change', {
      providerId: this.providerId,
      oldState,
      newState,
    });
  }

  /**
   * Check if monitoring window has expired and reset if needed
   */
  private checkWindowExpiry(): void {
    if (this.state === 'closed' && this.lastFailure) {
      const windowExpiry = new Date(this.lastFailure.getTime() + this.config.monitoringWindow);
      if (new Date() > windowExpiry) {
        this.failures = 0;
      }
    }
  }
}

/**
 * Circuit Breaker Registry - manages circuit breakers for all providers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = {
      failureThreshold: defaultConfig.failureThreshold ?? 5,
      successThreshold: defaultConfig.successThreshold ?? 3,
      timeout: defaultConfig.timeout ?? 30000,
      monitoringWindow: defaultConfig.monitoringWindow ?? 60000,
    };
  }

  /**
   * Get or create a circuit breaker for a provider
   */
  getOrCreate(providerId: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(providerId)) {
      const breaker = new CircuitBreaker(providerId, {
        ...this.defaultConfig,
        ...config,
      });
      this.breakers.set(providerId, breaker);
    }
    return this.breakers.get(providerId)!;
  }

  /**
   * Get a circuit breaker
   */
  get(providerId: string): CircuitBreaker | undefined {
    return this.breakers.get(providerId);
  }

  /**
   * Get all available providers (closed or half-open circuits)
   */
  getAvailable(): string[] {
    return Array.from(this.breakers.entries())
      .filter(([_, breaker]) => breaker.canExecute())
      .map(([id, _]) => id);
  }

  /**
   * Get all circuit states
   */
  getAllStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    for (const [id, breaker] of this.breakers) {
      states[id] = breaker.getState();
    }
    return states;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

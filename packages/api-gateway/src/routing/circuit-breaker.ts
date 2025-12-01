/**
 * Circuit Breaker Pattern
 *
 * Prevents cascading failures by failing fast when a service is unavailable
 * States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */

import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('circuit-breaker');

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  threshold: number; // Number of failures before opening
  timeout: number; // Time to wait before attempting half-open
  resetTimeout: number; // Time to wait in half-open state
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailureTime?: number;
  state: CircuitState;
}

export class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private circuits = new Map<string, CircuitStats>();

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
  }

  canRequest(serviceUrl: string): boolean {
    const circuit = this.getCircuit(serviceUrl);

    switch (circuit.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (this.shouldAttemptReset(circuit)) {
          this.transitionToHalfOpen(serviceUrl, circuit);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return true;
    }
  }

  recordSuccess(serviceUrl: string): void {
    const circuit = this.getCircuit(serviceUrl);

    circuit.successes++;
    circuit.failures = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      this.transitionToClosed(serviceUrl, circuit);
    }

    logger.debug('Circuit breaker success recorded', {
      serviceUrl,
      state: circuit.state,
      successes: circuit.successes,
    });
  }

  recordFailure(serviceUrl: string): void {
    const circuit = this.getCircuit(serviceUrl);

    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen(serviceUrl, circuit);
    } else if (circuit.failures >= this.config.threshold) {
      this.transitionToOpen(serviceUrl, circuit);
    }

    logger.warn('Circuit breaker failure recorded', {
      serviceUrl,
      state: circuit.state,
      failures: circuit.failures,
      threshold: this.config.threshold,
    });
  }

  private getCircuit(serviceUrl: string): CircuitStats {
    if (!this.circuits.has(serviceUrl)) {
      this.circuits.set(serviceUrl, {
        failures: 0,
        successes: 0,
        state: CircuitState.CLOSED,
      });
    }
    return this.circuits.get(serviceUrl)!;
  }

  private shouldAttemptReset(circuit: CircuitStats): boolean {
    if (!circuit.lastFailureTime) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
    return timeSinceLastFailure >= this.config.timeout;
  }

  private transitionToOpen(serviceUrl: string, circuit: CircuitStats): void {
    circuit.state = CircuitState.OPEN;
    logger.error('Circuit breaker opened', { serviceUrl });
    this.emit('circuit:open', { serviceUrl, circuit });
  }

  private transitionToHalfOpen(serviceUrl: string, circuit: CircuitStats): void {
    circuit.state = CircuitState.HALF_OPEN;
    logger.info('Circuit breaker half-open', { serviceUrl });
    this.emit('circuit:half-open', { serviceUrl, circuit });
  }

  private transitionToClosed(serviceUrl: string, circuit: CircuitStats): void {
    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    logger.info('Circuit breaker closed', { serviceUrl });
    this.emit('circuit:closed', { serviceUrl, circuit });
  }

  getStatus(serviceUrl?: string) {
    if (serviceUrl) {
      return this.circuits.get(serviceUrl) || null;
    }

    return Object.fromEntries(
      Array.from(this.circuits.entries()).map(([url, stats]) => [
        url,
        {
          state: stats.state,
          failures: stats.failures,
          successes: stats.successes,
        },
      ])
    );
  }

  reset(serviceUrl?: string): void {
    if (serviceUrl) {
      this.circuits.delete(serviceUrl);
    } else {
      this.circuits.clear();
    }
  }
}

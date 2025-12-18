import { dbConnectionErrors, circuitBreakerState } from '../metrics/dbMetrics.js';
import logger from '../utils/logger.js';

export type CircuitState = 'closed' | 'half-open' | 'open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  name: string;
}

export class CircuitBreaker {
  private failureCount = 0;
  private state: CircuitState = 'closed';
  private openUntil = 0;
  private lastError?: Error;

  constructor(private readonly options: CircuitBreakerOptions) {}

  canExecute(): boolean {
    if (this.state === 'open') {
      if (Date.now() >= this.openUntil) {
        this.state = 'half-open';
        this.updateMetric();
        logger.warn(
          { component: this.options.name },
          'Circuit breaker transitioning to half-open',
        );
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    if (this.state !== 'closed' || this.failureCount !== 0) {
      logger.info({ component: this.options.name }, 'Circuit breaker reset to closed');
    }
    this.failureCount = 0;
    this.state = 'closed';
    this.openUntil = 0;
    this.lastError = undefined;
    this.updateMetric();
  }

  recordFailure(error: Error): void {
    this.failureCount += 1;
    this.lastError = error;
    dbConnectionErrors.inc({ database: this.options.name, error_type: 'circuit_failure' });

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'open';
      this.openUntil = Date.now() + this.options.cooldownMs;
      logger.error(
        { component: this.options.name, failureCount: this.failureCount, err: error },
        'Circuit breaker opened',
      );
    } else if (this.state === 'half-open') {
      this.state = 'open';
      this.openUntil = Date.now() + this.options.cooldownMs;
      logger.error(
        { component: this.options.name, err: error },
        'Circuit breaker re-opened while half-open',
      );
    }
    this.updateMetric();
  }

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() >= this.openUntil) {
      return 'half-open';
    }
    return this.state;
  }

  private updateMetric() {
    const stateValue = this.state === 'closed' ? 0 : this.state === 'half-open' ? 1 : 2;
    circuitBreakerState.labels(this.options.name).set(stateValue);
  }
}

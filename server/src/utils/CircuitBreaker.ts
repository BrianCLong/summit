import logger from '../utils/logger.js';

export type CircuitState = 'closed' | 'half-open' | 'open';

export class CircuitBreaker {
  private failureCount = 0;
  private state: CircuitState = 'closed';
  private openUntil = 0;
  private lastError?: Error;

  constructor(
    private readonly name: string,
    private readonly failureThreshold: number,
    private readonly cooldownMs: number,
  ) {}

  canExecute(): boolean {
    if (this.state === 'open') {
      if (Date.now() >= this.openUntil) {
        this.state = 'half-open';
        logger.warn(
          'Circuit breaker half-open',
          { pool: this.name },
        );
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess(): void {
    if (this.state !== 'closed' || this.failureCount !== 0) {
      logger.info('Circuit breaker reset', { pool: this.name });
    }
    this.failureCount = 0;
    this.state = 'closed';
    this.openUntil = 0;
    this.lastError = undefined;
  }

  recordFailure(error: Error): void {
    this.failureCount += 1;
    this.lastError = error;

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.openUntil = Date.now() + this.cooldownMs;
      logger.error(
        'Circuit breaker opened',
        { pool: this.name, failureCount: this.failureCount, err: error },
      );
    } else if (this.state === 'half-open') {
      this.state = 'open';
      this.openUntil = Date.now() + this.cooldownMs;
      logger.error(
        'Circuit breaker re-opened while half-open',
        { pool: this.name, err: error },
      );
    }
  }

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() >= this.openUntil) {
      return 'half-open';
    }
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getLastError(): Error | undefined {
    return this.lastError;
  }
}

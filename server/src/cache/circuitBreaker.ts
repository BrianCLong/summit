export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export type CircuitBreakerOptions = {
  failureThreshold: number;
  successThreshold: number;
  openTimeoutMs: number;
};

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastOpenedAt = 0;

  constructor(private options: CircuitBreakerOptions) {}

  private transitionToOpen() {
    this.state = 'open';
    this.lastOpenedAt = Date.now();
    this.failures = 0;
    this.successes = 0;
  }

  private transitionToHalfOpen() {
    this.state = 'half-open';
    this.failures = 0;
    this.successes = 0;
  }

  private transitionToClosed() {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
  }

  private canAttempt(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastOpenedAt;
      if (elapsed >= this.options.openTimeoutMs) {
        this.transitionToHalfOpen();
        return true;
      }
      return false;
    }
    return true;
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canAttempt()) {
      throw new Error('circuit-open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === 'half-open') {
      this.successes += 1;
      if (this.successes >= this.options.successThreshold) {
        this.transitionToClosed();
      }
      return;
    }
    this.failures = 0;
  }

  private onFailure() {
    this.failures += 1;
    this.successes = 0;
    if (this.failures >= this.options.failureThreshold) {
      this.transitionToOpen();
    }
  }

  getState(): CircuitBreakerState {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastOpenedAt;
      if (elapsed >= this.options.openTimeoutMs) {
        this.state = 'half-open';
      }
    }
    return this.state;
  }
}

export function createCircuitBreaker(options: CircuitBreakerOptions) {
  const breaker = new CircuitBreaker(options);
  return breaker;
}

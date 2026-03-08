import { StreamOperator } from './types';
import pino from 'pino';

const logger = pino({ name: 'stream-operators' });

/**
 * Common stream operators
 */

/**
 * Deduplicate operator
 */
export class DeduplicateOperator<T> implements StreamOperator<T, T> {
  name = 'deduplicate';
  private seen: Set<string> = new Set();
  private maxSize: number = 100000;

  constructor(
    private keyExtractor: (value: T) => string,
    maxSize?: number
  ) {
    if (maxSize) {
      this.maxSize = maxSize;
    }
  }

  async process(input: T): Promise<T | T[]> {
    const key = this.keyExtractor(input);

    if (this.seen.has(key)) {
      return [];
    }

    this.seen.add(key);

    // Prevent unbounded growth
    if (this.seen.size > this.maxSize) {
      const iterator = this.seen.values();
      this.seen.delete(iterator.next().value);
    }

    return input;
  }
}

/**
 * Throttle operator
 */
export class ThrottleOperator<T> implements StreamOperator<T, T> {
  name = 'throttle';
  private lastEmit: number = 0;

  constructor(private intervalMs: number) {}

  async process(input: T): Promise<T | T[]> {
    const now = Date.now();

    if (now - this.lastEmit < this.intervalMs) {
      return [];
    }

    this.lastEmit = now;
    return input;
  }
}

/**
 * Debounce operator
 */
export class DebounceOperator<T> implements StreamOperator<T, T> {
  name = 'debounce';
  private timer: NodeJS.Timeout | null = null;
  private pendingValue: T | null = null;
  private resolver: ((value: T | T[]) => void) | null = null;

  constructor(private delayMs: number) {}

  async process(input: T): Promise<T | T[]> {
    this.pendingValue = input;

    if (this.timer) {
      clearTimeout(this.timer);
    }

    return new Promise((resolve) => {
      this.resolver = resolve;

      this.timer = setTimeout(() => {
        if (this.pendingValue !== null) {
          resolve(this.pendingValue);
          this.pendingValue = null;
        }
      }, this.delayMs);
    });
  }
}

/**
 * Sample operator (take every Nth element)
 */
export class SampleOperator<T> implements StreamOperator<T, T> {
  name = 'sample';
  private count: number = 0;

  constructor(private n: number) {}

  async process(input: T): Promise<T | T[]> {
    this.count++;

    if (this.count % this.n === 0) {
      return input;
    }

    return [];
  }
}

/**
 * Batch operator
 */
export class BatchOperator<T> implements StreamOperator<T, T[]> {
  name = 'batch';
  private batch: T[] = [];

  constructor(
    private batchSize: number,
    private timeoutMs?: number
  ) {
    if (timeoutMs) {
      setInterval(() => {
        if (this.batch.length > 0) {
          this.flush();
        }
      }, timeoutMs);
    }
  }

  async process(input: T): Promise<T[] | T[][]> {
    this.batch.push(input);

    if (this.batch.length >= this.batchSize) {
      return [this.flush()];
    }

    return [];
  }

  private flush(): T[] {
    const result = this.batch;
    this.batch = [];
    return result;
  }
}

/**
 * Retry operator
 */
export class RetryOperator<T> implements StreamOperator<T, T> {
  name = 'retry';

  constructor(
    private operation: (value: T) => Promise<T>,
    private maxRetries: number = 3,
    private retryDelayMs: number = 1000
  ) {}

  async process(input: T): Promise<T | T[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.operation(input);
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          { error, attempt, maxRetries: this.maxRetries },
          'Retry attempt failed'
        );

        if (attempt < this.maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.retryDelayMs * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }
}

/**
 * Circuit breaker operator
 */
export class CircuitBreakerOperator<T> implements StreamOperator<T, T> {
  name = 'circuit-breaker';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private operation: (value: T) => Promise<T>,
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000
  ) {}

  async process(input: T): Promise<T | T[]> {
    // Check if circuit should be reset
    if (
      this.state === 'OPEN' &&
      Date.now() - this.lastFailureTime > this.resetTimeoutMs
    ) {
      this.state = 'HALF_OPEN';
      this.failureCount = 0;
      logger.info('Circuit breaker half-open');
    }

    // Reject if circuit is open
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await this.operation(input);

      // Success in half-open state closes circuit
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logger.info('Circuit breaker closed');
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        logger.warn('Circuit breaker opened');
      }

      throw error;
    }
  }
}

/**
 * Enrich operator
 */
export class EnrichOperator<T, E> implements StreamOperator<T, T & E> {
  name = 'enrich';

  constructor(
    private enrichmentFunction: (value: T) => Promise<E>
  ) {}

  async process(input: T): Promise<(T & E) | (T & E)[]> {
    const enrichment = await this.enrichmentFunction(input);
    return { ...input, ...enrichment };
  }
}

/**
 * Split operator
 */
export class SplitOperator<T> implements StreamOperator<T, T> {
  name = 'split';
  private outputs: Map<string, T[]> = new Map();

  constructor(
    private predicate: (value: T) => string,
    private outputTags: string[]
  ) {
    for (const tag of outputTags) {
      this.outputs.set(tag, []);
    }
  }

  async process(input: T): Promise<T | T[]> {
    const tag = this.predicate(input);

    if (this.outputs.has(tag)) {
      this.outputs.get(tag)!.push(input);
    }

    return input;
  }

  getOutput(tag: string): T[] {
    return this.outputs.get(tag) || [];
  }

  clearOutputs(): void {
    for (const tag of this.outputTags) {
      this.outputs.set(tag, []);
    }
  }
}

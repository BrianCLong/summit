/**
 * Integration Test Helpers
 *
 * Utility functions and helpers for integration testing.
 *
 * @module tests/integration/framework
 */

import { randomUUID } from 'crypto';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryOn?: (error: Error) => boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier, maxDelayMs, retryOn } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry this error
      if (retryOn && !retryOn(error)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        await sleep(currentDelay);
        currentDelay = Math.min(currentDelay * (backoffMultiplier || 2), maxDelayMs || 10000);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout: ${message}`);
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

/**
 * Create a timeout promise
 */
export function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * GraphQL request helper
 */
export interface GraphQLRequestOptions {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
  headers?: Record<string, string>;
}

/**
 * GraphQL response
 */
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
}

/**
 * Make a GraphQL request
 */
export async function graphqlRequest<T = any>(
  url: string,
  options: GraphQLRequestOptions
): Promise<GraphQLResponse<T>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify({
      query: options.query,
      variables: options.variables,
      operationName: options.operationName,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * GraphQL query builder
 */
export class GraphQLQueryBuilder {
  private queryParts: string[] = [];
  private variableDefinitions: string[] = [];
  private variables: Record<string, any> = {};

  query(name: string, selection: string): this {
    this.queryParts.push(`${name} ${selection}`);
    return this;
  }

  mutation(name: string, selection: string): this {
    this.queryParts.push(`mutation { ${name} ${selection} }`);
    return this;
  }

  variable(name: string, type: string, value: any): this {
    this.variableDefinitions.push(`$${name}: ${type}`);
    this.variables[name] = value;
    return this;
  }

  build(): { query: string; variables: Record<string, any> } {
    const varDefs = this.variableDefinitions.length > 0
      ? `(${this.variableDefinitions.join(', ')})`
      : '';

    return {
      query: `query ${varDefs} { ${this.queryParts.join(' ')} }`,
      variables: this.variables,
    };
  }
}

/**
 * HTTP request helper with common defaults
 */
export async function httpRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ status: number; headers: Headers; data: T }> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

/**
 * Assert helpers for integration tests
 */
export const assert = {
  /**
   * Assert response status
   */
  status(response: { status: number }, expected: number): void {
    if (response.status !== expected) {
      throw new Error(`Expected status ${expected}, got ${response.status}`);
    }
  },

  /**
   * Assert GraphQL response has no errors
   */
  noGraphQLErrors(response: GraphQLResponse): void {
    if (response.errors && response.errors.length > 0) {
      const messages = response.errors.map((e) => e.message).join(', ');
      throw new Error(`GraphQL errors: ${messages}`);
    }
  },

  /**
   * Assert GraphQL response has data
   */
  hasData(response: GraphQLResponse): void {
    if (!response.data) {
      throw new Error('GraphQL response has no data');
    }
  },

  /**
   * Assert value is truthy
   */
  truthy(value: any, message?: string): void {
    if (!value) {
      throw new Error(message || `Expected truthy value, got ${value}`);
    }
  },

  /**
   * Assert values are equal
   */
  equal(actual: any, expected: any, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },

  /**
   * Assert value matches pattern
   */
  matches(value: string, pattern: RegExp, message?: string): void {
    if (!pattern.test(value)) {
      throw new Error(message || `Expected ${value} to match ${pattern}`);
    }
  },

  /**
   * Assert array contains value
   */
  contains<T>(array: T[], value: T, message?: string): void {
    if (!array.includes(value)) {
      throw new Error(message || `Expected array to contain ${value}`);
    }
  },

  /**
   * Assert object has property
   */
  hasProperty(obj: any, property: string, message?: string): void {
    if (!(property in obj)) {
      throw new Error(message || `Expected object to have property ${property}`);
    }
  },
};

/**
 * Test data cleanup helper
 */
export class TestDataCleaner {
  private cleanupFns: Array<() => Promise<void>> = [];

  /**
   * Register a cleanup function
   */
  register(fn: () => Promise<void>): void {
    this.cleanupFns.push(fn);
  }

  /**
   * Register entity for cleanup
   */
  registerEntity(deleteUrl: string, id: string): void {
    this.register(async () => {
      await fetch(`${deleteUrl}/${id}`, { method: 'DELETE' }).catch(() => {});
    });
  }

  /**
   * Run all cleanup functions
   */
  async cleanup(): Promise<void> {
    const errors: Error[] = [];

    // Run cleanup in reverse order (LIFO)
    for (const fn of this.cleanupFns.reverse()) {
      try {
        await fn();
      } catch (error: any) {
        errors.push(error);
      }
    }

    this.cleanupFns = [];

    if (errors.length > 0) {
      console.warn(`Cleanup completed with ${errors.length} errors`);
    }
  }
}

/**
 * Test isolation helper
 */
export function isolateTest<T>(
  fn: (context: { testId: string; cleaner: TestDataCleaner }) => Promise<T>
): () => Promise<T> {
  return async () => {
    const testId = generateTestId();
    const cleaner = new TestDataCleaner();

    try {
      return await fn({ testId, cleaner });
    } finally {
      await cleaner.cleanup();
    }
  };
}

/**
 * Parallel test runner
 */
export async function runInParallel<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Test metrics collector
 */
export class TestMetrics {
  private metrics: Map<string, number[]> = new Map();

  record(name: string, value: number): void {
    const values = this.metrics.get(name) || [];
    values.push(value);
    this.metrics.set(name, values);
  }

  recordLatency(name: string, startTime: number): void {
    this.record(name, Date.now() - startTime);
  }

  getStats(name: string): { min: number; max: number; avg: number; count: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
    };
  }

  getAllStats(): Record<string, { min: number; max: number; avg: number; count: number }> {
    const result: Record<string, { min: number; max: number; avg: number; count: number }> = {};

    for (const [name] of this.metrics) {
      const stats = this.getStats(name);
      if (stats) {
        result[name] = stats;
      }
    }

    return result;
  }

  clear(): void {
    this.metrics.clear();
  }
}

export default {
  retry,
  sleep,
  waitFor,
  generateTestId,
  timeout,
  graphqlRequest,
  httpRequest,
  assert,
  isolateTest,
  runInParallel,
  GraphQLQueryBuilder,
  TestDataCleaner,
  TestMetrics,
};

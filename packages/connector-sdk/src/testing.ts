/**
 * Testing Utilities for Connectors
 *
 * Provides test harness and mock implementations for connector testing.
 */

import type {
  Connector,
  ConnectorContext,
  ConnectorConfig,
  ConnectorLogger,
  ConnectorMetrics,
  RateLimiter,
  StateStore,
  EntityEmitter,
  ConnectorEntity,
  ConnectorRelationship,
  ConnectorResult,
} from './types';

// -----------------------------------------------------------------------------
// Mock Implementations
// -----------------------------------------------------------------------------

/**
 * Mock logger for testing
 */
export class MockLogger implements ConnectorLogger {
  public logs: Array<{ level: string; message: string; meta?: Record<string, unknown> }> = [];

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  error(message: string, _error?: Error, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'error', message, meta });
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * Mock metrics collector for testing
 */
export class MockMetrics implements ConnectorMetrics {
  public metrics: Array<{
    type: string;
    name: string;
    value: number;
    tags?: Record<string, string>;
  }> = [];

  increment(name: string, value = 1, tags?: Record<string, string>): void {
    this.metrics.push({ type: 'counter', name, value, tags });
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({ type: 'gauge', name, value, tags });
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({ type: 'histogram', name, value, tags });
  }

  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.metrics.push({ type: 'timing', name, value: durationMs, tags });
  }

  clear(): void {
    this.metrics = [];
  }
}

/**
 * Mock rate limiter for testing
 */
export class MockRateLimiter implements RateLimiter {
  private capacity: number;
  private remaining_: number;

  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.remaining_ = capacity;
  }

  async acquire(): Promise<void> {
    if (this.remaining_ <= 0) {
      throw new Error('Rate limit exceeded');
    }
    this.remaining_--;
  }

  isLimited(): boolean {
    return this.remaining_ <= 0;
  }

  remaining(): number {
    return this.remaining_;
  }

  reset(): void {
    this.remaining_ = this.capacity;
  }
}

/**
 * Mock state store for testing
 */
export class MockStateStore implements StateStore {
  private state: Map<string, unknown> = new Map();
  private cursor_: string | null = null;

  async get<T>(key: string): Promise<T | null> {
    return (this.state.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.state.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.state.delete(key);
  }

  async getCursor(): Promise<string | null> {
    return this.cursor_;
  }

  async setCursor(cursor: string): Promise<void> {
    this.cursor_ = cursor;
  }

  clear(): void {
    this.state.clear();
    this.cursor_ = null;
  }
}

/**
 * Mock entity emitter for testing
 */
export class MockEntityEmitter implements EntityEmitter {
  public entities: ConnectorEntity[] = [];
  public relationships: ConnectorRelationship[] = [];

  async emitEntity(entity: ConnectorEntity): Promise<void> {
    this.entities.push(entity);
  }

  async emitRelationship(relationship: ConnectorRelationship): Promise<void> {
    this.relationships.push(relationship);
  }

  async emitEntities(entities: ConnectorEntity[]): Promise<void> {
    this.entities.push(...entities);
  }

  async emitRelationships(relationships: ConnectorRelationship[]): Promise<void> {
    this.relationships.push(...relationships);
  }

  async flush(): Promise<void> {
    // No-op for mock
  }

  clear(): void {
    this.entities = [];
    this.relationships = [];
  }
}

// -----------------------------------------------------------------------------
// Test Harness
// -----------------------------------------------------------------------------

/**
 * Create a mock connector context for testing
 */
export function createMockContext(
  overrides?: Partial<ConnectorContext>
): ConnectorContext & {
  logger: MockLogger;
  metrics: MockMetrics;
  rateLimiter: MockRateLimiter;
  stateStore: MockStateStore;
  emitter: MockEntityEmitter;
} {
  const abortController = new AbortController();

  return {
    logger: new MockLogger(),
    metrics: new MockMetrics(),
    rateLimiter: new MockRateLimiter(),
    stateStore: new MockStateStore(),
    emitter: new MockEntityEmitter(),
    signal: abortController.signal,
    ...overrides,
  } as ConnectorContext & {
    logger: MockLogger;
    metrics: MockMetrics;
    rateLimiter: MockRateLimiter;
    stateStore: MockStateStore;
    emitter: MockEntityEmitter;
  };
}

/**
 * Create a mock connector config for testing
 */
export function createMockConfig(overrides?: Partial<ConnectorConfig>): ConnectorConfig {
  return {
    config: {},
    secrets: {},
    tenantId: 'test-tenant',
    investigationIds: ['test-investigation'],
    defaultClassification: 'UNCLASSIFIED',
    defaultTags: ['test'],
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// Test Assertions
// -----------------------------------------------------------------------------

/**
 * Assert that a connector result is successful
 */
export function assertSuccess(result: ConnectorResult): void {
  if (!result.success) {
    const errors = result.errors?.map((e) => e.message).join(', ') || 'Unknown error';
    throw new Error(`Expected success but got failure: ${errors}`);
  }
}

/**
 * Assert that a connector result failed
 */
export function assertFailure(result: ConnectorResult): void {
  if (result.success) {
    throw new Error('Expected failure but got success');
  }
}

/**
 * Assert entity count
 */
export function assertEntityCount(emitter: MockEntityEmitter, expected: number): void {
  if (emitter.entities.length !== expected) {
    throw new Error(`Expected ${expected} entities but got ${emitter.entities.length}`);
  }
}

/**
 * Assert relationship count
 */
export function assertRelationshipCount(emitter: MockEntityEmitter, expected: number): void {
  if (emitter.relationships.length !== expected) {
    throw new Error(`Expected ${expected} relationships but got ${emitter.relationships.length}`);
  }
}

// -----------------------------------------------------------------------------
// Golden IO Test Runner
// -----------------------------------------------------------------------------

export interface GoldenIOTest {
  name: string;
  description?: string;
  config: Partial<ConnectorConfig>;
  secrets?: Record<string, string>;
  mockResponses?: Record<string, unknown>;
  expectedEntities?: Partial<ConnectorEntity>[];
  expectedRelationships?: Partial<ConnectorRelationship>[];
  expectedErrors?: string[];
}

/**
 * Run golden IO tests for a connector
 */
export async function runGoldenIOTests(
  connector: Connector,
  tests: GoldenIOTest[]
): Promise<{ passed: number; failed: number; results: Array<{ name: string; passed: boolean; error?: string }> }> {
  const results: Array<{ name: string; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const config = createMockConfig({
        ...test.config,
        secrets: test.secrets || {},
      });
      const context = createMockContext();

      await connector.initialize(config);

      if (connector.pull) {
        await connector.pull(context);
      }

      // Verify expected entities
      if (test.expectedEntities) {
        for (const expected of test.expectedEntities) {
          const found = context.emitter.entities.some((e) =>
            Object.entries(expected).every(([key, value]) => (e as any)[key] === value)
          );
          if (!found) {
            throw new Error(`Expected entity not found: ${JSON.stringify(expected)}`);
          }
        }
      }

      // Verify expected relationships
      if (test.expectedRelationships) {
        for (const expected of test.expectedRelationships) {
          const found = context.emitter.relationships.some((r) =>
            Object.entries(expected).every(([key, value]) => (r as any)[key] === value)
          );
          if (!found) {
            throw new Error(`Expected relationship not found: ${JSON.stringify(expected)}`);
          }
        }
      }

      results.push({ name: test.name, passed: true });
      passed++;
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
      failed++;
    } finally {
      await connector.shutdown();
    }
  }

  return { passed, failed, results };
}

"use strict";
/**
 * Testing Utilities for Connectors
 *
 * Provides test harness and mock implementations for connector testing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockEntityEmitter = exports.MockStateStore = exports.MockRateLimiter = exports.MockMetrics = exports.MockLogger = void 0;
exports.createMockContext = createMockContext;
exports.createMockConfig = createMockConfig;
exports.assertSuccess = assertSuccess;
exports.assertFailure = assertFailure;
exports.assertEntityCount = assertEntityCount;
exports.assertRelationshipCount = assertRelationshipCount;
exports.runGoldenIOTests = runGoldenIOTests;
// -----------------------------------------------------------------------------
// Mock Implementations
// -----------------------------------------------------------------------------
/**
 * Mock logger for testing
 */
class MockLogger {
    logs = [];
    debug(message, meta) {
        this.logs.push({ level: 'debug', message, meta });
    }
    info(message, meta) {
        this.logs.push({ level: 'info', message, meta });
    }
    warn(message, meta) {
        this.logs.push({ level: 'warn', message, meta });
    }
    error(message, _error, meta) {
        this.logs.push({ level: 'error', message, meta });
    }
    clear() {
        this.logs = [];
    }
}
exports.MockLogger = MockLogger;
/**
 * Mock metrics collector for testing
 */
class MockMetrics {
    metrics = [];
    increment(name, value = 1, tags) {
        this.metrics.push({ type: 'counter', name, value, tags });
    }
    gauge(name, value, tags) {
        this.metrics.push({ type: 'gauge', name, value, tags });
    }
    histogram(name, value, tags) {
        this.metrics.push({ type: 'histogram', name, value, tags });
    }
    timing(name, durationMs, tags) {
        this.metrics.push({ type: 'timing', name, value: durationMs, tags });
    }
    clear() {
        this.metrics = [];
    }
}
exports.MockMetrics = MockMetrics;
/**
 * Mock rate limiter for testing
 */
class MockRateLimiter {
    capacity;
    remaining_;
    constructor(capacity = 1000) {
        this.capacity = capacity;
        this.remaining_ = capacity;
    }
    async acquire() {
        if (this.remaining_ <= 0) {
            throw new Error('Rate limit exceeded');
        }
        this.remaining_--;
    }
    isLimited() {
        return this.remaining_ <= 0;
    }
    remaining() {
        return this.remaining_;
    }
    reset() {
        this.remaining_ = this.capacity;
    }
}
exports.MockRateLimiter = MockRateLimiter;
/**
 * Mock state store for testing
 */
class MockStateStore {
    state = new Map();
    cursor_ = null;
    async get(key) {
        return this.state.get(key) ?? null;
    }
    async set(key, value) {
        this.state.set(key, value);
    }
    async delete(key) {
        this.state.delete(key);
    }
    async getCursor() {
        return this.cursor_;
    }
    async setCursor(cursor) {
        this.cursor_ = cursor;
    }
    clear() {
        this.state.clear();
        this.cursor_ = null;
    }
}
exports.MockStateStore = MockStateStore;
/**
 * Mock entity emitter for testing
 */
class MockEntityEmitter {
    entities = [];
    relationships = [];
    async emitEntity(entity) {
        this.entities.push(entity);
    }
    async emitRelationship(relationship) {
        this.relationships.push(relationship);
    }
    async emitEntities(entities) {
        this.entities.push(...entities);
    }
    async emitRelationships(relationships) {
        this.relationships.push(...relationships);
    }
    async flush() {
        // No-op for mock
    }
    clear() {
        this.entities = [];
        this.relationships = [];
    }
}
exports.MockEntityEmitter = MockEntityEmitter;
// -----------------------------------------------------------------------------
// Test Harness
// -----------------------------------------------------------------------------
/**
 * Create a mock connector context for testing
 */
function createMockContext(overrides) {
    const abortController = new AbortController();
    return {
        logger: new MockLogger(),
        metrics: new MockMetrics(),
        rateLimiter: new MockRateLimiter(),
        stateStore: new MockStateStore(),
        emitter: new MockEntityEmitter(),
        signal: abortController.signal,
        ...overrides,
    };
}
/**
 * Create a mock connector config for testing
 */
function createMockConfig(overrides) {
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
function assertSuccess(result) {
    if (!result.success) {
        const errors = result.errors?.map((e) => e.message).join(', ') || 'Unknown error';
        throw new Error(`Expected success but got failure: ${errors}`);
    }
}
/**
 * Assert that a connector result failed
 */
function assertFailure(result) {
    if (result.success) {
        throw new Error('Expected failure but got success');
    }
}
/**
 * Assert entity count
 */
function assertEntityCount(emitter, expected) {
    if (emitter.entities.length !== expected) {
        throw new Error(`Expected ${expected} entities but got ${emitter.entities.length}`);
    }
}
/**
 * Assert relationship count
 */
function assertRelationshipCount(emitter, expected) {
    if (emitter.relationships.length !== expected) {
        throw new Error(`Expected ${expected} relationships but got ${emitter.relationships.length}`);
    }
}
/**
 * Run golden IO tests for a connector
 */
async function runGoldenIOTests(connector, tests) {
    const results = [];
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
                    const found = context.emitter.entities.some((e) => Object.entries(expected).every(([key, value]) => e[key] === value));
                    if (!found) {
                        throw new Error(`Expected entity not found: ${JSON.stringify(expected)}`);
                    }
                }
            }
            // Verify expected relationships
            if (test.expectedRelationships) {
                for (const expected of test.expectedRelationships) {
                    const found = context.emitter.relationships.some((r) => Object.entries(expected).every(([key, value]) => r[key] === value));
                    if (!found) {
                        throw new Error(`Expected relationship not found: ${JSON.stringify(expected)}`);
                    }
                }
            }
            results.push({ name: test.name, passed: true });
            passed++;
        }
        catch (error) {
            results.push({
                name: test.name,
                passed: false,
                error: error instanceof Error ? error.message : String(error),
            });
            failed++;
        }
        finally {
            await connector.shutdown();
        }
    }
    return { passed, failed, results };
}

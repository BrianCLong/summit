"use strict";
/**
 * Integration Test Helpers
 *
 * Utility functions and helpers for integration testing.
 *
 * @module tests/integration/framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestMetrics = exports.TestDataCleaner = exports.assert = exports.GraphQLQueryBuilder = void 0;
exports.retry = retry;
exports.sleep = sleep;
exports.waitFor = waitFor;
exports.generateTestId = generateTestId;
exports.timeout = timeout;
exports.graphqlRequest = graphqlRequest;
exports.httpRequest = httpRequest;
exports.isolateTest = isolateTest;
exports.runInParallel = runInParallel;
const crypto_1 = require("crypto");
/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
};
/**
 * Retry a function with exponential backoff
 */
async function retry(fn, config = {}) {
    const { maxAttempts, delayMs, backoffMultiplier, maxDelayMs, retryOn } = {
        ...DEFAULT_RETRY_CONFIG,
        ...config,
    };
    let lastError = null;
    let currentDelay = delayMs;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Wait for a condition to be true
 */
async function waitFor(condition, options = {}) {
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
function generateTestId(prefix = 'test') {
    return `${prefix}-${Date.now()}-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
}
/**
 * Create a timeout promise
 */
function timeout(promise, ms, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms)),
    ]);
}
/**
 * Make a GraphQL request
 */
async function graphqlRequest(url, options) {
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
class GraphQLQueryBuilder {
    queryParts = [];
    variableDefinitions = [];
    variables = {};
    query(name, selection) {
        this.queryParts.push(`${name} ${selection}`);
        return this;
    }
    mutation(name, selection) {
        this.queryParts.push(`mutation { ${name} ${selection} }`);
        return this;
    }
    variable(name, type, value) {
        this.variableDefinitions.push(`$${name}: ${type}`);
        this.variables[name] = value;
        return this;
    }
    build() {
        const varDefs = this.variableDefinitions.length > 0
            ? `(${this.variableDefinitions.join(', ')})`
            : '';
        return {
            query: `query ${varDefs} { ${this.queryParts.join(' ')} }`,
            variables: this.variables,
        };
    }
}
exports.GraphQLQueryBuilder = GraphQLQueryBuilder;
/**
 * HTTP request helper with common defaults
 */
async function httpRequest(url, options = {}) {
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
exports.assert = {
    /**
     * Assert response status
     */
    status(response, expected) {
        if (response.status !== expected) {
            throw new Error(`Expected status ${expected}, got ${response.status}`);
        }
    },
    /**
     * Assert GraphQL response has no errors
     */
    noGraphQLErrors(response) {
        if (response.errors && response.errors.length > 0) {
            const messages = response.errors.map((e) => e.message).join(', ');
            throw new Error(`GraphQL errors: ${messages}`);
        }
    },
    /**
     * Assert GraphQL response has data
     */
    hasData(response) {
        if (!response.data) {
            throw new Error('GraphQL response has no data');
        }
    },
    /**
     * Assert value is truthy
     */
    truthy(value, message) {
        if (!value) {
            throw new Error(message || `Expected truthy value, got ${value}`);
        }
    },
    /**
     * Assert values are equal
     */
    equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    },
    /**
     * Assert value matches pattern
     */
    matches(value, pattern, message) {
        if (!pattern.test(value)) {
            throw new Error(message || `Expected ${value} to match ${pattern}`);
        }
    },
    /**
     * Assert array contains value
     */
    contains(array, value, message) {
        if (!array.includes(value)) {
            throw new Error(message || `Expected array to contain ${value}`);
        }
    },
    /**
     * Assert object has property
     */
    hasProperty(obj, property, message) {
        if (!(property in obj)) {
            throw new Error(message || `Expected object to have property ${property}`);
        }
    },
};
/**
 * Test data cleanup helper
 */
class TestDataCleaner {
    cleanupFns = [];
    /**
     * Register a cleanup function
     */
    register(fn) {
        this.cleanupFns.push(fn);
    }
    /**
     * Register entity for cleanup
     */
    registerEntity(deleteUrl, id) {
        this.register(async () => {
            await fetch(`${deleteUrl}/${id}`, { method: 'DELETE' }).catch(() => { });
        });
    }
    /**
     * Run all cleanup functions
     */
    async cleanup() {
        const errors = [];
        // Run cleanup in reverse order (LIFO)
        for (const fn of this.cleanupFns.reverse()) {
            try {
                await fn();
            }
            catch (error) {
                errors.push(error);
            }
        }
        this.cleanupFns = [];
        if (errors.length > 0) {
            console.warn(`Cleanup completed with ${errors.length} errors`);
        }
    }
}
exports.TestDataCleaner = TestDataCleaner;
/**
 * Test isolation helper
 */
function isolateTest(fn) {
    return async () => {
        const testId = generateTestId();
        const cleaner = new TestDataCleaner();
        try {
            return await fn({ testId, cleaner });
        }
        finally {
            await cleaner.cleanup();
        }
    };
}
/**
 * Parallel test runner
 */
async function runInParallel(tasks, concurrency = 5) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const promise = task().then((result) => {
            results.push(result);
        });
        executing.push(promise);
        if (executing.length >= concurrency) {
            await Promise.race(executing);
            executing.splice(executing.findIndex((p) => p === promise), 1);
        }
    }
    await Promise.all(executing);
    return results;
}
/**
 * Test metrics collector
 */
class TestMetrics {
    metrics = new Map();
    record(name, value) {
        const values = this.metrics.get(name) || [];
        values.push(value);
        this.metrics.set(name, values);
    }
    recordLatency(name, startTime) {
        this.record(name, Date.now() - startTime);
    }
    getStats(name) {
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
    getAllStats() {
        const result = {};
        for (const [name] of this.metrics) {
            const stats = this.getStats(name);
            if (stats) {
                result[name] = stats;
            }
        }
        return result;
    }
    clear() {
        this.metrics.clear();
    }
}
exports.TestMetrics = TestMetrics;
exports.default = {
    retry,
    sleep,
    waitFor,
    generateTestId,
    timeout,
    graphqlRequest,
    httpRequest,
    assert: exports.assert,
    isolateTest,
    runInParallel,
    GraphQLQueryBuilder,
    TestDataCleaner,
    TestMetrics,
};

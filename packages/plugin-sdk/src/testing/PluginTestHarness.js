"use strict";
/**
 * Plugin Test Harness
 *
 * Comprehensive testing framework for Summit plugins.
 * Provides simulated sandbox, mock context, and test utilities.
 *
 * @module @summit/plugin-sdk/testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginTestSuite = exports.PluginTestHarness = void 0;
exports.createTestHarness = createTestHarness;
exports.createTestSuite = createTestSuite;
/* eslint-disable require-await, @typescript-eslint/no-non-null-assertion */
const events_1 = require("events");
// ============================================================================
// Mock Implementations
// ============================================================================
/**
 * Create mock logger
 */
function createMockLogger() {
    const logs = [];
    return {
        debug: (message, meta) => logs.push({ level: 'debug', message, meta, timestamp: new Date() }),
        info: (message, meta) => logs.push({ level: 'info', message, meta, timestamp: new Date() }),
        warn: (message, meta) => logs.push({ level: 'warn', message, meta, timestamp: new Date() }),
        error: (message, error, meta) => logs.push({ level: 'error', message, error, meta, timestamp: new Date() }),
        getLogs: () => [...logs],
        clear: () => logs.length = 0,
    };
}
/**
 * Create mock storage
 */
function createMockStorage() {
    const store = new Map();
    return {
        get: async (key) => {
            const entry = store.get(key);
            if (!entry) {
                return null;
            }
            if (entry.expiry && Date.now() > entry.expiry) {
                store.delete(key);
                return null;
            }
            return entry.value;
        },
        set: async (key, value, ttl) => {
            store.set(key, {
                value,
                expiry: ttl ? Date.now() + ttl * 1000 : undefined,
            });
        },
        delete: async (key) => {
            store.delete(key);
        },
        has: async (key) => {
            const entry = store.get(key);
            if (!entry) {
                return false;
            }
            if (entry.expiry && Date.now() > entry.expiry) {
                store.delete(key);
                return false;
            }
            return true;
        },
        keys: async () => Array.from(store.keys()),
        clear: async () => {
            store.clear();
        },
        getAll: () => {
            const result = new Map();
            store.forEach((entry, key) => {
                if (!entry.expiry || Date.now() <= entry.expiry) {
                    result.set(key, entry.value);
                }
            });
            return result;
        },
    };
}
/**
 * Create mock API
 */
function createMockAPI() {
    const mockResponses = new Map();
    const mockGraphQLResponses = new Map();
    const history = [];
    return {
        request: async (endpoint, options) => {
            history.push({ type: 'rest', endpoint, options, timestamp: new Date() });
            const response = mockResponses.get(endpoint);
            if (response !== undefined) {
                return response;
            }
            return { success: true, data: {} };
        },
        graphql: async (query, variables) => {
            history.push({ type: 'graphql', query, variables, timestamp: new Date() });
            // Extract operation name from query
            const match = query.match(/(?:query|mutation)\s+(\w+)/);
            const operationName = match?.[1];
            if (operationName) {
                const response = mockGraphQLResponses.get(operationName);
                if (response !== undefined) {
                    return { data: response };
                }
            }
            return { data: {} };
        },
        setMockResponse: (endpoint, response) => {
            mockResponses.set(endpoint, response);
        },
        setMockGraphQLResponse: (operationName, response) => {
            mockGraphQLResponses.set(operationName, response);
        },
        getRequestHistory: () => [...history],
        clearHistory: () => history.length = 0,
    };
}
/**
 * Create mock event bus
 */
function createMockEventBus() {
    const handlers = new Map();
    const emittedEvents = [];
    return {
        on: (event, handler) => {
            if (!handlers.has(event)) {
                handlers.set(event, new Set());
            }
            handlers.get(event).add(handler);
        },
        off: (event, handler) => {
            handlers.get(event)?.delete(handler);
        },
        emit: async (event, payload) => {
            emittedEvents.push({ event, payload, timestamp: new Date() });
            const eventHandlers = handlers.get(event);
            if (eventHandlers) {
                for (const handler of eventHandlers) {
                    await handler(payload);
                }
            }
        },
        once: (event, handler) => {
            const wrappedHandler = async (payload) => {
                await handler(payload);
                handlers.get(event)?.delete(wrappedHandler);
            };
            if (!handlers.has(event)) {
                handlers.set(event, new Set());
            }
            handlers.get(event).add(wrappedHandler);
        },
        getEmittedEvents: () => [...emittedEvents],
        getRegisteredHandlers: () => {
            const result = new Map();
            handlers.forEach((set, event) => result.set(event, set.size));
            return result;
        },
        clearHistory: () => emittedEvents.length = 0,
    };
}
/**
 * Create mock secrets
 */
function createMockSecrets() {
    const secrets = new Map();
    const accessLog = [];
    return {
        get: async (key) => {
            accessLog.push({ key, action: 'get', timestamp: new Date() });
            return secrets.get(key) ?? null;
        },
        set: (key, value) => {
            accessLog.push({ key, action: 'set', timestamp: new Date() });
            secrets.set(key, value);
        },
        delete: (key) => {
            accessLog.push({ key, action: 'delete', timestamp: new Date() });
            secrets.delete(key);
        },
        getAccessLog: () => [...accessLog],
    };
}
/**
 * Create mock metrics
 */
function createMockMetrics() {
    const metrics = [];
    return {
        counter: (name, value = 1, tags) => metrics.push({ type: 'counter', name, value, tags, timestamp: new Date() }),
        gauge: (name, value, tags) => metrics.push({ type: 'gauge', name, value, tags, timestamp: new Date() }),
        histogram: (name, value, tags) => metrics.push({ type: 'histogram', name, value, tags, timestamp: new Date() }),
        timing: (name, duration, tags) => metrics.push({ type: 'timing', name, value: duration, tags, timestamp: new Date() }),
        getMetrics: () => [...metrics],
        clear: () => metrics.length = 0,
    };
}
// ============================================================================
// Plugin Test Harness
// ============================================================================
class PluginTestHarness extends events_1.EventEmitter {
    plugin = null;
    context;
    options;
    initialized = false;
    started = false;
    constructor(options = {}) {
        super();
        this.options = {
            pluginId: options.pluginId || 'test-plugin',
            version: options.version || '1.0.0',
            config: options.config || {},
            timeout: options.timeout || 5000,
            isolateStorage: options.isolateStorage ?? true,
        };
        this.context = this.createContext();
    }
    /**
     * Create mock context
     */
    createContext() {
        return {
            pluginId: this.options.pluginId,
            version: this.options.version,
            config: this.options.config,
            logger: createMockLogger(),
            storage: createMockStorage(),
            api: createMockAPI(),
            events: createMockEventBus(),
            secrets: createMockSecrets(),
            metrics: createMockMetrics(),
        };
    }
    /**
     * Load a plugin for testing
     */
    async load(plugin) {
        this.plugin = plugin;
        this.emit('plugin:loaded', { pluginId: this.options.pluginId });
    }
    /**
     * Initialize the plugin
     */
    async initialize() {
        if (!this.plugin) {
            throw new Error('No plugin loaded');
        }
        if (this.initialized) {
            throw new Error('Plugin already initialized');
        }
        await this.withTimeout(this.plugin.initialize(this.context), 'Plugin initialization timed out');
        this.initialized = true;
        this.emit('plugin:initialized');
    }
    /**
     * Start the plugin
     */
    async start() {
        if (!this.initialized) {
            throw new Error('Plugin not initialized');
        }
        if (this.started) {
            throw new Error('Plugin already started');
        }
        await this.withTimeout(this.plugin.start(), 'Plugin start timed out');
        this.started = true;
        this.emit('plugin:started');
    }
    /**
     * Stop the plugin
     */
    async stop() {
        if (!this.started) {
            throw new Error('Plugin not started');
        }
        await this.withTimeout(this.plugin.stop(), 'Plugin stop timed out');
        this.started = false;
        this.emit('plugin:stopped');
    }
    /**
     * Destroy the plugin
     */
    async destroy() {
        if (this.started) {
            await this.stop();
        }
        if (this.initialized && this.plugin) {
            await this.withTimeout(this.plugin.destroy(), 'Plugin destroy timed out');
        }
        this.initialized = false;
        this.plugin = null;
        this.emit('plugin:destroyed');
    }
    /**
     * Run full lifecycle test
     */
    async runLifecycleTest() {
        const start = Date.now();
        const assertions = [];
        try {
            // Initialize
            await this.initialize();
            assertions.push({ description: 'Plugin initializes successfully', passed: true });
            // Start
            await this.start();
            assertions.push({ description: 'Plugin starts successfully', passed: true });
            // Health check
            if (this.plugin?.healthCheck) {
                const health = await this.plugin.healthCheck();
                const passed = health.healthy;
                assertions.push({
                    description: 'Plugin health check passes',
                    passed,
                    expected: true,
                    actual: health.healthy,
                });
            }
            // Stop
            await this.stop();
            assertions.push({ description: 'Plugin stops successfully', passed: true });
            // Destroy
            await this.destroy();
            assertions.push({ description: 'Plugin destroys successfully', passed: true });
            return {
                name: 'Lifecycle Test',
                passed: assertions.every((a) => a.passed),
                duration: Date.now() - start,
                assertions,
            };
        }
        catch (error) {
            return {
                name: 'Lifecycle Test',
                passed: false,
                duration: Date.now() - start,
                error: error instanceof Error ? error : new Error(String(error)),
                assertions,
            };
        }
    }
    /**
     * Simulate an event
     */
    async simulateEvent(event, payload) {
        if (!this.started) {
            throw new Error('Plugin not started');
        }
        await this.context.events.emit(event, payload);
        if (this.plugin?.handleEvent) {
            await this.plugin.handleEvent(event, payload);
        }
    }
    /**
     * Simulate a request
     */
    async simulateRequest(request) {
        if (!this.started) {
            throw new Error('Plugin not started');
        }
        if (!this.plugin?.handleRequest) {
            throw new Error('Plugin does not handle requests');
        }
        return this.plugin.handleRequest(request);
    }
    /**
     * Get mock context for direct access
     */
    getContext() {
        return this.context;
    }
    /**
     * Get logger for inspection
     */
    getLogger() {
        return this.context.logger;
    }
    /**
     * Get storage for inspection
     */
    getStorage() {
        return this.context.storage;
    }
    /**
     * Get API client for inspection
     */
    getAPI() {
        return this.context.api;
    }
    /**
     * Get event bus for inspection
     */
    getEvents() {
        return this.context.events;
    }
    /**
     * Get metrics for inspection
     */
    getMetrics() {
        return this.context.metrics;
    }
    /**
     * Assert log contains message
     */
    assertLogContains(level, message) {
        return this.context.logger.getLogs().some((log) => log.level === level && log.message.includes(message));
    }
    /**
     * Assert event was emitted
     */
    assertEventEmitted(event, payload) {
        const events = this.context.events.getEmittedEvents();
        return events.some((e) => {
            if (e.event !== event) {
                return false;
            }
            if (payload !== undefined) {
                return JSON.stringify(e.payload) === JSON.stringify(payload);
            }
            return true;
        });
    }
    /**
     * Assert API was called
     */
    assertAPICalled(endpoint) {
        return this.context.api.getRequestHistory().some((r) => r.endpoint === endpoint);
    }
    /**
     * Assert metric was recorded
     */
    assertMetricRecorded(name, type) {
        return this.context.metrics.getMetrics().some((m) => {
            if (m.name !== name) {
                return false;
            }
            if (type !== undefined && m.type !== type) {
                return false;
            }
            return true;
        });
    }
    /**
     * Reset harness state
     */
    async reset() {
        if (this.plugin) {
            await this.destroy();
        }
        this.context = this.createContext();
        this.initialized = false;
        this.started = false;
    }
    /**
     * Helper to run with timeout
     */
    async withTimeout(promise, message) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error(message)), this.options.timeout);
            }),
        ]);
    }
}
exports.PluginTestHarness = PluginTestHarness;
// ============================================================================
// Test Suite Runner
// ============================================================================
class PluginTestSuite {
    name;
    tests = [];
    beforeEach;
    afterEach;
    harnessOptions;
    constructor(name, harnessOptions = {}) {
        this.name = name;
        this.harnessOptions = harnessOptions;
    }
    /**
     * Add a test
     */
    test(name, fn) {
        this.tests.push({ name, fn });
        return this;
    }
    /**
     * Set before each hook
     */
    setBeforeEach(fn) {
        this.beforeEach = fn;
        return this;
    }
    /**
     * Set after each hook
     */
    setAfterEach(fn) {
        this.afterEach = fn;
        return this;
    }
    /**
     * Run all tests
     */
    async run() {
        const results = [];
        const suiteStart = Date.now();
        for (const test of this.tests) {
            const harness = new PluginTestHarness(this.harnessOptions);
            const testStart = Date.now();
            try {
                if (this.beforeEach) {
                    await this.beforeEach(harness);
                }
                await test.fn(harness);
                results.push({
                    name: test.name,
                    passed: true,
                    duration: Date.now() - testStart,
                    assertions: [],
                });
            }
            catch (error) {
                results.push({
                    name: test.name,
                    passed: false,
                    duration: Date.now() - testStart,
                    error: error instanceof Error ? error : new Error(String(error)),
                    assertions: [],
                });
            }
            finally {
                try {
                    if (this.afterEach) {
                        await this.afterEach(harness);
                    }
                    await harness.reset();
                }
                catch {
                    // Ignore cleanup errors
                }
            }
        }
        return {
            name: this.name,
            tests: results,
            passed: results.filter((r) => r.passed).length,
            failed: results.filter((r) => !r.passed).length,
            duration: Date.now() - suiteStart,
        };
    }
}
exports.PluginTestSuite = PluginTestSuite;
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create a plugin test harness
 */
function createTestHarness(options) {
    return new PluginTestHarness(options);
}
/**
 * Create a test suite
 */
function createTestSuite(name, options) {
    return new PluginTestSuite(name, options);
}

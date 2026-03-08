"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockContext = createMockContext;
exports.createMockLogger = createMockLogger;
exports.createMockStorage = createMockStorage;
exports.createMockAPI = createMockAPI;
exports.createMockEventBus = createMockEventBus;
exports.testPluginLifecycle = testPluginLifecycle;
/**
 * Create a mock plugin context for testing
 */
function createMockContext(overrides) {
    return {
        pluginId: 'test-plugin',
        version: '1.0.0',
        config: {},
        logger: createMockLogger(),
        storage: createMockStorage(),
        api: createMockAPI(),
        events: createMockEventBus(),
        ...overrides,
    };
}
/**
 * Create a mock logger
 */
function createMockLogger() {
    const logs = [];
    return {
        debug: (message, meta) => logs.push({ level: 'debug', message, meta }),
        info: (message, meta) => logs.push({ level: 'info', message, meta }),
        warn: (message, meta) => logs.push({ level: 'warn', message, meta }),
        error: (message, error, meta) => logs.push({ level: 'error', message, error, meta }),
    };
}
/**
 * Create a mock storage
 */
function createMockStorage() {
    const store = new Map();
    return {
        get: async (key) => store.get(key) ?? null,
        set: async (key, value) => { store.set(key, value); },
        delete: async (key) => { store.delete(key); },
        has: async (key) => store.has(key),
        keys: async () => Array.from(store.keys()),
        clear: async () => { store.clear(); },
    };
}
/**
 * Create a mock API client
 */
function createMockAPI() {
    return {
        request: async (_endpoint, _options) => {
            return { success: true, data: {} };
        },
        graphql: async (_query, _variables) => {
            return { data: {} };
        },
    };
}
/**
 * Create a mock event bus
 */
function createMockEventBus() {
    const handlers = new Map();
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
        emit: async (event, ...args) => {
            const eventHandlers = handlers.get(event);
            if (eventHandlers) {
                for (const handler of eventHandlers) {
                    await handler(...args);
                }
            }
        },
        once: (event, handler) => {
            const wrappedHandler = (...args) => {
                handler(...args);
                handlers.get(event)?.delete(wrappedHandler);
            };
            if (!handlers.has(event)) {
                handlers.set(event, new Set());
            }
            handlers.get(event).add(wrappedHandler);
        },
    };
}
/**
 * Test plugin lifecycle
 */
async function testPluginLifecycle(plugin) {
    const context = createMockContext();
    // Test initialization
    await plugin.initialize(context);
    // Test start
    await plugin.start();
    // Test health check if available
    if (plugin.healthCheck) {
        const health = await plugin.healthCheck();
        if (!health.healthy) {
            throw new Error('Plugin health check failed');
        }
    }
    // Test stop
    await plugin.stop();
    // Test destroy
    await plugin.destroy();
}

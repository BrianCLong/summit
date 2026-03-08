"use strict";
/**
 * Connector SDK Base Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const base_1 = require("../base");
const testing_1 = require("../testing");
// Test connector implementation
class TestConnector extends base_1.BaseConnector {
    name = 'test-connector';
    version = '1.0.0';
    capabilities = ['fetch', 'search'];
    async fetch(params) {
        if (params.id === 'not-found') {
            return { success: false, error: 'Entity not found' };
        }
        return {
            success: true,
            data: { id: params.id, name: 'Test Entity' },
            metadata: { fetchedAt: new Date().toISOString() },
        };
    }
    async search(params) {
        return {
            success: true,
            data: [{ id: '1', name: 'Result 1' }],
            metadata: { total: 1, page: 1 },
        };
    }
}
(0, vitest_1.describe)('BaseConnector', () => {
    let connector;
    let config;
    (0, vitest_1.beforeEach)(() => {
        config = {
            id: 'test-1',
            endpoint: 'https://api.example.com',
            auth: { type: 'api-key', apiKey: 'test-key' },
            rateLimit: { requestsPerMinute: 60 },
            retry: { maxAttempts: 3, backoffMs: 1000 },
        };
        connector = new TestConnector(config);
    });
    (0, vitest_1.describe)('Initialization', () => {
        (0, vitest_1.it)('should initialize with config', () => {
            (0, vitest_1.expect)(connector.name).toBe('test-connector');
            (0, vitest_1.expect)(connector.version).toBe('1.0.0');
            (0, vitest_1.expect)(connector.capabilities).toContain('fetch');
        });
        (0, vitest_1.it)('should validate required config', () => {
            (0, vitest_1.expect)(() => new TestConnector({})).toThrow();
        });
    });
    (0, vitest_1.describe)('Fetch Operations', () => {
        (0, vitest_1.it)('should fetch entity successfully', async () => {
            const result = await connector.fetch({ id: 'entity-123' });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.data?.id).toBe('entity-123');
        });
        (0, vitest_1.it)('should handle fetch errors', async () => {
            const result = await connector.fetch({ id: 'not-found' });
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Entity not found');
        });
    });
    (0, vitest_1.describe)('Search Operations', () => {
        (0, vitest_1.it)('should search entities', async () => {
            const result = await connector.search({ query: 'test' });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(Array.isArray(result.data)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Rate Limiting', () => {
        (0, vitest_1.it)('should respect rate limits', async () => {
            const limitedConnector = new TestConnector({
                ...config,
                rateLimit: { requestsPerMinute: 2 },
            });
            const start = Date.now();
            await Promise.all([
                limitedConnector.fetch({ id: '1' }),
                limitedConnector.fetch({ id: '2' }),
                limitedConnector.fetch({ id: '3' }),
            ]);
            const elapsed = Date.now() - start;
            // Should have been rate limited
            (0, vitest_1.expect)(elapsed).toBeGreaterThan(1000);
        });
    });
    (0, vitest_1.describe)('Retry Logic', () => {
        (0, vitest_1.it)('should retry on transient failures', async () => {
            let attempts = 0;
            const retryConnector = new TestConnector(config);
            vitest_1.vi.spyOn(retryConnector, 'fetch').mockImplementation(async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Transient error');
                }
                return { success: true, data: { id: '1' } };
            });
            const result = await retryConnector.executeWithRetry(() => retryConnector.fetch({ id: '1' }));
            (0, vitest_1.expect)(attempts).toBe(3);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
    (0, vitest_1.describe)('Health Check', () => {
        (0, vitest_1.it)('should report health status', async () => {
            const health = await connector.healthCheck();
            (0, vitest_1.expect)(health.status).toBe('healthy');
            (0, vitest_1.expect)(health.latencyMs).toBeDefined();
        });
    });
});
(0, vitest_1.describe)('MockConnectorTestHarness', () => {
    (0, vitest_1.it)('should create test connector with mock responses', () => {
        const harness = new testing_1.MockConnectorTestHarness({
            name: 'mock-test',
            responses: {
                fetch: { success: true, data: { id: 'mock-1' } },
                search: { success: true, data: [] },
            },
        });
        (0, vitest_1.expect)(harness.connector.name).toBe('mock-test');
    });
    (0, vitest_1.it)('should record call history', async () => {
        const harness = new testing_1.MockConnectorTestHarness({
            name: 'mock-test',
            responses: {
                fetch: { success: true, data: { id: 'mock-1' } },
            },
        });
        await harness.connector.fetch({ id: 'test' });
        await harness.connector.fetch({ id: 'test2' });
        (0, vitest_1.expect)(harness.getCallHistory('fetch')).toHaveLength(2);
    });
    (0, vitest_1.it)('should simulate errors', async () => {
        const harness = new testing_1.MockConnectorTestHarness({
            name: 'mock-test',
            responses: {
                fetch: { success: false, error: 'Simulated error' },
            },
        });
        const result = await harness.connector.fetch({ id: 'test' });
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Simulated error');
    });
});

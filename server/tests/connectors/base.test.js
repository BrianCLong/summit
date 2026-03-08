"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock config before any imports to prevent process.exit
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../../src/config.js', () => ({
    cfg: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://test:test@localhost:5432/test',
        NEO4J_URI: 'bolt://localhost:7687',
        NEO4J_USER: 'neo4j',
        NEO4J_PASSWORD: 'test',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-secret',
        JWT_ISSUER: 'test',
    },
}));
const base_1 = require("../../src/connectors/base");
const stream_1 = require("stream");
// Mock connector for testing base class behavior
class MockConnector extends base_1.BaseConnector {
    async connect() { this.isConnected = true; }
    async disconnect() { this.isConnected = false; }
    async testConnection() { return true; }
    async fetchSchema() { return { fields: [], version: 1 }; }
    async readStream(options) { return new stream_1.Readable({ read() { this.push(null); } }); }
}
(0, globals_1.describe)('BaseConnector', () => {
    let connector;
    const config = {
        id: 'test-1',
        name: 'Test Connector',
        type: 'mock',
        tenantId: 'tenant-1',
        config: {}
    };
    (0, globals_1.beforeEach)(() => {
        connector = new MockConnector(config);
    });
    test('should initialize with correct config', () => {
        (0, globals_1.expect)(connector.validateConfig()).toBe(true);
    });
    test('healthCheck should return healthy when connected', async () => {
        const health = await connector.healthCheck();
        (0, globals_1.expect)(health.status).toBe('healthy');
    });
    test('metrics should start at zero', () => {
        const metrics = connector.getMetrics();
        (0, globals_1.expect)(metrics.recordsProcessed).toBe(0);
        (0, globals_1.expect)(metrics.errors).toBe(0);
    });
});

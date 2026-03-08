"use strict";
/**
 * Integration tests for Admin CLI
 * Tests against mock API server
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mock_server_js_1 = require("./mock-server.js");
describe('Admin CLI Integration Tests', () => {
    let server;
    let serverUrl;
    beforeAll(async () => {
        server = (0, mock_server_js_1.createMockAdminServer)();
        const port = await server.start();
        serverUrl = `http://localhost:${port}`;
    });
    afterAll(async () => {
        await server.stop();
    });
    describe('Mock Server', () => {
        it('should respond to health check', async () => {
            const response = await fetch(`${serverUrl}/health`);
            const data = await response.json();
            expect(response.ok).toBe(true);
            expect(data.status).toBe('healthy');
        });
        it('should return tenant list', async () => {
            const response = await fetch(`${serverUrl}/admin/tenants`);
            const data = await response.json();
            expect(response.ok).toBe(true);
            expect(data.items).toBeDefined();
            expect(Array.isArray(data.items)).toBe(true);
        });
        it('should return graph stats', async () => {
            const response = await fetch(`${serverUrl}/admin/graph/stats`);
            const data = await response.json();
            expect(response.ok).toBe(true);
            expect(data.nodeCount).toBeGreaterThan(0);
            expect(data.edgeCount).toBeGreaterThan(0);
        });
        it('should accept POST requests', async () => {
            const response = await fetch(`${serverUrl}/admin/tenants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test Tenant', adminEmail: 'test@example.com' }),
            });
            const data = await response.json();
            expect(response.status).toBe(201);
            expect(data.id).toBeDefined();
            expect(data.name).toBe('Test Tenant');
        });
        it('should return 404 for unknown routes', async () => {
            const response = await fetch(`${serverUrl}/unknown/route`);
            expect(response.status).toBe(404);
        });
    });
    describe('API Client Integration', () => {
        it('should handle successful requests', async () => {
            // Import dynamically to avoid initialization issues
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.get('/health');
            expect(response.success).toBe(true);
            expect(response.data?.status).toBe('healthy');
        });
        it('should handle 404 errors', async () => {
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.get('/nonexistent');
            expect(response.success).toBe(false);
            expect(response.error?.code).toContain('404');
        });
        it('should include audit headers', async () => {
            // Add route to check headers
            server.get('/check-headers', (req) => ({
                body: {
                    hasNonce: !!req.headers['x-audit-nonce'],
                    hasTimestamp: !!req.headers['x-audit-ts'],
                    hasAuth: !!req.headers['authorization'],
                },
            }));
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.get('/check-headers');
            expect(response.success).toBe(true);
            expect(response.data?.hasNonce).toBe(true);
            expect(response.data?.hasTimestamp).toBe(true);
            expect(response.data?.hasAuth).toBe(true);
        });
    });
    describe('Tenant Operations', () => {
        it('should list tenants', async () => {
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.get('/admin/tenants');
            expect(response.success).toBe(true);
            expect(response.data?.items.length).toBeGreaterThan(0);
        });
        it('should create tenant', async () => {
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.post('/admin/tenants', {
                name: 'Integration Test Tenant',
                adminEmail: 'admin@test.com',
            });
            expect(response.success).toBe(true);
            expect(response.data?.id).toBeDefined();
            expect(response.data?.name).toBe('Integration Test Tenant');
        });
    });
    describe('Security Operations', () => {
        it('should list security keys', async () => {
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.get('/admin/security/keys');
            expect(response.success).toBe(true);
            expect(response.data?.items.length).toBeGreaterThan(0);
        });
        it('should check policies', async () => {
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.post('/admin/security/check-policies', { checkAll: true });
            expect(response.success).toBe(true);
            expect(response.data?.results.length).toBeGreaterThan(0);
            expect(response.data?.results[0].compliant).toBe(true);
        });
    });
    describe('Graph Operations', () => {
        it('should get graph stats', async () => {
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.get('/admin/graph/stats');
            expect(response.success).toBe(true);
            expect(response.data?.nodeCount).toBeGreaterThan(0);
            expect(response.data?.edgeCount).toBeGreaterThan(0);
        });
        it('should check graph health', async () => {
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.get('/admin/graph/health');
            expect(response.success).toBe(true);
            expect(response.data?.status).toBe('healthy');
        });
    });
    describe('Data Operations', () => {
        it('should start backfill operation', async () => {
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.post('/admin/data/backfill', {
                source: 'postgres',
                target: 'neo4j',
            });
            expect(response.success).toBe(true);
            expect(response.data?.operationId).toBeDefined();
            expect(response.data?.status).toBe('running');
        });
        it('should list operations', async () => {
            const { createApiClient } = await Promise.resolve().then(() => __importStar(require('../../utils/api-client.js')));
            const client = createApiClient({
                endpoint: serverUrl,
                token: 'test-token',
            });
            const response = await client.get('/admin/data/operations');
            expect(response.success).toBe(true);
            expect(response.data?.items.length).toBeGreaterThan(0);
        });
    });
});

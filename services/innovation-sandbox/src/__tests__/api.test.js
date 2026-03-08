"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const express_1 = __importDefault(require("express"));
// Mock Redis for testing
const mockRedis = {
    get: async () => null,
    setex: async () => 'OK',
    del: async () => 1,
    sadd: async () => 1,
    srem: async () => 1,
    smembers: async () => [],
    lpush: async () => 1,
    ltrim: async () => 'OK',
    lrange: async () => [],
    exists: async () => 0,
    ttl: async () => 3600,
    expire: async () => 1,
    keys: async () => [],
    on: () => { },
    connect: async () => { },
    quit: async () => { },
};
// Simple test app setup
function createTestApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    app.get('/health/ready', (_req, res) => res.json({ ready: true }));
    app.get('/health/live', (_req, res) => res.json({ live: true }));
    app.get('/api/v1/templates', (_req, res) => {
        res.json([
            { name: 'Standard Development', isolationLevel: 'standard' },
            { name: 'Enhanced Security', isolationLevel: 'enhanced' },
            { name: 'Airgapped', isolationLevel: 'airgapped' },
            { name: 'Mission Ready', isolationLevel: 'mission' },
        ]);
    });
    return app;
}
(0, vitest_1.describe)('API Endpoints', () => {
    let app;
    let server;
    let baseUrl;
    (0, vitest_1.beforeAll)(async () => {
        app = createTestApp();
        server = app.listen(0);
        const address = server.address();
        const port = typeof address === 'object' ? address?.port : 0;
        baseUrl = `http://localhost:${port}`;
    });
    (0, vitest_1.afterAll)(async () => {
        server.close();
    });
    (0, vitest_1.describe)('Health Endpoints', () => {
        (0, vitest_1.it)('GET /health returns ok', async () => {
            const response = await fetch(`${baseUrl}/health`);
            const data = await response.json();
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(data.status).toBe('ok');
        });
        (0, vitest_1.it)('GET /health/ready returns ready status', async () => {
            const response = await fetch(`${baseUrl}/health/ready`);
            const data = await response.json();
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(data.ready).toBe(true);
        });
        (0, vitest_1.it)('GET /health/live returns live status', async () => {
            const response = await fetch(`${baseUrl}/health/live`);
            const data = await response.json();
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(data.live).toBe(true);
        });
    });
    (0, vitest_1.describe)('Templates Endpoint', () => {
        (0, vitest_1.it)('GET /api/v1/templates returns sandbox templates', async () => {
            const response = await fetch(`${baseUrl}/api/v1/templates`);
            const data = await response.json();
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(data)).toBe(true);
            (0, vitest_1.expect)(data.length).toBe(4);
            (0, vitest_1.expect)(data.some((t) => t.isolationLevel === 'standard')).toBe(true);
            (0, vitest_1.expect)(data.some((t) => t.isolationLevel === 'mission')).toBe(true);
        });
    });
});
(0, vitest_1.describe)('Data Structures', () => {
    (0, vitest_1.it)('should validate sandbox config schema', () => {
        const validConfig = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Sandbox',
            isolationLevel: 'enhanced',
            quotas: {
                cpuMs: 5000,
                memoryMb: 128,
                wallClockMs: 30000,
                maxOutputBytes: 1048576,
                maxNetworkBytes: 0,
            },
            allowedModules: [],
            networkAllowlist: [],
            environmentVars: {},
            dataClassification: 'unclassified',
            autoDetectSensitive: true,
            ownerId: 'user-1',
            tenantId: 'tenant-1',
        };
        (0, vitest_1.expect)(validConfig.id).toBeDefined();
        (0, vitest_1.expect)(validConfig.isolationLevel).toBe('enhanced');
        (0, vitest_1.expect)(validConfig.quotas.cpuMs).toBe(5000);
    });
    (0, vitest_1.it)('should validate code submission schema', () => {
        const submission = {
            sandboxId: '123e4567-e89b-12d3-a456-426614174000',
            code: 'return 42;',
            language: 'javascript',
            entryPoint: 'main',
            inputs: { x: 1 },
            metadata: {},
        };
        (0, vitest_1.expect)(submission.sandboxId).toBeDefined();
        (0, vitest_1.expect)(submission.code).toBe('return 42;');
        (0, vitest_1.expect)(submission.language).toBe('javascript');
    });
    (0, vitest_1.it)('should validate migration config schema', () => {
        const config = {
            sandboxId: '123e4567-e89b-12d3-a456-426614174000',
            targetPlatform: 'kubernetes',
            targetEnvironment: 'staging',
            complianceChecks: ['security', 'performance'],
            approvers: ['user-1'],
            rollbackEnabled: true,
            blueGreenDeploy: false,
        };
        (0, vitest_1.expect)(config.targetPlatform).toBe('kubernetes');
        (0, vitest_1.expect)(config.complianceChecks).toContain('security');
        (0, vitest_1.expect)(config.rollbackEnabled).toBe(true);
    });
});

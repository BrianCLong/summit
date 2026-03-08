"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middleware/auth.js");
const tenantContext_js_1 = require("../middleware/tenantContext.js");
// Mock prom-client BEFORE anything else
globals_1.jest.mock('prom-client', () => {
    const mockMetric = {
        inc: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
        observe: globals_1.jest.fn(),
        labels: globals_1.jest.fn().mockReturnThis(),
        startTimer: globals_1.jest.fn().mockReturnValue(globals_1.jest.fn())
    };
    const mockRegister = {
        registerMetric: globals_1.jest.fn(),
        getSingleMetric: globals_1.jest.fn(),
        clear: globals_1.jest.fn(),
        metrics: globals_1.jest.fn().mockReturnValue(''),
        contentType: 'text/plain'
    };
    return {
        register: mockRegister,
        Registry: globals_1.jest.fn().mockImplementation(() => mockRegister),
        Counter: globals_1.jest.fn().mockImplementation(() => mockMetric),
        Histogram: globals_1.jest.fn().mockImplementation(() => mockMetric),
        Gauge: globals_1.jest.fn().mockImplementation(() => mockMetric),
        Summary: globals_1.jest.fn().mockImplementation(() => mockMetric),
        collectDefaultMetrics: globals_1.jest.fn()
    };
});
// Mock the dependencies
globals_1.jest.mock('../db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
        connect: globals_1.jest.fn().mockResolvedValue({
            query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
            release: globals_1.jest.fn(),
        }),
    })),
}));
globals_1.jest.mock('../monitoring/metrics.js', () => ({
    metrics: {
        pbacDecisionsTotal: { inc: globals_1.jest.fn() }
    },
    register: {
        registerMetric: globals_1.jest.fn(),
        clear: globals_1.jest.fn()
    },
    httpRequestDuration: { labels: globals_1.jest.fn().mockReturnThis(), observe: globals_1.jest.fn() },
    httpRequestsTotal: { labels: globals_1.jest.fn().mockReturnThis(), inc: globals_1.jest.fn() }
}));
globals_1.jest.mock('../metrics/neo4jMetrics.js', () => ({
    neo4jQueryLatencyMs: { labels: globals_1.jest.fn().mockReturnThis(), observe: globals_1.jest.fn() },
    neo4jErrorsTotal: { labels: globals_1.jest.fn().mockReturnThis(), inc: globals_1.jest.fn() },
    neo4jConnectionsActive: { set: globals_1.jest.fn() }
}));
globals_1.jest.mock('../audit/advanced-audit-system.js', () => ({
    getAuditSystem: globals_1.jest.fn(() => ({
        recordEvent: globals_1.jest.fn().mockResolvedValue('test-event-id')
    }))
}));
globals_1.jest.mock('../services/AuthService.js', () => {
    const mockService = {
        verifyToken: globals_1.jest.fn(),
        hasPermission: globals_1.jest.fn().mockReturnValue(true),
        formatUser: globals_1.jest.fn((u) => u)
    };
    const MockAuthService = globals_1.jest.fn(() => mockService);
    MockAuthService.getInstance = globals_1.jest.fn(() => mockService);
    global.mockAuthService = mockService;
    return {
        __esModule: true,
        default: MockAuthService
    };
});
const mockAuthService = global.mockAuthService;
(0, globals_1.describe)('Tenant Isolation Integration', () => {
    let app;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        // Setup a test route that requires auth and tenant context
        app.get('/api/test-tenant-resource', auth_js_1.ensureAuthenticated, (0, tenantContext_js_1.tenantContextMiddleware)(), (req, res) => {
            res.json({
                message: 'Access granted',
                tenantId: req.tenantContext.tenantId,
                userId: req.user.id
            });
        });
    });
    (0, globals_1.it)('rejects requests without authentication', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/test-tenant-resource')
            .set('x-tenant-id', 'tenant-1');
        (0, globals_1.expect)(response.status).toBe(401);
    });
    (0, globals_1.it)('rejects requests without tenant header', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
            id: 'user-1',
            email: 'user1@tenant1.com',
            tenantId: 'tenant-1'
        });
        const response = await (0, supertest_1.default)(app)
            .get('/api/test-tenant-resource')
            .set('Authorization', 'Bearer valid-token');
        // Based on app.ts configuration, tenant context is mandatory for /api
        (0, globals_1.expect)(response.status).toBe(400);
        (0, globals_1.expect)(response.body.error).toContain('Tenant context is required');
    });
    (0, globals_1.it)('rejects requests where tenant header does not match token tenantId', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
            id: 'user-1',
            email: 'user1@tenant1.com',
            tenantId: 'tenant-1'
        });
        const response = await (0, supertest_1.default)(app)
            .get('/api/test-tenant-resource')
            .set('Authorization', 'Bearer valid-token')
            .set('x-tenant-id', 'tenant-2');
        (0, globals_1.expect)(response.status).toBe(409);
        (0, globals_1.expect)(response.body.error).toContain('tenant_context_error');
        (0, globals_1.expect)(response.body.message).toContain('Tenant identifier mismatch');
    });
    (0, globals_1.it)('allows requests where tenant header matches token tenantId', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
            id: 'user-1',
            email: 'user1@tenant1.com',
            tenantId: 'tenant-1'
        });
        const response = await (0, supertest_1.default)(app)
            .get('/api/test-tenant-resource')
            .set('Authorization', 'Bearer valid-token')
            .set('x-tenant-id', 'tenant-1');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.tenantId).toBe('tenant-1');
    });
    (0, globals_1.it)('ensures strict isolation even for ADMINs (must specify active tenant)', async () => {
        mockAuthService.verifyToken.mockResolvedValue({
            id: 'admin-1',
            email: 'admin@intelgraph.com',
            role: 'ADMIN',
            tenantId: 'system-tenant'
        });
        // Admin trying to access tenant-1 without being assigned to it?
        // In our system, admins might be allowed to skip mismatch IF we explicitly allow it,
        // but the policy (CN-004) says "Strict tenant isolation".
        const response = await (0, supertest_1.default)(app)
            .get('/api/test-tenant-resource')
            .set('Authorization', 'Bearer admin-token')
            .set('x-tenant-id', 'tenant-1');
        (0, globals_1.expect)(response.status).toBe(409);
        (0, globals_1.expect)(response.body.message).toContain('Tenant identifier mismatch');
    });
});

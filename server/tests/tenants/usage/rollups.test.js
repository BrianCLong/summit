"use strict";
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
const globals_1 = require("@jest/globals");
const mockQuery = globals_1.jest.fn();
const mockRelease = globals_1.jest.fn();
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../../src/config/database.js', () => ({
    getPostgresPool: () => ({
        connect: globals_1.jest.fn(async () => ({
            query: mockQuery,
            release: mockRelease.mockResolvedValue(undefined),
        })),
    }),
}));
globals_1.jest.unstable_mockModule('../../../src/middleware/auth.js', () => ({
    ensureAuthenticated: (req, _res, next) => {
        const tenant = req.headers['x-tenant-id'] || 'tenant-123';
        req.user = { id: 'user-1', tenantId: tenant, roles: ['ADMIN'] };
        next();
    },
}));
// Mock TenantValidator properly with same structure as real module
globals_1.jest.unstable_mockModule('../../../src/middleware/tenantValidator.js', () => {
    class MockTenantValidator {
        static validateTenantAccess(context, requestedTenantId) {
            const userTenantId = context.user?.tenantId;
            if (userTenantId !== requestedTenantId) {
                const error = new Error('Cross-tenant access denied');
                error.extensions = { code: 'CROSS_TENANT_ACCESS_DENIED' };
                throw error;
            }
            return {
                tenantId: requestedTenantId,
                userId: context.user?.id,
                roles: context.user?.roles || [],
                permissions: [],
                environment: 'test',
                privilegeTier: 'standard',
            };
        }
    }
    return { TenantValidator: MockTenantValidator };
});
globals_1.jest.unstable_mockModule('../../../src/services/PricingEngine.js', () => ({
    __esModule: true,
    default: {
        getEffectivePlan: globals_1.jest.fn().mockResolvedValue({
            plan: { limits: { 'llm.tokens': { unitPrice: 0.001 } } },
        }),
    },
}));
globals_1.jest.unstable_mockModule('../../../src/validation/index.js', () => ({
    SanitizationUtils: {
        sanitizeUserInput: globals_1.jest.fn((input) => input),
    },
    SecurityValidator: {
        validateInput: globals_1.jest.fn(() => ({ valid: true, errors: [] })),
    },
}));
globals_1.jest.unstable_mockModule('../../../src/middleware/request-schema-validator.js', () => ({
    buildRequestValidator: () => (req, _res, next) => {
        // Basic datetime validation for 'from' query param
        if (req.query.from && !req.query.from.match(/^\d{4}-\d{2}-\d{2}T/)) {
            return next({
                status: 400,
                message: 'Validation failed',
            });
        }
        next();
    },
}));
// Dynamic imports after mocks are set up
const { default: request } = await Promise.resolve().then(() => __importStar(require('supertest')));
const { default: express } = await Promise.resolve().then(() => __importStar(require('express')));
const { default: usageRouter } = await Promise.resolve().then(() => __importStar(require('../../../src/routes/tenants/usage.js')));
// Create test app
const app = express();
app.use(express.json());
app.use('/api/tenants/:tenantId/usage', usageRouter);
// Error handler to catch validation errors
app.use((err, _req, res, _next) => {
    if (err.status === 400) {
        return res.status(400).json({ error: 'Validation failed' });
    }
    res.status(500).json({ error: 'Internal server error' });
});
(0, globals_1.describe)('GET /api/tenants/:tenantId/usage', () => {
    (0, globals_1.beforeEach)(() => {
        mockQuery.mockReset();
        mockRelease.mockReset();
    });
    (0, globals_1.it)('returns rollups with breakdowns for the tenant and filters by dimension', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    period_start: new Date('2024-01-01T00:00:00Z'),
                    period_end: new Date('2024-01-31T23:59:59Z'),
                    kind: 'llm.tokens',
                    total_quantity: 1234,
                    unit: 'tokens',
                    breakdown: { 'model:gpt-4.1': 1200, 'model:gpt-3.5': 34 },
                },
            ],
        });
        const res = await request(app)
            .get('/api/tenants/tenant-123/usage')
            .query({
            from: '2024-01-01T00:00:00.000Z',
            to: '2024-01-31T23:59:59.000Z',
            dimension: 'llm.tokens',
            limit: '5',
        })
            .set('x-tenant-id', 'tenant-123');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(mockQuery).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith(globals_1.expect.stringContaining('FROM usage_summaries'), globals_1.expect.arrayContaining([
            'tenant-123',
            '2024-01-01T00:00:00.000Z',
            '2024-01-31T23:59:59.000Z',
            ['llm.tokens'],
        ]));
        const body = res.body;
        (0, globals_1.expect)(body).toBeDefined();
        (0, globals_1.expect)(body.rollups).toBeDefined();
        (0, globals_1.expect)(Array.isArray(body.rollups)).toBe(true);
        (0, globals_1.expect)(body.rollups[0]).toMatchObject({
            dimension: 'llm.tokens',
            totalQuantity: 1234,
            unit: 'tokens',
            breakdown: { 'model:gpt-4.1': 1200, 'model:gpt-3.5': 34 },
        });
    });
    (0, globals_1.it)('rejects cross-tenant access', async () => {
        const res = await request(app)
            .get('/api/tenants/other-tenant/usage')
            .set('x-tenant-id', 'tenant-123');
        (0, globals_1.expect)(res.status).toBe(403);
        (0, globals_1.expect)(res.body).toMatchObject({ error: 'tenant_access_denied' });
        (0, globals_1.expect)(mockQuery).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('validates query parameters', async () => {
        const res = await request(app)
            .get('/api/tenants/tenant-123/usage')
            .query({ from: 'not-a-date' })
            .set('x-tenant-id', 'tenant-123');
        (0, globals_1.expect)(res.status).toBe(400);
        (0, globals_1.expect)(res.body).toMatchObject({ error: 'Validation failed' });
        (0, globals_1.expect)(mockQuery).not.toHaveBeenCalled();
    });
});

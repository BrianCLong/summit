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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// Mock functions declared before mocks
const mockGetTenantSettings = globals_1.jest.fn();
const mockUpdateSettings = globals_1.jest.fn();
const mockDisableTenant = globals_1.jest.fn();
const mockCreateTenant = globals_1.jest.fn();
const mockGetTenantUsage = globals_1.jest.fn();
const mockGetPostgresPool = globals_1.jest.fn();
const mockGetRedisClient = globals_1.jest.fn();
const mockAppendEntry = globals_1.jest.fn();
const mockRepoBy = globals_1.jest.fn();
const mockEnsurePolicy = globals_1.jest.fn((_action, _resource) => (_req, _res, next) => next());
let currentUser = {
    id: 'user-1',
    role: 'admin',
    tenantId: 'tenant-1',
};
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../services/TenantService.js', () => ({
    tenantService: {
        getTenantSettings: mockGetTenantSettings,
        updateSettings: mockUpdateSettings,
        disableTenant: mockDisableTenant,
        createTenant: mockCreateTenant,
    },
    createTenantSchema: {
        parse: (v) => v,
        extend: () => ({
            parse: (v) => v,
        }),
    },
    createTenantBaseSchema: {
        extend: () => ({
            parse: (v) => v,
        }),
    },
}));
globals_1.jest.unstable_mockModule('../../services/TenantUsageService.js', () => ({
    tenantUsageService: {
        getTenantUsage: mockGetTenantUsage,
    },
}));
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: mockGetPostgresPool,
    getRedisClient: mockGetRedisClient,
}));
globals_1.jest.unstable_mockModule('../../middleware/auth.js', () => ({
    ensureAuthenticated: (req, _res, next) => {
        req.user = currentUser;
        return next();
    },
}));
globals_1.jest.unstable_mockModule('../../middleware/abac.js', () => ({
    ensurePolicy: mockEnsurePolicy,
}));
globals_1.jest.unstable_mockModule('../../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: mockAppendEntry,
    },
}));
globals_1.jest.unstable_mockModule('../../repos/ProvenanceRepo.js', () => ({
    ProvenanceRepo: globals_1.jest.fn().mockImplementation(() => ({
        by: mockRepoBy,
    })),
}));
// Dynamic imports AFTER mocks are set up
const tenantsRouter = (await Promise.resolve().then(() => __importStar(require('../tenants.js')))).default;
const { ProvenanceRepo } = await Promise.resolve().then(() => __importStar(require('../../repos/ProvenanceRepo.js')));
const database = await Promise.resolve().then(() => __importStar(require('../../config/database.js')));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('tenants routes', () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api/tenants', tenantsRouter);
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        ProvenanceRepo.mockImplementation(() => ({
            by: mockRepoBy,
        }));
        mockGetPostgresPool.mockReturnValue({
            connect: globals_1.jest.fn().mockResolvedValue({
                query: globals_1.jest.fn().mockResolvedValue({ rows: [{ id: 'event-1' }] }),
                release: globals_1.jest.fn(),
            }),
        });
        mockGetRedisClient.mockReturnValue(null);
        currentUser = { id: 'user-1', role: 'admin', tenantId: 'tenant-1' };
        mockGetTenantSettings.mockResolvedValue({
            id: 'tenant-1',
            settings: { theme: 'light' },
            config: {},
            status: 'active',
        });
        mockUpdateSettings.mockResolvedValue({
            id: 'tenant-1',
            settings: { theme: 'dark' },
            config: {},
            status: 'active',
        });
        mockDisableTenant.mockResolvedValue({
            id: 'tenant-1',
            status: 'disabled',
            config: {},
            settings: {},
        });
        mockCreateTenant.mockResolvedValue({
            id: 'tenant-1',
            name: 'Acme',
            slug: 'acme',
            residency: 'US',
        });
        mockGetTenantUsage.mockResolvedValue({
            tenantId: 'tenant-1',
            range: { key: '7d', start: '2024-01-01T00:00:00.000Z', end: '2024-01-08T00:00:00.000Z' },
            totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }],
            breakdown: {
                byWorkflow: [{ workflow: 'ingest', totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }] }],
                byEnvironment: [{ environment: 'prod', totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }] }],
                byWorkflowEnvironment: [
                    {
                        workflow: 'ingest',
                        environment: 'prod',
                        totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }],
                    },
                ],
            },
        });
        mockRepoBy.mockResolvedValue([{ id: 'event-1' }]);
    });
    (0, globals_1.it)('returns settings with receipt', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/tenants/tenant-1/settings');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.success).toBe(true);
        (0, globals_1.expect)(res.body.receipt).toBeDefined();
        (0, globals_1.expect)(mockGetTenantSettings).toHaveBeenCalledWith('tenant-1');
    });
    (0, globals_1.it)('updates settings and issues receipt', async () => {
        const res = await (0, supertest_1.default)(app)
            .put('/api/tenants/tenant-1/settings')
            .send({ settings: { theme: 'dark' } });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.data.settings.theme).toBe('dark');
        (0, globals_1.expect)(res.body.receipt.action).toBe('TENANT_SETTINGS_UPDATED');
        (0, globals_1.expect)(mockUpdateSettings).toHaveBeenCalledWith('tenant-1', { theme: 'dark' }, 'user-1');
    });
    (0, globals_1.it)('disables tenant with receipt', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/tenants/tenant-1/disable')
            .send({ reason: 'test' });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.data.status).toBe('disabled');
        (0, globals_1.expect)(res.body.receipt.action).toBe('TENANT_DISABLED');
    });
    (0, globals_1.it)('blocks cross-tenant access', async () => {
        currentUser = { id: 'user-2', role: 'user', tenantId: 'other-tenant' };
        const res = await (0, supertest_1.default)(app).get('/api/tenants/tenant-1/settings');
        (0, globals_1.expect)(res.status).toBe(403);
    });
    (0, globals_1.it)('returns audit list with receipt', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/tenants/tenant-1/audit?limit=1&offset=0');
        (0, globals_1.expect)(mockRepoBy).toHaveBeenCalled();
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.data).toEqual([{ id: 'event-1' }]);
        (0, globals_1.expect)(res.body.receipt.action).toBe('TENANT_AUDIT_VIEWED');
    });
    (0, globals_1.it)('returns usage summary with breakdowns', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/tenants/tenant-1/usage?range=7d');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.success).toBe(true);
        (0, globals_1.expect)(res.body.data).toMatchObject({
            tenantId: 'tenant-1',
            totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }],
        });
        (0, globals_1.expect)(res.body.data.breakdown.byWorkflow[0]).toMatchObject({ workflow: 'ingest' });
        (0, globals_1.expect)(res.body.data.breakdown.byEnvironment[0]).toMatchObject({ environment: 'prod' });
        (0, globals_1.expect)(mockGetTenantUsage).toHaveBeenCalledWith('tenant-1', '7d');
    });
});

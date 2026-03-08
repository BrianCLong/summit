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
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;
const mockListPlugins = globals_1.jest.fn(() => Promise.resolve({ data: [], pageInfo: { total: 0 } }));
globals_1.jest.unstable_mockModule('../../middleware/auth.js', () => ({
    ensureAuthenticated: (req, _res, next) => {
        const tenantId = req.headers['x-tenant-id'];
        req.user = {
            id: req.headers['x-user-id'] || 'user-123',
            tenantId,
            tenant_id: tenantId,
            role: req.headers['x-user-role'] || 'admin',
        };
        next();
    },
}));
globals_1.jest.unstable_mockModule('../../services/AuthorizationService.js', () => ({
    AuthorizationServiceImpl: globals_1.jest.fn().mockImplementation(() => ({
        assertCan: globals_1.jest.fn(() => Promise.resolve()),
    })),
}));
globals_1.jest.unstable_mockModule('../../plugins/PluginRegistry.js', () => ({
    __esModule: true,
    PluginRegistry: globals_1.jest.fn().mockImplementation((_opts, _logger, moduleMocks) => ({
        listPlugins: moduleMocks?.listPlugins || mockListPlugins,
        getPlugin: globals_1.jest.fn(() => Promise.resolve({ data: {} })),
        getTenantConfig: globals_1.jest.fn(),
        saveTenantConfig: globals_1.jest.fn(),
    })),
}));
globals_1.jest.unstable_mockModule('../../plugins/PluginManager.js', () => ({
    PluginManager: globals_1.jest.fn().mockImplementation(() => ({
        enablePlugin: globals_1.jest.fn(),
        disablePlugin: globals_1.jest.fn(),
        executeAction: globals_1.jest.fn(),
        getHealthStatus: globals_1.jest.fn(),
        uninstallPlugin: globals_1.jest.fn(),
    })),
}));
globals_1.jest.unstable_mockModule('../../controllers/OpaController.js', () => ({
    OpaController: {
        getPolicies: globals_1.jest.fn((req, res) => res.json({ policies: [] })),
        getPolicyContent: globals_1.jest.fn((req, res) => res.json({ name: req.params.filename })),
        evaluatePolicy: globals_1.jest.fn((req, res) => res.json({
            decision: 'allow',
            input: req.body,
        })),
        validatePolicy: globals_1.jest.fn((req, res) => res.json({ valid: true })),
    },
}));
globals_1.jest.unstable_mockModule('../../services/IngestService.js', () => ({
    IngestService: globals_1.jest.fn().mockImplementation(() => ({
        ingest: globals_1.jest.fn(() => Promise.resolve({
            success: true,
            provenanceId: 'prov-1',
            entitiesCreated: 1,
            entitiesUpdated: 0,
            relationshipsCreated: 0,
            relationshipsUpdated: 0,
            errors: [],
        })),
    })),
}));
globals_1.jest.unstable_mockModule('../../services/opa-client.js', () => ({
    verifyTenantAccess: globals_1.jest.fn(() => Promise.resolve()),
}));
globals_1.jest.unstable_mockModule('../../tenancy/TenantIsolationGuard.js', () => ({
    tenantIsolationGuard: {
        evaluatePolicy: globals_1.jest.fn().mockReturnValue({ allowed: true }),
        enforceIngestionCap: globals_1.jest.fn(() => Promise.resolve({ allowed: true, limit: 100, reset: Date.now() + 1000 })),
        enforceStorageQuota: globals_1.jest.fn(() => Promise.resolve({ allowed: true })),
    },
}));
let ingestRouter;
let pluginAdminRouter;
let opaRoutes;
beforeAll(async () => {
    ({ ingestRouter } = await Promise.resolve().then(() => __importStar(require('../ingest.js'))));
    ({ default: pluginAdminRouter } = await Promise.resolve().then(() => __importStar(require('../plugins/plugin-admin.js'))));
    ({ opaRoutes } = await Promise.resolve().then(() => __importStar(require('../opa.js'))));
});
const buildIngestApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((req, _res, next) => {
        req.user = {
            id: 'ingest-user',
            tenantId: req.headers['x-tenant-id'],
        };
        next();
    });
    app.use(ingestRouter);
    return app;
};
const buildPluginApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/plugins', pluginAdminRouter);
    return app;
};
const buildOpaApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/opa', opaRoutes);
    return app;
};
describeIf('tenant context enforcement', () => {
    const validIngestPayload = {
        tenantId: 'body-tenant',
        sourceType: 'test',
        sourceId: 'source-1',
        entities: [{ kind: 'node', labels: [], properties: {} }],
        relationships: [],
    };
    it('rejects ingest requests without tenant context', async () => {
        const response = await (0, supertest_1.default)(buildIngestApp())
            .post('/api/v1/ingest')
            .send(validIngestPayload);
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('TENANT_CONTEXT_REQUIRED');
    });
    it('allows ingest when tenant context is present', async () => {
        const response = await (0, supertest_1.default)(buildIngestApp())
            .post('/api/v1/ingest')
            .set('x-tenant-id', 'tenant-123')
            .send(validIngestPayload);
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
    it('rejects plugin reads without tenant context', async () => {
        const response = await (0, supertest_1.default)(buildPluginApp()).get('/plugins');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('TENANT_CONTEXT_REQUIRED');
    });
    it('allows plugin reads with tenant context', async () => {
        const response = await (0, supertest_1.default)(buildPluginApp())
            .get('/plugins')
            .set('x-tenant-id', 'tenant-123');
        expect(response.status).toBe(200);
        expect(mockListPlugins).toHaveBeenCalled();
    });
    it('rejects policy evaluation without tenant context', async () => {
        const response = await (0, supertest_1.default)(buildOpaApp())
            .post('/opa/evaluate')
            .send({ policy: 'package test' });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('TENANT_CONTEXT_REQUIRED');
    });
    it('allows policy evaluation with tenant context', async () => {
        const response = await (0, supertest_1.default)(buildOpaApp())
            .post('/opa/evaluate')
            .set('x-tenant-id', 'tenant-123')
            .send({ policy: 'package test' });
        expect(response.status).toBe(200);
        expect(response.body.decision).toBe('allow');
    });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
const export_js_1 = __importDefault(require("../../src/routes/export.js"));
const describeNetwork = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
const mockBy = globals_1.jest.fn();
globals_1.jest.mock('../../src/db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({})),
}));
globals_1.jest.mock('../../src/repos/ProvenanceRepo.js', () => ({
    ProvenanceRepo: globals_1.jest.fn().mockImplementation(() => ({
        by: mockBy,
    })),
}));
function sign(params, secret) {
    const base = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&');
    // @ts-ignore
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(base).digest('hex');
}
describeNetwork('provenance export signing and redaction', () => {
    const secret = 'unit-export-secret';
    const baseParams = {
        scope: 'investigation',
        id: 'inv-tenant',
        format: 'json',
        ts: String(Date.now()),
        tenant: 'tenant-1',
        reasonCodeIn: '',
    };
    let app;
    (0, globals_1.beforeEach)(() => {
        mockBy.mockReset();
        process.env.EXPORT_SIGNING_SECRET = secret;
        const newApp = (0, express_1.default)();
        newApp.use('/export', export_js_1.default);
        app = newApp;
    });
    (0, globals_1.test)('rejects tampered parameters even with previously valid signature', async () => {
        const params = {
            ...baseParams,
            ts: String(Date.now()),
        };
        const sig = sign(params, secret);
        const res = await (0, supertest_1.default)(app)
            .get('/export/provenance')
            .set('x-tenant-id', params.tenant)
            .query({ ...params, contains: 'exfil', sig });
        (0, globals_1.expect)(res.status).toBe(403);
    });
    (0, globals_1.test)('filters out foreign-tenant rows and redacts identifiers', async () => {
        const params = {
            ...baseParams,
            ts: String(Date.now()),
        };
        const sig = sign(params, secret);
        const now = new Date().toISOString();
        mockBy.mockResolvedValue([
            {
                id: 'foreign',
                kind: 'policy',
                createdAt: now,
                tenantId: 'tenant-2',
                metadata: {
                    tenantId: 'tenant-2',
                    relatedTenant: 'tenant-2',
                    nested: { tenant: 'tenant-2' },
                },
            },
            {
                id: 'home',
                kind: 'policy',
                createdAt: now,
                tenantId: 'tenant-1',
                metadata: {
                    tenantId: 'tenant-1',
                    relatedTenant: 'tenant-1',
                    nested: { tenant: 'tenant-2' },
                },
            },
        ]);
        const res = await (0, supertest_1.default)(app)
            .get('/export/provenance')
            .set('x-tenant-id', params.tenant)
            .query({ ...params, sig });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(mockBy).toHaveBeenCalledWith('investigation', params.id, globals_1.expect.any(Object), globals_1.expect.any(Number), globals_1.expect.any(Number), params.tenant);
        (0, globals_1.expect)(res.body.count).toBe(1);
        (0, globals_1.expect)(res.body.data[0].id).toBe('home');
        (0, globals_1.expect)(res.body.data[0].metadata.tenantId).toBe(params.tenant);
        (0, globals_1.expect)(res.body.data[0].metadata.nested.tenant).toBe('[redacted:foreign-tenant]');
    });
});

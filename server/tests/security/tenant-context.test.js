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
let tenantMiddleware;
(0, globals_1.beforeAll)(async () => {
    globals_1.jest.unstable_mockModule('../../src/services/RateLimiter.js', () => ({
        rateLimiter: {
            checkLimit: async () => ({
                allowed: true,
                total: 1,
                remaining: 1,
                reset: Date.now(),
            }),
        },
    }));
    const tenantIsolationGuardMock = {
        assertTenantContext: globals_1.jest.fn(),
        evaluatePolicy: globals_1.jest.fn(() => ({ allowed: true })),
    };
    globals_1.jest.unstable_mockModule('../../src/tenancy/TenantIsolationGuard.js', () => ({
        tenantIsolationGuard: tenantIsolationGuardMock,
    }));
    globals_1.jest.unstable_mockModule('../../src/tenancy/TenantIsolationGuard', () => ({
        tenantIsolationGuard: tenantIsolationGuardMock,
    }));
    globals_1.jest.unstable_mockModule('../../src/monitoring/metrics.js', () => ({
        register: {
            registerMetric: () => undefined,
        },
    }));
    const tenantModule = await Promise.resolve().then(() => __importStar(require('../../src/middleware/tenant.js')));
    tenantMiddleware = tenantModule.default;
});
const buildRes = () => {
    const res = {};
    res.status = globals_1.jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = globals_1.jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    res.setHeader = globals_1.jest.fn();
    return res;
};
(0, globals_1.describe)('tenant middleware', () => {
    (0, globals_1.it)('rejects requests without tenant context when strict', async () => {
        const req = {
            headers: {},
            method: 'GET',
            baseUrl: '',
            path: '/protected',
        };
        const res = buildRes();
        const next = globals_1.jest.fn();
        tenantMiddleware()(req, res, next);
        (0, globals_1.expect)(res.statusCode).toBe(400);
        (0, globals_1.expect)(res.body.error).toBe('tenant_required');
    });
    (0, globals_1.it)('attaches tenant context when header and auth are present', async () => {
        const req = {
            headers: {
                'x-tenant-id': 'tenant-abc',
            },
            method: 'GET',
            baseUrl: '',
            path: '/protected',
            user: {
                id: 'user-123',
                roles: ['analyst'],
            },
        };
        const res = buildRes();
        const next = globals_1.jest.fn();
        tenantMiddleware()(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(req.tenant).toEqual(globals_1.expect.objectContaining({
            tenantId: 'tenant-abc',
            roles: ['analyst'],
            subject: 'user-123',
        }));
    });
});

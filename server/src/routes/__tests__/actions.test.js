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
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const nock_1 = __importDefault(require("nock"));
// Mock functions declared before mocks
const mockGetPostgresPool = globals_1.jest.fn();
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../db/postgres.js', () => ({
    getPostgresPool: mockGetPostgresPool,
}));
globals_1.jest.unstable_mockModule('../../middleware/auth.js', () => ({
    ensureAuthenticated: (_req, _res, next) => next(),
}));
// Dynamic imports AFTER mocks are set up
const { actionsRouter } = await Promise.resolve().then(() => __importStar(require('../actions.js')));
const { calculateRequestHash } = await Promise.resolve().then(() => __importStar(require('../../services/ActionPolicyService.js')));
const buildApp = () => {
    const app = (0, express_1.default)();
    app.use((req, _res, next) => {
        // Inject a deterministic correlation ID for assertions.
        req.correlationId = 'corr-test';
        // Provide an authenticated user.
        req.user = {
            id: 'user-1',
            role: 'ADMIN',
            tenantId: 'tenant-1',
        };
        next();
    });
    app.use('/api/actions', actionsRouter);
    return app;
};
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('actions router', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        nock_1.default.cleanAll();
    });
    (0, globals_1.it)('approves preflight when dual-control obligations are satisfied', async () => {
        const query = globals_1.jest.fn().mockResolvedValue({ rows: [] });
        mockGetPostgresPool.mockReturnValue({ query });
        (0, nock_1.default)('http://localhost:8181')
            .post('/v1/data/actions/decision')
            .reply(200, {
            result: {
                allow: true,
                reason: 'dual_control_satisfied',
                obligations: [{ type: 'dual_control', satisfied: true }],
                expires_at: '2099-01-01T00:00:00Z',
            },
        });
        const app = buildApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/actions/preflight')
            .send({
            action: 'EXPORT_CASE',
            approvers: ['approver-a', 'approver-b'],
            payload: { id: 'case-1' },
        });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.decision.obligations[0].satisfied).toBe(true);
        (0, globals_1.expect)(res.body.preflight_id).toBeDefined();
        (0, globals_1.expect)(query).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('denies preflight when approvers overlap and dual-control is unmet', async () => {
        const query = globals_1.jest.fn().mockResolvedValue({ rows: [] });
        mockGetPostgresPool.mockReturnValue({ query });
        (0, nock_1.default)('http://localhost:8181')
            .post('/v1/data/actions/decision')
            .reply(200, {
            result: {
                allow: false,
                reason: 'dual_control_required',
                obligations: [{ type: 'dual_control', satisfied: false }],
            },
        });
        const app = buildApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/actions/preflight')
            .send({
            action: 'DELETE_CASE',
            approvers: ['approver-a', 'approver-a'],
        });
        (0, globals_1.expect)(res.status).toBe(403);
        (0, globals_1.expect)(res.body.decision.allow).toBe(false);
        (0, globals_1.expect)(query).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('enforces preflight hash and expiry before executing', async () => {
        const query = globals_1.jest.fn();
        const preflightRequest = {
            action: 'ROTATE_KEYS',
            actor: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' },
            payload: { scope: 'tenant' },
            approvers: ['approver-a', 'approver-b'],
        };
        const requestHash = calculateRequestHash(preflightRequest);
        query.mockResolvedValueOnce({
            rows: [
                {
                    decision_id: 'pf-123',
                    policy_name: 'actions',
                    decision: 'ALLOW',
                    resource_id: requestHash,
                    reason: JSON.stringify({
                        reason: 'dual_control_satisfied',
                        obligations: [{ type: 'dual_control', satisfied: true }],
                        requestHash,
                        expiresAt: '2099-01-01T00:00:00Z',
                    }),
                },
            ],
        });
        mockGetPostgresPool.mockReturnValue({ query });
        const app = buildApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/actions/execute')
            .send({
            preflight_id: 'pf-123',
            action: 'ROTATE_KEYS',
            payload: { scope: 'tenant' },
            approvers: ['approver-a', 'approver-b'],
        });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.request_hash).toBe(requestHash);
    });
    (0, globals_1.it)('rejects execution when the preflight window has expired', async () => {
        const preflightRequest = {
            action: 'EXPORT_CASE',
            actor: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' },
        };
        const requestHash = calculateRequestHash(preflightRequest);
        const query = globals_1.jest.fn().mockResolvedValue({
            rows: [
                {
                    decision_id: 'pf-expired',
                    policy_name: 'actions',
                    decision: 'ALLOW',
                    resource_id: requestHash,
                    reason: JSON.stringify({
                        reason: 'dual_control_satisfied',
                        obligations: [{ type: 'dual_control', satisfied: true }],
                        requestHash,
                        expiresAt: '2000-01-01T00:00:00Z',
                    }),
                },
            ],
        });
        mockGetPostgresPool.mockReturnValue({ query });
        const app = buildApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/actions/execute')
            .send({
            preflight_id: 'pf-expired',
            action: 'EXPORT_CASE',
        });
        (0, globals_1.expect)(res.status).toBe(410);
        (0, globals_1.expect)(res.body.error).toMatch(/expired/);
    });
    (0, globals_1.it)('rejects execution when the request hash differs from the preflight record', async () => {
        const query = globals_1.jest.fn().mockResolvedValue({
            rows: [
                {
                    decision_id: 'pf-hash',
                    policy_name: 'actions',
                    decision: 'ALLOW',
                    resource_id: 'expected-hash',
                    reason: JSON.stringify({
                        reason: 'dual_control_satisfied',
                        obligations: [{ type: 'dual_control', satisfied: true }],
                        requestHash: 'expected-hash',
                        expiresAt: '2099-01-01T00:00:00Z',
                    }),
                },
            ],
        });
        mockGetPostgresPool.mockReturnValue({ query });
        const app = buildApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/actions/execute')
            .send({
            preflight_id: 'pf-hash',
            action: 'EXPORT_CASE',
            payload: { scope: 'different' },
        });
        (0, globals_1.expect)(res.status).toBe(409);
        (0, globals_1.expect)(res.body.error).toMatch(/hash/);
    });
});

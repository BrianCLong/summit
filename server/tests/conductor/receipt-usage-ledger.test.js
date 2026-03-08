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
const usage_ledger_js_1 = require("../../src/usage/usage-ledger.js");
const describeNetwork = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
const mockQuery = globals_1.jest.fn();
globals_1.jest.mock('../../src/db/postgres.js', () => ({
    getPostgresPool: () => ({
        query: mockQuery,
    }),
}));
globals_1.jest.mock('../../src/maestro/evidence/receipt.js', () => ({
    buildProvenanceReceipt: globals_1.jest.fn(() => ({ receipt: true })),
    canonicalStringify: globals_1.jest.fn((value) => JSON.stringify(value)),
    EvidenceArtifactRow: {},
    RunEventRow: {},
    RunRow: {},
}));
globals_1.jest.mock('../../src/conductor/auth/rbac-middleware.js', () => ({
    requirePermission: () => (_req, _res, next) => next(),
}));
describeNetwork('receipt usage ledger', () => {
    (0, globals_1.beforeEach)(() => {
        usage_ledger_js_1.usageLedger.clear();
        mockQuery.mockReset();
    });
    const buildApp = async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        const { evidenceRoutes } = await Promise.resolve().then(() => __importStar(require('../../src/conductor/api/evidence-routes.js')));
        app.use('/api', evidenceRoutes);
        return app;
    };
    (0, globals_1.it)('records usage on successful receipt ingestion', async () => {
        mockQuery.mockImplementation((sql, params = []) => {
            const text = typeof sql === 'string' ? sql : sql?.text || '';
            if (text.includes('FROM run WHERE')) {
                return {
                    rows: [
                        {
                            id: params?.[0] || 'run-123',
                            runbook: 'rb',
                            status: 'complete',
                            started_at: new Date(),
                            ended_at: new Date(),
                        },
                    ],
                };
            }
            if (text.includes('FROM run_event')) {
                return { rows: [] };
            }
            if (text.includes('FROM evidence_artifacts')) {
                return { rows: [] };
            }
            return { rows: [], rowCount: 1 };
        });
        const app = await buildApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/receipt')
            .send({ runId: 'run-123', note: 'ignore' });
        (0, globals_1.expect)(res.status).toBe(200);
        const records = usage_ledger_js_1.usageLedger.getRecords();
        (0, globals_1.expect)(records).toHaveLength(1);
        (0, globals_1.expect)(records[0]).toMatchObject({
            operationName: 'conductor.receipt.create',
            success: true,
            statusCode: 200,
        });
        (0, globals_1.expect)(records[0].requestSizeBytes).toBeGreaterThan(0);
        (0, globals_1.expect)(records[0].tenantId).toBeUndefined();
        (0, globals_1.expect)(records[0].userId).toBeUndefined();
    });
    (0, globals_1.it)('records usage on validation failure without leaking payload', async () => {
        const app = await buildApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/receipt')
            .send({ secret: 'dont log' });
        (0, globals_1.expect)(res.status).toBe(400);
        const records = usage_ledger_js_1.usageLedger.getRecords();
        (0, globals_1.expect)(records).toHaveLength(1);
        const record = records[0];
        (0, globals_1.expect)(record.success).toBe(false);
        (0, globals_1.expect)(record.errorCategory).toBe('validation');
        (0, globals_1.expect)(record.statusCode).toBe(400);
        (0, globals_1.expect)(record.requestSizeBytes).toBeGreaterThan(0);
        (0, globals_1.expect)(JSON.stringify(record)).not.toContain('secret');
    });
});

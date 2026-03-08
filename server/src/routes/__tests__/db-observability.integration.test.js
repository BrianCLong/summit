"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const db_observability_js_1 = require("../db-observability.js");
(0, globals_1.describe)('db observability router', () => {
    const snapshotMock = globals_1.jest.fn().mockResolvedValue({
        takenAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        locks: [],
        slowQueries: { source: 'app_slowlog', entries: [] },
        explain: {
            plan: { Plan: { 'Node Type': 'Seq Scan' } },
            queryId: 'q1',
            summary: 'Explain ok',
            sql: 'SELECT 1',
            parameters: [],
        },
        summary: {
            locks: 'No blocking locks detected.',
            slowQueries: 'No slow query samples recorded in the application slow log.',
            explain: 'Explain ok',
            overall: 'No blocking locks detected. No slow query samples recorded in the application slow log. Explain ok',
        },
    });
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((req, _res, next) => {
        const role = req.headers['x-role'] || 'admin';
        req.user = { id: 'user-1', role, tenantId: 'tenant-1' };
        next();
    });
    app.use('/api/admin/db-observability', (0, db_observability_js_1.buildDbObservabilityRouter)({ snapshot: snapshotMock }));
    (0, globals_1.it)('rejects non-admin users', async () => {
        await (0, supertest_1.default)(app)
            .post('/api/admin/db-observability/snapshot')
            .set('x-role', 'analyst')
            .send({})
            .expect(403);
    });
    (0, globals_1.it)('returns snapshot data for admins', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/api/admin/db-observability/snapshot')
            .send({ explain: { queryId: 'q1' } })
            .expect(200);
        (0, globals_1.expect)(response.body.data.summary.explain).toBe('Explain ok');
        (0, globals_1.expect)(snapshotMock).toHaveBeenCalled();
        (0, globals_1.expect)(response.headers['x-dbobservability-limit']).toBeDefined();
    });
});

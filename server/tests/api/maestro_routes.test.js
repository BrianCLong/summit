"use strict";
// server/tests/api/maestro_routes.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const maestro_routes_js_1 = require("../../src/routes/maestro_routes.js");
const logger_js_1 = require("../../src/utils/logger.js");
const opa_integration_js_1 = require("../../src/conductor/governance/opa-integration.js");
globals_1.jest.mock('../../src/conductor/governance/opa-integration.js', () => ({
    opaPolicyEngine: {
        evaluatePolicy: globals_1.jest.fn().mockResolvedValue({ allow: true, reason: 'allowed' }),
    },
}));
globals_1.jest.mock('../../src/middleware/correlation-id', () => ({
    getCorrelationContext: () => ({
        correlationId: 'corr-id',
        traceId: 'trace-id',
        spanId: 'span-id',
        userId: 'user-ctx',
        tenantId: 'tenant-ctx',
    }),
}));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('Maestro API routes', () => {
    const maestroRunPipeline = globals_1.jest.fn();
    const queriesGetRunResponse = globals_1.jest.fn();
    const queriesGetTaskWithArtifacts = globals_1.jest.fn();
    const opaAllow = { evaluateQuery: globals_1.jest.fn() };
    const createApp = () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((req, _res, next) => {
            req.correlationId = 'corr-id';
            req.traceId = 'trace-id';
            req.user = { id: 'user-1', tenantId: 'tenant-1', role: 'user' };
            next();
        });
        const maestro = {
            runPipeline: maestroRunPipeline,
        };
        const queries = {
            getRunResponse: queriesGetRunResponse,
            getTaskWithArtifacts: queriesGetTaskWithArtifacts,
        };
        app.use('/api/maestro', (0, maestro_routes_js_1.buildMaestroRouter)(maestro, queries, opaAllow));
        return app;
    };
    (0, globals_1.beforeEach)(() => {
        maestroRunPipeline.mockReset();
        queriesGetRunResponse.mockReset();
        queriesGetTaskWithArtifacts.mockReset();
        opaAllow.evaluateQuery.mockResolvedValue({ allow: true, reason: 'allowed' });
        opa_integration_js_1.opaPolicyEngine.evaluatePolicy.mockResolvedValue({ allow: true, reason: 'allowed' });
        globals_1.jest.spyOn(logger_js_1.logger, 'info').mockClear?.();
    });
    (0, globals_1.it)('POST /api/maestro/runs returns pipeline result', async () => {
        maestroRunPipeline.mockResolvedValueOnce({
            run: { id: 'run-1', user: { id: 'user-1' }, createdAt: new Date().toISOString(), requestText: 'hello' },
            tasks: [],
            results: [],
            costSummary: {
                runId: 'run-1',
                totalCostUSD: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                byModel: {},
            },
        });
        const app = createApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/maestro/runs')
            .send({ userId: 'user-1', requestText: 'hello' })
            .expect(200);
        (0, globals_1.expect)(res.body.run.id).toBe('run-1');
        (0, globals_1.expect)(maestroRunPipeline).toHaveBeenCalledWith('user-1', 'hello');
    });
    (0, globals_1.it)('GET /api/maestro/runs/:runId returns run response', async () => {
        queriesGetRunResponse.mockResolvedValueOnce({
            run: { id: 'run-1', user: { id: 'user-1' }, createdAt: new Date().toISOString(), requestText: 'hello' },
            tasks: [],
            results: [],
            costSummary: {
                runId: 'run-1',
                totalCostUSD: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                byModel: {},
            },
        });
        const app = createApp();
        const res = await (0, supertest_1.default)(app)
            .get('/api/maestro/runs/run-1')
            .expect(200);
        (0, globals_1.expect)(res.body.run.id).toBe('run-1');
        (0, globals_1.expect)(queriesGetRunResponse).toHaveBeenCalledWith('run-1');
    });
    (0, globals_1.it)('GET /api/maestro/runs/:runId returns 404 if not found', async () => {
        queriesGetRunResponse.mockResolvedValueOnce(null);
        const app = createApp();
        const res = await (0, supertest_1.default)(app)
            .get('/api/maestro/runs/missing')
            .expect(404);
        (0, globals_1.expect)(res.body.error).toMatch(/not found/i);
    });
    (0, globals_1.it)('evaluates OPA before creating runs and logs decision context', async () => {
        const app = createApp();
        const logSpy = globals_1.jest.spyOn(logger_js_1.logger, 'info').mockImplementation(() => undefined);
        maestroRunPipeline.mockResolvedValueOnce({
            run: { id: 'run-1', user: { id: 'user-1' }, createdAt: new Date().toISOString(), requestText: 'hello maestro' },
            tasks: [],
            results: [],
            costSummary: {
                runId: 'run-1',
                totalCostUSD: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                byModel: {},
            },
        });
        const response = await (0, supertest_1.default)(app)
            .post('/api/maestro/runs')
            .set('x-tenant-id', 'tenant-1')
            .send({ userId: 'user-1', requestText: 'hello maestro' })
            .expect(200);
        (0, globals_1.expect)(response.body.run.id).toBe('run-1');
        (0, globals_1.expect)(opa_integration_js_1.opaPolicyEngine.evaluatePolicy).toHaveBeenCalledWith('maestro/authz', globals_1.expect.objectContaining({
            action: 'start_run',
            tenantId: 'tenant-1',
            userId: 'user-1',
        }));
        logSpy.mockRestore();
    });
    (0, globals_1.it)('blocks run creation when OPA denies access', async () => {
        opa_integration_js_1.opaPolicyEngine.evaluatePolicy.mockResolvedValueOnce({ allow: false, reason: 'blocked' });
        const app = createApp();
        const res = await (0, supertest_1.default)(app)
            .post('/api/maestro/runs')
            .send({ userId: 'user-2', requestText: 'nope' })
            .expect(403);
        (0, globals_1.expect)(res.body.error).toEqual('Forbidden');
        (0, globals_1.expect)(res.body.reason).toEqual('blocked');
        (0, globals_1.expect)(maestroRunPipeline).not.toHaveBeenCalled();
    });
});

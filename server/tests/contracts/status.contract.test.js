"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const fast_check_1 = __importDefault(require("fast-check"));
const status_js_1 = require("../../src/http/status.js");
const mockGetConductorHealth = globals_1.jest.fn(async () => ({ status: 'healthy', checks: { queue: 'ok' } }));
const mockBudgetStatus = globals_1.jest.fn(async () => ({ status: 'healthy', remaining: 100 }));
const mockCreateBudgetController = globals_1.jest.fn(() => ({ getBudgetStatus: mockBudgetStatus }));
globals_1.jest.mock('../../src/conductor/metrics/index.js', () => ({
    getConductorHealth: () => mockGetConductorHealth(),
}));
globals_1.jest.mock('../../src/conductor/admission/budget-control.js', () => ({
    createBudgetController: () => mockCreateBudgetController(),
}));
globals_1.jest.mock('ioredis', () => {
    return globals_1.jest.fn().mockImplementation(() => ({ disconnect: globals_1.jest.fn() }));
});
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;
describeIf('statusRouter contract', () => {
    const allowedServices = [
        'neo4j',
        'postgres',
        'redis',
        'mcp-graphops',
        'mcp-files',
        'opa',
    ];
    const originalConductorFlag = process.env.CONDUCTOR_ENABLED;
    const makeApp = () => {
        const app = (0, express_1.default)();
        app.use(status_js_1.statusRouter);
        return app;
    };
    beforeEach(() => {
        process.env.CONDUCTOR_ENABLED = 'true';
        mockGetConductorHealth.mockResolvedValue({ status: 'healthy', checks: { queue: 'ok' } });
        mockBudgetStatus.mockResolvedValue({ status: 'healthy', remaining: 100 });
        mockCreateBudgetController.mockReturnValue({ getBudgetStatus: mockBudgetStatus });
        const mockHeaders = {
            get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
        };
        const fetchMock = globals_1.jest.fn(async () => ({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: mockHeaders,
            json: async () => ({ status: 'ok' }),
        }));
        global.fetch = fetchMock;
    });
    afterEach(() => {
        globals_1.jest.clearAllMocks();
        process.env.CONDUCTOR_ENABLED = originalConductorFlag;
    });
    it('exposes a stable contract for /status', async () => {
        const response = await (0, supertest_1.default)(makeApp()).get('/status').expect(200);
        expect(response.headers['x-conductor-status']).toBeDefined();
        expect(response.body).toMatchObject({
            host: expect.any(String),
            overall_status: 'healthy',
            conductor: expect.objectContaining({ enabled: true }),
            services: expect.any(Array),
        });
        expect(response.body.services).toHaveLength(allowedServices.length);
        response.body.services.forEach((service) => {
            expect(service).toMatchObject({
                name: expect.any(String),
                status: expect.stringMatching(/healthy|degraded|unhealthy/),
                last_check: expect.any(String),
            });
        });
        expect(response.body.versions).toHaveProperty('server');
        expect(global.fetch.mock.calls).toHaveLength(allowedServices.length);
    });
    it('rejects unknown service probes without hitting the network', async () => {
        const app = makeApp();
        const serviceSet = new Set(allowedServices);
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.stringMatching(/^[a-z0-9]{1,12}$/).filter((name) => !serviceSet.has(name)), async (service) => {
            const response = await (0, supertest_1.default)(app).get(`/health/${service}`).expect(404);
            expect(response.body.available_services.sort()).toEqual(Array.from(serviceSet).sort());
            expect(global.fetch.mock.calls.length).toBe(0);
        }), { numRuns: 25, endOnFailure: true });
    });
});

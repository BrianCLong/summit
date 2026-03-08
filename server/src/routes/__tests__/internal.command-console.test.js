"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const command_console_js_1 = __importDefault(require("../internal/command-console.js"));
globals_1.jest.mock('../../services/GAReleaseService', () => ({
    GAReleaseService: globals_1.jest.fn().mockImplementation(() => ({
        getReleaseInfo: globals_1.jest
            .fn()
            .mockResolvedValue({
            buildDate: '2024-01-01T00:00:00.000Z',
            ready: true,
            version: '1.0.0',
            commitHash: 'abc123',
            environment: 'test',
            features: [],
        }),
        validateDeployment: globals_1.jest.fn().mockResolvedValue({
            ready: true,
            validated: true,
            sbomGenerated: true,
            testsPass: true,
            validations: [
                { component: 'package-json', status: 'pass', message: 'ok' },
                { component: 'dependencies', status: 'pass', message: 'ok' },
            ],
        }),
    })),
}));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/internal/command-console', command_console_js_1.default);
const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? globals_1.describe.skip : globals_1.describe;
describeIf('Internal Command Console routes', () => {
    const originalEnv = process.env;
    (0, globals_1.beforeEach)(() => {
        process.env = { ...originalEnv };
        process.env.COMMAND_CONSOLE_ENABLED = 'true';
        process.env.COMMAND_CONSOLE_TOKEN = 'test-token';
    });
    (0, globals_1.afterAll)(() => {
        process.env = originalEnv;
    });
    (0, globals_1.it)('rejects requests without internal token', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/internal/command-console/summary');
        (0, globals_1.expect)(res.status).toBe(403);
    });
    (0, globals_1.it)('returns a snapshot payload for authorized requests', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/api/internal/command-console/summary')
            .set('x-internal-token', 'test-token');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body).toHaveProperty('gaGate');
        (0, globals_1.expect)(res.body).toHaveProperty('ci');
        (0, globals_1.expect)(res.body).toHaveProperty('slo');
        (0, globals_1.expect)(res.body).toHaveProperty('llm');
        (0, globals_1.expect)(res.body).toHaveProperty('dependencyRisk');
        (0, globals_1.expect)(res.body).toHaveProperty('evidence');
        (0, globals_1.expect)(res.body).toHaveProperty('tenants');
        (0, globals_1.expect)(res.body.tenants.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('exposes incidents separately for authorized requests', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/api/internal/command-console/incidents')
            .set('x-internal-token', 'test-token');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body).toHaveProperty('gaGateFailures');
        (0, globals_1.expect)(res.body).toHaveProperty('policyDenials');
        (0, globals_1.expect)(res.body).toHaveProperty('killSwitchActivations');
    });
});

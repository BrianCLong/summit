"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../../governance/opa-integration.js', () => ({
    opaPolicyEngine: {
        evaluatePolicy: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../../config/logger.js', () => {
    const mockLogger = {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        child: globals_1.jest.fn().mockReturnThis(),
    };
    return {
        __esModule: true,
        default: mockLogger,
        logger: mockLogger,
    };
});
globals_1.jest.mock('../../router/policy-explainer', () => ({
    policyExplainer: {
        getPolicyExplanationAPI: globals_1.jest.fn(),
        simulateWhatIfAPI: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../observability/prometheus', () => ({
    prometheusConductorMetrics: {},
}));
const policy_routes_js_1 = require("../policy-routes.js");
const opa_integration_js_1 = require("../../governance/opa-integration.js");
const logger_js_1 = __importDefault(require("../../../config/logger.js"));
const evaluatePolicyMock = opa_integration_js_1.opaPolicyEngine
    .evaluatePolicy;
function buildApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((req, _res, next) => {
        req.user = {
            userId: 'user-123',
            tenantId: 'tenant-abc',
            roles: ['analyst'],
        };
        req.traceId = 'trace-app-trace';
        next();
    });
    app.use(policy_routes_js_1.policyRoutes);
    return app;
}
(0, globals_1.describe)('Maestro routing OPA guard', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        evaluatePolicyMock.mockReset();
    });
    (0, globals_1.it)('allows routing fetch when OPA returns allow and logs decision context', async () => {
        evaluatePolicyMock.mockResolvedValue({
            allow: true,
            reason: 'permitted',
        });
        const app = buildApp();
        const response = await (0, supertest_1.default)(app).get('/runs/run-123/nodes/node-9/routing');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.runId).toBe('run-123');
        (0, globals_1.expect)(evaluatePolicyMock).toHaveBeenCalledWith('maestro/authz', globals_1.expect.objectContaining({
            action: 'read',
            tenantId: 'tenant-abc',
            userId: 'user-123',
            resourceAttributes: { runId: 'run-123', nodeId: 'node-9' },
        }));
        (0, globals_1.expect)(logger_js_1.default.info).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            allow: true,
            traceId: 'trace-app-trace',
            principalId: 'user-123',
            resourceAttributes: { runId: 'run-123', nodeId: 'node-9' },
        }), 'OPA evaluated maestro routing access');
    });
    (0, globals_1.it)('denies routing fetch when OPA blocks access and returns policy context', async () => {
        evaluatePolicyMock.mockResolvedValue({
            allow: false,
            reason: 'blocked by policy',
        });
        const app = buildApp();
        const response = await (0, supertest_1.default)(app).get('/runs/run-999/nodes/node-1/routing');
        (0, globals_1.expect)(response.status).toBe(403);
        (0, globals_1.expect)(response.body).toMatchObject({
            code: 'OPA_DENY',
            reason: 'blocked by policy',
            traceId: 'trace-app-trace',
            resource: 'maestro.routing.decision',
        });
        (0, globals_1.expect)(evaluatePolicyMock).toHaveBeenCalledWith('maestro/authz', globals_1.expect.objectContaining({
            resourceAttributes: { runId: 'run-999', nodeId: 'node-1' },
        }));
        (0, globals_1.expect)(logger_js_1.default.info).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            allow: false,
            traceId: 'trace-app-trace',
            principalId: 'user-123',
            resourceAttributes: { runId: 'run-999', nodeId: 'node-1' },
        }), 'OPA evaluated maestro routing access');
    });
});

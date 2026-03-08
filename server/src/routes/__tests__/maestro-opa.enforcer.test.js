"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const maestro_routes_js_1 = require("../maestro_routes.js");
const logger_js_1 = require("../../utils/logger.js");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('createMaestroOPAEnforcer', () => {
    const buildApp = (evaluateQuery) => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((req, _res, next) => {
            req.user = {
                id: 'user-123',
                role: 'analyst',
                tenant_id: 'tenant-55',
            };
            req.correlationId = 'corr-123';
            req.traceId = 'trace-abc';
            next();
        });
        const enforceRunReadPolicy = (0, maestro_routes_js_1.createMaestroOPAEnforcer)({ evaluateQuery }, 'maestro/authz/allow', {
            action: 'maestro.run.read',
            resourceType: 'maestro/run',
            resolveResourceId: (req) => req.params.runId,
        });
        app.get('/api/maestro/runs/:runId', enforceRunReadPolicy, (_req, res) => {
            res.json({ ok: true });
        });
        return app;
    };
    (0, globals_1.afterEach)(() => {
        globals_1.jest.restoreAllMocks();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('allows requests when OPA approves and logs decision details', async () => {
        const evaluateQuery = globals_1.jest.fn().mockResolvedValue({
            allow: true,
            reason: 'permitted',
        });
        const app = buildApp(evaluateQuery);
        const infoSpy = globals_1.jest.spyOn(logger_js_1.logger, 'info').mockImplementation(() => undefined);
        const warnSpy = globals_1.jest.spyOn(logger_js_1.logger, 'warn').mockImplementation(() => undefined);
        const response = await (0, supertest_1.default)(app).get('/api/maestro/runs/run-789');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(evaluateQuery).toHaveBeenCalledWith('maestro/authz/allow', globals_1.expect.objectContaining({
            action: 'maestro.run.read',
            principal: globals_1.expect.objectContaining({
                id: 'user-123',
                tenantId: 'tenant-55',
            }),
            resource: globals_1.expect.objectContaining({
                type: 'maestro/run',
                id: 'run-789',
                attributes: globals_1.expect.objectContaining({
                    runId: 'run-789',
                    method: 'get',
                    path: '/api/maestro/runs/run-789',
                }),
            }),
            traceId: 'trace-abc',
            correlationId: 'corr-123',
        }));
        (0, globals_1.expect)(warnSpy).not.toHaveBeenCalled();
        (0, globals_1.expect)(infoSpy).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            traceId: 'trace-abc',
            correlationId: 'corr-123',
            principalId: 'user-123',
            principalRole: 'analyst',
            tenantId: 'tenant-55',
            resourceType: 'maestro/run',
            resourceId: 'run-789',
            decision: 'allow',
            allow: true,
            reason: 'permitted',
            resourceAttributes: globals_1.expect.objectContaining({
                runId: 'run-789',
                method: 'get',
                path: '/api/maestro/runs/run-789',
            }),
        }), 'Maestro OPA decision evaluated');
    });
    (0, globals_1.it)('denies requests when OPA blocks access and logs the denial context', async () => {
        const evaluateQuery = globals_1.jest.fn().mockResolvedValue({
            allow: false,
            reason: 'policy_blocked',
        });
        const app = buildApp(evaluateQuery);
        const infoSpy = globals_1.jest.spyOn(logger_js_1.logger, 'info').mockImplementation(() => undefined);
        const warnSpy = globals_1.jest.spyOn(logger_js_1.logger, 'warn').mockImplementation(() => undefined);
        const response = await (0, supertest_1.default)(app).get('/api/maestro/runs/run-789');
        (0, globals_1.expect)(response.status).toBe(403);
        (0, globals_1.expect)(response.body).toEqual({
            error: 'Forbidden',
            reason: 'policy_blocked',
        });
        (0, globals_1.expect)(evaluateQuery).toHaveBeenCalledWith('maestro/authz/allow', globals_1.expect.objectContaining({
            action: 'maestro.run.read',
            resource: globals_1.expect.objectContaining({
                id: 'run-789',
            }),
            traceId: 'trace-abc',
        }));
        (0, globals_1.expect)(infoSpy).not.toHaveBeenCalled();
        (0, globals_1.expect)(warnSpy).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            traceId: 'trace-abc',
            correlationId: 'corr-123',
            principalId: 'user-123',
            principalRole: 'analyst',
            resourceId: 'run-789',
            decision: 'deny',
            allow: false,
            reason: 'policy_blocked',
            resourceAttributes: globals_1.expect.objectContaining({
                runId: 'run-789',
                method: 'get',
                path: '/api/maestro/runs/run-789',
            }),
        }), 'Maestro OPA decision evaluated');
    });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const request_factory_js_1 = require("../../../tests/mocks/request-factory.js");
const maestro_authz_js_1 = require("../maestro-authz.js");
const opa_integration_js_1 = require("../../conductor/governance/opa-integration.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// Mock functions declared before mocks
const mockEvaluatePolicy = globals_1.jest.fn();
const mockLoggerInfo = globals_1.jest.fn();
const mockLoggerWarn = globals_1.jest.fn();
const mockLoggerError = globals_1.jest.fn();
(0, globals_1.describe)('maestroAuthzMiddleware', () => {
    const createRequest = () => {
        const req = (0, request_factory_js_1.requestFactory)({
            method: 'POST',
            path: '/runs/run-123',
            params: { runId: 'run-123' },
            query: { verbose: 'true' },
            body: { foo: 'bar' },
            user: {
                id: 'user-1',
                sub: 'user-1',
                role: 'analyst',
                tenant_id: 'tenant-1',
            },
        });
        req.baseUrl = '/api/maestro';
        req.traceId = 'trace-123';
        req.correlationId = 'corr-123';
        req.context = {
            tenantId: 'tenant-1',
            correlationId: 'corr-123',
            traceId: 'trace-123',
            principal: { id: 'user-1', role: 'analyst' },
        };
        return req;
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        globals_1.jest
            .spyOn(opa_integration_js_1.opaPolicyEngine, 'evaluatePolicy')
            .mockImplementation(mockEvaluatePolicy);
        globals_1.jest.spyOn(logger_js_1.default, 'info').mockImplementation(mockLoggerInfo);
        globals_1.jest.spyOn(logger_js_1.default, 'warn').mockImplementation(mockLoggerWarn);
        globals_1.jest.spyOn(logger_js_1.default, 'error').mockImplementation(mockLoggerError);
    });
    (0, globals_1.it)('allows a request when OPA approves and logs decision metadata', async () => {
        mockEvaluatePolicy.mockResolvedValue({
            allow: true,
            reason: 'allowed',
        });
        const middleware = (0, maestro_authz_js_1.maestroAuthzMiddleware)({ resource: 'runs' });
        const req = createRequest();
        const res = (0, request_factory_js_1.responseFactory)();
        const next = (0, request_factory_js_1.nextFactory)();
        await middleware(req, res, next);
        (0, globals_1.expect)(opa_integration_js_1.opaPolicyEngine.evaluatePolicy).toHaveBeenCalledWith('maestro/authz', globals_1.expect.objectContaining({
            action: 'post',
            resource: 'runs',
            tenantId: 'tenant-1',
            userId: 'user-1',
            role: 'analyst',
        }));
        (0, globals_1.expect)(req.policyDecision).toEqual(globals_1.expect.objectContaining({ allow: true, reason: 'allowed' }));
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(mockLoggerInfo).toHaveBeenCalledWith('Maestro authorization allowed by OPA', globals_1.expect.objectContaining({
            traceId: 'trace-123',
            principalId: 'user-1',
            resource: 'runs',
            decision: 'allow',
            resourceAttributes: globals_1.expect.objectContaining({
                runId: 'run-123',
                foo: 'bar',
                verbose: 'true',
            }),
        }));
    });
    (0, globals_1.it)('denies a request when OPA blocks and records decision context', async () => {
        mockEvaluatePolicy.mockResolvedValue({
            allow: false,
            reason: 'policy block',
            auditLog: { message: 'denied' },
        });
        const middleware = (0, maestro_authz_js_1.maestroAuthzMiddleware)({ resource: 'runs' });
        const req = createRequest();
        const res = (0, request_factory_js_1.responseFactory)();
        const next = (0, request_factory_js_1.nextFactory)();
        await middleware(req, res, next);
        (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
        (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            message: 'policy block',
            auditContext: { message: 'denied' },
        }));
        (0, globals_1.expect)(next).not.toHaveBeenCalled();
        (0, globals_1.expect)(mockLoggerWarn).toHaveBeenCalledWith('Maestro authorization denied by OPA', globals_1.expect.objectContaining({
            traceId: 'trace-123',
            principalId: 'user-1',
            resource: 'runs',
            decision: 'deny',
            reason: 'policy block',
            resourceAttributes: globals_1.expect.objectContaining({
                runId: 'run-123',
                foo: 'bar',
                verbose: 'true',
            }),
        }));
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock dependencies
const mockEvaluate = globals_1.jest.fn();
globals_1.jest.mock('axios');
globals_1.jest.mock('@opentelemetry/api', () => ({
    trace: {
        getTracer: () => ({
            startSpan: () => ({
                setAttributes: globals_1.jest.fn(),
                setStatus: globals_1.jest.fn(),
                recordException: globals_1.jest.fn(),
                end: globals_1.jest.fn(),
            }),
        }),
    },
}));
globals_1.jest.mock('../../src/utils/logger.js', () => ({
    logger: {
        child: () => ({
            debug: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
        }),
        error: globals_1.jest.fn(),
    },
}));
// Import the module under test
const opa_abac_js_1 = require("../../src/middleware/opa-abac.js");
describe('opaAuthzMiddleware', () => {
    let mockReq;
    let mockRes;
    let next;
    let opaClient;
    beforeEach(() => {
        mockEvaluate.mockReset();
        // Create a mock OPAClient that uses our mockEvaluate
        opaClient = new opa_abac_js_1.OPAClient('http://localhost:8181');
        opaClient.evaluate = mockEvaluate;
        mockReq = {
            user: {
                id: 'user-123',
                tenantId: 'tenant-abc',
                roles: ['user'],
                residency: 'US',
                clearance: 'restricted',
            },
            method: 'GET',
            params: { id: 'resource-123' },
            baseUrl: '/api/resource',
            ip: '127.0.0.1',
            headers: {},
            get: globals_1.jest.fn((header) => {
                if (header === 'User-Agent')
                    return 'jest-test';
                return undefined;
            }),
        };
        mockRes = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn(),
        };
        next = globals_1.jest.fn();
    });
    it('should call next() when policy allows', async () => {
        mockEvaluate.mockImplementation(() => Promise.resolve({
            allow: true,
            reason: 'allow',
            obligations: [],
        }));
        const middleware = (0, opa_abac_js_1.opaAuthzMiddleware)(opaClient);
        await middleware(mockReq, mockRes, next);
        expect(next).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        // Verify OPA call structure
        expect(mockEvaluate).toHaveBeenCalledWith('summit.abac.decision', expect.objectContaining({
            subject: expect.objectContaining({ id: 'user-123' }),
            action: 'read'
        }));
    });
    it('should return 403 when policy denies', async () => {
        mockEvaluate.mockImplementation(() => Promise.resolve({
            allow: false,
            reason: 'insufficient_clearance',
            obligations: [],
        }));
        const middleware = (0, opa_abac_js_1.opaAuthzMiddleware)(opaClient);
        await middleware(mockReq, mockRes, next);
        expect(next).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            code: 'FORBIDDEN',
            reason: 'insufficient_clearance'
        }));
    });
    it('should return 401 when step-up is required but missing', async () => {
        // Policy allows but returns step_up obligation because currentAcr is low
        mockEvaluate.mockImplementation(() => Promise.resolve({
            allow: true,
            reason: 'allow',
            obligations: [{ type: 'step_up', mechanism: 'webauthn' }],
        }));
        const middleware = (0, opa_abac_js_1.opaAuthzMiddleware)(opaClient);
        await middleware(mockReq, mockRes, next);
        expect(next).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            code: 'STEP_UP_REQUIRED',
            mechanism: 'webauthn'
        }));
    });
    it('should allow when step-up is required and present', async () => {
        // Note: The middleware logic now checks the header BEFORE calling OPA to determine ACR,
        // OR if OPA returns an obligation, it means ACR was insufficient.
        // If we provide the header, the middleware sets currentAcr = 'loa2'.
        // Then OPA *should* theoretically return no obligation if configured correctly.
        // However, for this unit test, we are mocking OPA response.
        // If we provide the header, and mock OPA to return NO obligation (simulating logic worked), it should pass.
        // Simulate OPA happy path (since we can't run Rego logic here)
        mockEvaluate.mockImplementation(() => Promise.resolve({
            allow: true,
            reason: 'allow',
            obligations: [], // No obligation because we sent high ACR
        }));
        mockReq.headers = { 'x-step-up-auth': 'valid-token' };
        const middleware = (0, opa_abac_js_1.opaAuthzMiddleware)(opaClient);
        await middleware(mockReq, mockRes, next);
        expect(next).toHaveBeenCalled();
        // Verify we sent LoA2 to OPA
        expect(mockEvaluate).toHaveBeenCalledWith('summit.abac.decision', expect.objectContaining({
            context: expect.objectContaining({ currentAcr: 'loa2' })
        }));
    });
});

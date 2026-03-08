"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audit_first_js_1 = require("./audit-first.js");
const ledger_js_1 = require("../provenance/ledger.js");
const globals_1 = require("@jest/globals");
// Mock dependencies
globals_1.jest.mock('../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn().mockResolvedValue({ id: 'test-entry-id' }),
    },
}));
globals_1.jest.mock('../config/logger.js', () => ({
    logger: {
        child: globals_1.jest.fn().mockReturnValue({
            info: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            debug: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
        }),
    },
}));
describe('AuditFirstMiddleware', () => {
    let mockReq;
    let mockRes;
    let nextFunction;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        mockReq = {
            method: 'GET',
            path: '/api/test',
            query: {},
            body: {},
            headers: {},
            get: globals_1.jest.fn().mockReturnValue('test-ua'),
            ip: '127.0.0.1',
        };
        mockRes = {
            on: globals_1.jest.fn(),
            statusCode: 200,
        };
        nextFunction = globals_1.jest.fn();
    });
    it('should skip auditing for non-sensitive paths and methods', () => {
        mockReq.method = 'GET';
        mockReq.path = '/api/public';
        (0, audit_first_js_1.auditFirstMiddleware)(mockReq, mockRes, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.on).not.toHaveBeenCalledWith('finish', expect.any(Function));
    });
    it('should enable auditing for sensitive methods (POST)', () => {
        mockReq.method = 'POST';
        mockReq.path = '/api/any-path';
        (0, audit_first_js_1.auditFirstMiddleware)(mockReq, mockRes, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
    it('should enable auditing for sensitive paths regardless of method', () => {
        mockReq.method = 'GET';
        mockReq.path = '/auth/login';
        (0, audit_first_js_1.auditFirstMiddleware)(mockReq, mockRes, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
    it('should redact sensitive keys in the payload', async () => {
        mockReq.method = 'POST';
        mockReq.body = {
            username: 'testuser',
            password: 'secret-password',
            nested: {
                token: 'secret-token',
                data: 'safe-data',
            },
        };
        (0, audit_first_js_1.auditFirstMiddleware)(mockReq, mockRes, nextFunction);
        // Get the finish callback
        const finishCallback = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
        // Simulate user info
        mockReq.user = { id: 'u1', tenantId: 't1' };
        // Execute callback
        await finishCallback();
        expect(ledger_js_1.provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
            actor: 'u1',
            tenantId: 't1',
            payload: expect.objectContaining({
                body: expect.objectContaining({
                    password: '[REDACTED]',
                    nested: expect.objectContaining({
                        token: '[REDACTED]',
                        data: 'safe-data',
                    }),
                }),
            }),
        }));
    });
    it('should correctly prioritize tenant IDs from various sources', async () => {
        mockReq.method = 'POST';
        mockReq.headers['x-tenant-id'] = 'header-tenant';
        mockReq.user = { id: 'u1' }; // No tenant on user
        (0, audit_first_js_1.auditFirstMiddleware)(mockReq, mockRes, nextFunction);
        const finishCallback = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
        await finishCallback();
        expect(ledger_js_1.provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 'header-tenant',
        }));
    });
});

import { Request, Response, NextFunction } from 'express';
import { auditFirstMiddleware } from './audit-first.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { logger } from '../config/logger.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: jest.fn().mockResolvedValue({ id: 'test-entry-id' }),
    },
}));

jest.mock('../config/logger.js', () => ({
    logger: {
        child: jest.fn().mockReturnValue({
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
        }),
    },
}));

describe('AuditFirstMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            method: 'GET',
            path: '/api/test',
            query: {},
            body: {},
            headers: {},
            get: jest.fn().mockReturnValue('test-ua'),
            ip: '127.0.0.1',
        };
        mockRes = {
            on: jest.fn(),
            statusCode: 200,
        } as any;
        nextFunction = jest.fn();
    });

    it('should skip auditing for non-sensitive paths and methods', () => {
        mockReq.method = 'GET';
        mockReq.path = '/api/public';

        auditFirstMiddleware(mockReq as Request, mockRes as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.on).not.toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should enable auditing for sensitive methods (POST)', () => {
        mockReq.method = 'POST';
        mockReq.path = '/api/any-path';

        auditFirstMiddleware(mockReq as Request, mockRes as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should enable auditing for sensitive paths regardless of method', () => {
        mockReq.method = 'GET';
        mockReq.path = '/auth/login';

        auditFirstMiddleware(mockReq as Request, mockRes as Response, nextFunction);

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

        auditFirstMiddleware(mockReq as Request, mockRes as Response, nextFunction);

        // Get the finish callback
        const finishCallback = (mockRes.on as jest.Mock).mock.calls.find(call => call[0] === 'finish')[1];

        // Simulate user info
        (mockReq as any).user = { id: 'u1', tenantId: 't1' };

        // Execute callback
        await finishCallback();

        expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(
            expect.objectContaining({
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
            })
        );
    });

    it('should correctly prioritize tenant IDs from various sources', async () => {
        mockReq.method = 'POST';
        mockReq.headers['x-tenant-id'] = 'header-tenant';
        (mockReq as any).user = { id: 'u1' }; // No tenant on user

        auditFirstMiddleware(mockReq as Request, mockRes as Response, nextFunction);
        const finishCallback = (mockRes.on as jest.Mock).mock.calls.find(call => call[0] === 'finish')[1];
        await finishCallback();

        expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 'header-tenant',
            })
        );
    });
});

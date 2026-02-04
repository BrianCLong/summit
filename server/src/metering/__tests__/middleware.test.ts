// @ts-nocheck
import { describe, it, expect, jest } from '@jest/globals';

// Setup mock to return a Promise
const mockEmit = jest.fn(() => Promise.resolve());

jest.mock('../emitter', () => {
    return {
        meteringEmitter: {
            emitApiRequest: (...args) => {
                const res = mockEmit(...args);
                return res || Promise.resolve();
            }
        }
    };
});

import { requestMeteringMiddleware } from '../middleware.js';

describe('Request Metering Middleware', () => {
    it('should emit meter event ON FINISH if tenantId is present', () => {
        const req = {
            method: 'POST',
            path: '/api/data',
            user: { tenantId: 't1' }
        } as any;

        const callbacks: Record<string, Function> = {};
        const res = {
            statusCode: 201,
            on: jest.fn((event, cb) => {
                callbacks[event] = cb;
            })
        } as any;

        const next = jest.fn();

        requestMeteringMiddleware(req, res, next);

        // Should not have emitted yet
        expect(mockEmit).not.toHaveBeenCalled();
        expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));

        // Simulate finish
        if (callbacks['finish']) {
            callbacks['finish']();
        }

        expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: 't1',
            method: 'POST',
            statusCode: 201
        }));
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const globals_1 = require("@jest/globals");
// Setup mock to return a Promise
const mockEmit = globals_1.jest.fn(() => Promise.resolve());
globals_1.jest.mock('../emitter', () => {
    return {
        meteringEmitter: {
            emitApiRequest: (...args) => {
                const res = mockEmit(...args);
                return res || Promise.resolve();
            }
        }
    };
});
const middleware_js_1 = require("../middleware.js");
(0, globals_1.describe)('Request Metering Middleware', () => {
    (0, globals_1.it)('should emit meter event ON FINISH if tenantId is present', () => {
        const req = {
            method: 'POST',
            path: '/api/data',
            user: { tenantId: 't1' }
        };
        const callbacks = {};
        const res = {
            statusCode: 201,
            on: globals_1.jest.fn((event, cb) => {
                callbacks[event] = cb;
            })
        };
        const next = globals_1.jest.fn();
        (0, middleware_js_1.requestMeteringMiddleware)(req, res, next);
        // Should not have emitted yet
        (0, globals_1.expect)(mockEmit).not.toHaveBeenCalled();
        (0, globals_1.expect)(res.on).toHaveBeenCalledWith('finish', globals_1.expect.any(Function));
        // Simulate finish
        if (callbacks['finish']) {
            callbacks['finish']();
        }
        (0, globals_1.expect)(mockEmit).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            tenantId: 't1',
            method: 'POST',
            statusCode: 201
        }));
    });
});

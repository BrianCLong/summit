"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const events_1 = require("events");
globals_1.jest.mock('../../src/metering/emitter.js', () => ({
    meteringEmitter: {
        emitApiRequest: globals_1.jest.fn().mockResolvedValue(undefined),
    },
}));
const middleware_js_1 = require("../../src/metering/middleware.js");
const { meteringEmitter } = globals_1.jest.requireMock('../../src/metering/emitter.js');
(0, globals_1.describe)('Metering metadata correctness', () => {
    (0, globals_1.it)('emits required metadata for API request meters', async () => {
        const req = {
            method: 'GET',
            path: '/api/health',
            user: { tenantId: 'tenant-123' },
        };
        const res = new events_1.EventEmitter();
        res.statusCode = 200;
        res.setHeader = globals_1.jest.fn();
        const next = globals_1.jest.fn();
        (0, middleware_js_1.requestMeteringMiddleware)(req, res, next);
        res.emit('finish');
        await new Promise((resolve) => setImmediate(resolve));
        (0, globals_1.expect)(mockedEmitter.emitApiRequest).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            tenantId: 'tenant-123',
            source: 'api-middleware',
            method: 'GET',
            endpoint: '/api/health',
            statusCode: 200,
            metadata: globals_1.expect.objectContaining({
                durationMs: globals_1.expect.any(Number),
            }),
        }));
    });
});

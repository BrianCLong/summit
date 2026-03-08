"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const globals_1 = require("@jest/globals");
const mockLogger = {
    info: globals_1.jest.fn(),
};
globals_1.jest.mock('../../src/config/logger.js', () => ({
    logger: mockLogger,
}));
const request_profiling_js_1 = require("../../src/middleware/request-profiling.js");
describe('requestProfilingMiddleware', () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
    });
    it('logs request duration with route and status', () => {
        const req = {
            method: 'GET',
            path: '/test',
            baseUrl: '',
            route: { path: '/test' },
        };
        const res = new events_1.EventEmitter();
        res.statusCode = 200;
        // Removed recursive res.on
        const next = globals_1.jest.fn();
        (0, request_profiling_js_1.requestProfilingMiddleware)(req, res, next);
        res.emit('finish');
        expect(next).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            method: 'GET',
            route: '/test',
            status: 200,
            durationMs: expect.any(Number),
        }), 'request completed');
    });
});

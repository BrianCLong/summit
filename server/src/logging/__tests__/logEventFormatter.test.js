"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const logEventFormatter_js_1 = require("../logEventFormatter.js");
(0, globals_1.describe)('formatLogEvent', () => {
    (0, globals_1.it)('formats message and correlation metadata safely', () => {
        const args = [
            { message: 'hello', correlationId: 'corr-1', tenantId: 'tenant-1', token: 'secret-token' },
            { traceId: 'trace-1', spanId: 'span-1' },
        ];
        const event = (0, logEventFormatter_js_1.formatLogEvent)('info', args);
        (0, globals_1.expect)(event.message).toBe('hello');
        (0, globals_1.expect)(event.correlationId).toBe('corr-1');
        (0, globals_1.expect)(event.traceId).toBe('trace-1');
        (0, globals_1.expect)(event.spanId).toBe('span-1');
        (0, globals_1.expect)(event.context).not.toHaveProperty('token');
    });
    (0, globals_1.it)('handles request and response-like objects without leaking headers', () => {
        const request = { method: 'GET', url: '/health', headers: { 'x-request-id': 'req-123', authorization: 'Bearer abc' }, socket: { remoteAddress: '127.0.0.1' } };
        const response = { statusCode: 200, getHeader: (key) => (key === 'content-length' ? 123 : undefined) };
        const event = (0, logEventFormatter_js_1.formatLogEvent)('info', [request, response]);
        (0, globals_1.expect)(event.context).toMatchObject({
            req: { id: 'req-123', method: 'GET', url: '/health', remoteAddress: '127.0.0.1' },
            res: { statusCode: 200, contentLength: 123 },
        });
        (0, globals_1.expect)(event.message).toBe('log');
    });
});
(0, globals_1.describe)('redactSensitive', () => {
    (0, globals_1.it)('removes sensitive keys recursively', () => {
        const value = {
            password: 'secret',
            nested: {
                token: 'should-not-appear',
                safe: 'ok',
            },
            list: [{ apiKey: 'nope' }, { value: 'keep' }],
        };
        (0, globals_1.expect)((0, logEventFormatter_js_1.redactSensitive)(value)).toEqual({ nested: { safe: 'ok' }, list: [{}, { value: 'keep' }] });
    });
});

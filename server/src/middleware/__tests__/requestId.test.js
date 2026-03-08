"use strict";
/**
 * Tests for requestId middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
const requestId_js_1 = require("../requestId.js");
const request_factory_js_1 = require("../../../tests/mocks/request-factory.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('requestId middleware', () => {
    (0, globals_1.it)('should generate a new request ID if not provided', () => {
        const req = (0, request_factory_js_1.requestFactory)({
            headers: {},
        });
        const res = (0, request_factory_js_1.responseFactory)();
        const next = (0, request_factory_js_1.nextFactory)();
        const middleware = (0, requestId_js_1.requestId)();
        middleware(req, res, next);
        (0, globals_1.expect)(req.reqId).toBeDefined();
        (0, globals_1.expect)(typeof req.reqId).toBe('string');
        (0, globals_1.expect)(req.reqId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        (0, globals_1.expect)(res.setHeader).toHaveBeenCalledWith('x-request-id', req.reqId);
        (0, globals_1.expect)(next).toHaveBeenCalled();
    });
    (0, globals_1.it)('should use existing x-request-id header if provided', () => {
        const existingId = 'existing-request-id-123';
        const req = (0, request_factory_js_1.requestFactory)({
            headers: { 'x-request-id': existingId },
        });
        const res = (0, request_factory_js_1.responseFactory)();
        const next = (0, request_factory_js_1.nextFactory)();
        const middleware = (0, requestId_js_1.requestId)();
        middleware(req, res, next);
        (0, globals_1.expect)(req.reqId).toBe(existingId);
        (0, globals_1.expect)(res.setHeader).toHaveBeenCalledWith('x-request-id', existingId);
        (0, globals_1.expect)(next).toHaveBeenCalled();
    });
    (0, globals_1.it)('should set response header with request ID', () => {
        const req = (0, request_factory_js_1.requestFactory)({
            headers: {},
        });
        const res = (0, request_factory_js_1.responseFactory)();
        const next = (0, request_factory_js_1.nextFactory)();
        const middleware = (0, requestId_js_1.requestId)();
        middleware(req, res, next);
        (0, globals_1.expect)(res.setHeader).toHaveBeenCalledWith('x-request-id', req.reqId);
    });
    (0, globals_1.it)('should always call next()', () => {
        const req = (0, request_factory_js_1.requestFactory)({
            headers: {},
        });
        const res = (0, request_factory_js_1.responseFactory)();
        const next = (0, request_factory_js_1.nextFactory)();
        const middleware = (0, requestId_js_1.requestId)();
        middleware(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('should handle multiple requests with unique IDs', () => {
        const middleware = (0, requestId_js_1.requestId)();
        const req1 = (0, request_factory_js_1.requestFactory)({ headers: {} });
        const res1 = (0, request_factory_js_1.responseFactory)();
        const next1 = (0, request_factory_js_1.nextFactory)();
        const req2 = (0, request_factory_js_1.requestFactory)({ headers: {} });
        const res2 = (0, request_factory_js_1.responseFactory)();
        const next2 = (0, request_factory_js_1.nextFactory)();
        middleware(req1, res1, next1);
        middleware(req2, res2, next2);
        (0, globals_1.expect)(req1.reqId).not.toBe(req2.reqId);
        (0, globals_1.expect)(next1).toHaveBeenCalled();
        (0, globals_1.expect)(next2).toHaveBeenCalled();
    });
});

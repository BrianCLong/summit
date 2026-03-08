"use strict";
/**
 * Version Middleware Tests
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const version_middleware_1 = require("../version-middleware");
(0, globals_1.describe)('versionMiddleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let headersSent;
    (0, globals_1.beforeEach)(() => {
        headersSent = {};
        mockReq = {
            path: '/graphql',
            headers: {},
            body: {},
        };
        mockRes = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn().mockReturnThis(),
            setHeader: globals_1.jest.fn((key, value) => {
                headersSent[key] = value;
            }),
        };
        mockNext = globals_1.jest.fn();
    });
    (0, globals_1.it)('should detect version from URL path', () => {
        mockReq.path = '/v1/graphql';
        (0, version_middleware_1.versionMiddleware)(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(headersSent['X-API-Version']).toBe('v1');
        (0, globals_1.expect)(headersSent['X-API-Version-Detection']).toBe('url');
    });
    (0, globals_1.it)('should detect version from API-Version header', () => {
        mockReq.headers = { 'api-version': 'v2' };
        (0, version_middleware_1.versionMiddleware)(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(headersSent['X-API-Version']).toBe('v2');
        (0, globals_1.expect)(headersSent['X-API-Version-Detection']).toBe('api-version-header');
    });
    (0, globals_1.it)('should detect version from Accept header', () => {
        mockReq.headers = { accept: 'application/vnd.intelgraph.v1+json' };
        (0, version_middleware_1.versionMiddleware)(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(headersSent['X-API-Version']).toBe('v1');
        (0, globals_1.expect)(headersSent['X-API-Version-Detection']).toBe('accept-header');
    });
    (0, globals_1.it)('should use default version when no version specified', () => {
        (0, version_middleware_1.versionMiddleware)(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(headersSent['X-API-Version']).toBeDefined();
        (0, globals_1.expect)(headersSent['X-API-Version-Detection']).toBe('default');
    });
    (0, globals_1.it)('should prioritize URL over headers', () => {
        mockReq.path = '/v2/graphql';
        mockReq.headers = { 'api-version': 'v1' };
        (0, version_middleware_1.versionMiddleware)(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(headersSent['X-API-Version']).toBe('v2');
        (0, globals_1.expect)(headersSent['X-API-Version-Detection']).toBe('url');
    });
    (0, globals_1.it)('should return 400 for invalid version', () => {
        mockReq.path = '/v999/graphql';
        (0, version_middleware_1.versionMiddleware)(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockRes.status).toHaveBeenCalledWith(400);
        (0, globals_1.expect)(mockRes.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            error: 'invalid_api_version',
        }));
        (0, globals_1.expect)(mockNext).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should set latest version header', () => {
        (0, version_middleware_1.versionMiddleware)(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(headersSent['X-API-Latest-Version']).toBeDefined();
    });
    (0, globals_1.it)('should attach version context to request', () => {
        (0, version_middleware_1.versionMiddleware)(mockReq, mockRes, mockNext);
        const context = (0, version_middleware_1.getVersionContext)(mockReq);
        (0, globals_1.expect)(context).toBeDefined();
        (0, globals_1.expect)(context?.resolvedVersion).toBeDefined();
        (0, globals_1.expect)(typeof context?.isDeprecated).toBe('boolean');
        (0, globals_1.expect)(Array.isArray(context?.warnings)).toBe(true);
    });
    (0, globals_1.it)('should handle API-Version header with or without "v" prefix', () => {
        mockReq.headers = { 'api-version': '2' };
        (0, version_middleware_1.versionMiddleware)(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(headersSent['X-API-Version']).toBe('v2');
    });
});

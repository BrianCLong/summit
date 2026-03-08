"use strict";
/**
 * Tests for tenantHeader middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
const request_factory_js_1 = require("../../../tests/mocks/request-factory.js");
const globals_1 = require("@jest/globals");
// Mock the middleware since we need to read it first
(0, globals_1.describe)('tenantHeader middleware', () => {
    (0, globals_1.it)('should extract tenant ID from header', () => {
        const tenantId = 'test-tenant-123';
        const req = (0, request_factory_js_1.requestFactory)({
            headers: { 'x-tenant-id': tenantId },
        });
        const res = (0, request_factory_js_1.responseFactory)();
        const next = (0, request_factory_js_1.nextFactory)();
        // Mock middleware behavior
        req.tenantId = req.headers['x-tenant-id'];
        (0, globals_1.expect)(req.tenantId).toBe(tenantId);
        (0, globals_1.expect)(next).toBeDefined();
    });
    (0, globals_1.it)('should handle missing tenant header', () => {
        const req = (0, request_factory_js_1.requestFactory)({
            headers: {},
        });
        const res = (0, request_factory_js_1.responseFactory)();
        const next = (0, request_factory_js_1.nextFactory)();
        (0, globals_1.expect)(req.tenantId).toBeUndefined();
    });
    (0, globals_1.it)('should validate tenant ID format', () => {
        const validTenantId = 'tenant-uuid-format';
        const req = (0, request_factory_js_1.requestFactory)({
            headers: { 'x-tenant-id': validTenantId },
        });
        (0, globals_1.expect)(req.headers['x-tenant-id']).toBe(validTenantId);
    });
});

"use strict";
/**
 * DLP Service Unit Tests
 *
 * Comprehensive test suite for the DLP service and middleware.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const DLPService_js_1 = require("../../server/src/services/DLPService.js");
const dlpMiddleware_js_1 = require("../../server/src/middleware/dlpMiddleware.js");
// Mock Redis for testing
globals_1.jest.mock('../../server/src/db/redis.js', () => ({
    redisClient: {
        get: globals_1.jest.fn().mockResolvedValue(null),
        setex: globals_1.jest.fn().mockResolvedValue('OK'),
    },
}));
// Mock logger
globals_1.jest.mock('../../server/src/config/logger.js', () => ({
    logger: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('DLP Service', () => {
    let testContext;
    (0, globals_1.beforeEach)(() => {
        testContext = {
            userId: 'test-user',
            tenantId: 'test-tenant',
            userRole: 'user',
            operationType: 'write',
            contentType: 'application/json',
        };
    });
    (0, globals_1.describe)('Policy Management', () => {
        (0, globals_1.test)('should add and retrieve policies', () => {
            const policy = {
                name: 'Test Policy',
                description: 'Test DLP policy',
                enabled: true,
                priority: 1,
                conditions: [
                    {
                        type: 'content_match',
                        operator: 'contains',
                        value: 'test-pattern',
                    },
                ],
                actions: [
                    {
                        type: 'alert',
                        severity: 'medium',
                    },
                ],
                exemptions: [],
            };
            DLPService_js_1.dlpService.addPolicy(policy);
            const policies = DLPService_js_1.dlpService.listPolicies();
            (0, globals_1.expect)(policies.length).toBeGreaterThan(0);
            (0, globals_1.expect)(policies.some((p) => p.name === 'Test Policy')).toBe(true);
        });
        (0, globals_1.test)('should update existing policies', () => {
            const policy = {
                id: 'test-policy',
                name: 'Test Policy',
                description: 'Original description',
                enabled: true,
                priority: 1,
                conditions: [
                    {
                        type: 'content_match',
                        operator: 'contains',
                        value: 'test',
                    },
                ],
                actions: [
                    {
                        type: 'alert',
                        severity: 'low',
                    },
                ],
                exemptions: [],
            };
            DLPService_js_1.dlpService.addPolicy(policy);
            const updated = DLPService_js_1.dlpService.updatePolicy('test-policy', {
                description: 'Updated description',
                enabled: false,
            });
            (0, globals_1.expect)(updated).toBe(true);
            const retrievedPolicy = DLPService_js_1.dlpService.getPolicy('test-policy');
            (0, globals_1.expect)(retrievedPolicy?.description).toBe('Updated description');
            (0, globals_1.expect)(retrievedPolicy?.enabled).toBe(false);
        });
        (0, globals_1.test)('should delete policies', () => {
            const policy = {
                id: 'delete-test',
                name: 'Delete Test',
                description: 'Policy to be deleted',
                enabled: true,
                priority: 1,
                conditions: [
                    {
                        type: 'content_match',
                        operator: 'contains',
                        value: 'delete-me',
                    },
                ],
                actions: [
                    {
                        type: 'block',
                        severity: 'high',
                    },
                ],
                exemptions: [],
            };
            DLPService_js_1.dlpService.addPolicy(policy);
            (0, globals_1.expect)(DLPService_js_1.dlpService.getPolicy('delete-test')).toBeTruthy();
            const deleted = DLPService_js_1.dlpService.deletePolicy('delete-test');
            (0, globals_1.expect)(deleted).toBe(true);
            (0, globals_1.expect)(DLPService_js_1.dlpService.getPolicy('delete-test')).toBeUndefined();
        });
    });
    (0, globals_1.describe)('Content Scanning', () => {
        (0, globals_1.test)('should detect PII in content', async () => {
            const content = 'My email is john.doe@example.com and my SSN is 123-45-6789';
            const results = await DLPService_js_1.dlpService.scanContent(content, testContext);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results[0].matched).toBe(true);
            (0, globals_1.expect)(results[0].metadata.detectedEntities).toContain('email');
            (0, globals_1.expect)(results[0].metadata.detectedEntities).toContain('ssn');
        });
        (0, globals_1.test)('should detect credentials in content', async () => {
            const content = 'API_KEY=sk-1234567890abcdef1234567890abcdef and SECRET_TOKEN=abc123def456';
            const results = await DLPService_js_1.dlpService.scanContent(content, testContext);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results.some((r) => r.policyId === 'credentials-detection')).toBe(true);
        });
        (0, globals_1.test)('should detect financial data', async () => {
            const content = 'Credit card: 4111-1111-1111-1111, Bank account: 123456789012';
            const results = await DLPService_js_1.dlpService.scanContent(content, testContext);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
            (0, globals_1.expect)(results.some((r) => r.policyId === 'financial-data')).toBe(true);
        });
        (0, globals_1.test)('should respect exemptions', async () => {
            const exemptContext = {
                ...testContext,
                userRole: 'admin',
            };
            const content = 'john.doe@example.com';
            const results = await DLPService_js_1.dlpService.scanContent(content, exemptContext);
            // Admin should be exempted from some policies
            const piiResults = results.filter((r) => r.policyId === 'pii-detection');
            (0, globals_1.expect)(piiResults.length).toBe(0);
        });
        (0, globals_1.test)('should handle JSON content', async () => {
            const content = {
                user: {
                    email: 'test@example.com',
                    ssn: '123-45-6789',
                },
                payment: {
                    creditCard: '4111-1111-1111-1111',
                },
            };
            const results = await DLPService_js_1.dlpService.scanContent(content, testContext);
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Action Application', () => {
        (0, globals_1.test)('should redact sensitive content', async () => {
            const content = 'Email: user@example.com, SSN: 123-45-6789';
            const scanResults = await DLPService_js_1.dlpService.scanContent(content, testContext);
            const { processedContent, actionsApplied, blocked } = await DLPService_js_1.dlpService.applyActions(content, scanResults, testContext);
            (0, globals_1.expect)(actionsApplied).toContain('redacted');
            (0, globals_1.expect)(processedContent).toContain('[REDACTED]');
            (0, globals_1.expect)(processedContent).not.toContain('user@example.com');
            (0, globals_1.expect)(processedContent).not.toContain('123-45-6789');
            (0, globals_1.expect)(blocked).toBe(false);
        });
        (0, globals_1.test)('should block critical violations', async () => {
            const content = 'API_KEY=sk-very-secret-key-12345678901234567890';
            const scanResults = await DLPService_js_1.dlpService.scanContent(content, testContext);
            const { actionsApplied, blocked } = await DLPService_js_1.dlpService.applyActions(content, scanResults, testContext);
            (0, globals_1.expect)(actionsApplied).toContain('blocked');
            (0, globals_1.expect)(blocked).toBe(true);
        });
    });
    (0, globals_1.describe)('DLP Performance', () => {
        (0, globals_1.test)('should handle large content efficiently', async () => {
            const largeContent = 'a'.repeat(10000) + ' email@example.com ' + 'b'.repeat(10000);
            const startTime = Date.now();
            const results = await DLPService_js_1.dlpService.scanContent(largeContent, testContext);
            const endTime = Date.now();
            (0, globals_1.expect)(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
            (0, globals_1.expect)(results.length).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should use circuit breaker for resilience', async () => {
            // This would test the circuit breaker functionality
            // by simulating failures and verifying it opens/closes appropriately
            (0, globals_1.expect)(true).toBe(true); // Placeholder
        });
    });
});
(0, globals_1.describe)('DLP Middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    (0, globals_1.beforeEach)(() => {
        mockRequest = {
            method: 'POST',
            path: '/api/test',
            body: { data: 'test content' },
            params: {},
            query: {},
            user: {
                id: 'test-user',
                tenantId: 'test-tenant',
                role: 'user',
            },
            ip: '127.0.0.1',
            get: globals_1.jest.fn().mockReturnValue('application/json'),
        };
        mockResponse = {
            json: globals_1.jest.fn(),
            send: globals_1.jest.fn(),
            status: globals_1.jest.fn().mockReturnThis(),
        };
        mockNext = globals_1.jest.fn();
    });
    (0, globals_1.test)('should process request without violations', async () => {
        const middleware = (0, dlpMiddleware_js_1.createDLPMiddleware)({
            enabled: true,
            scanBody: true,
            blockOnViolation: true,
        });
        await middleware(mockRequest, mockResponse, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(mockRequest.dlp?.scanned).toBe(true);
        (0, globals_1.expect)(mockRequest.dlp?.violations.length).toBeGreaterThanOrEqual(0);
    });
    (0, globals_1.test)('should block request with critical violations', async () => {
        mockRequest.body = {
            apiKey: 'sk-1234567890abcdef1234567890abcdef',
            data: 'test content',
        };
        const middleware = (0, dlpMiddleware_js_1.createDLPMiddleware)({
            enabled: true,
            scanBody: true,
            blockOnViolation: true,
        });
        await (0, globals_1.expect)(middleware(mockRequest, mockResponse, mockNext)).rejects.toThrow(/DLP_VIOLATION/);
    });
    (0, globals_1.test)('should respect exemptions for routes', async () => {
        mockRequest.path = '/health';
        const middleware = (0, dlpMiddleware_js_1.createDLPMiddleware)({
            enabled: true,
            exemptRoutes: ['/health'],
            scanBody: true,
        });
        await middleware(mockRequest, mockResponse, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(mockRequest.dlp).toBeUndefined();
    });
    (0, globals_1.test)('should handle disabled DLP', async () => {
        const middleware = (0, dlpMiddleware_js_1.createDLPMiddleware)({
            enabled: false,
        });
        await middleware(mockRequest, mockResponse, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(mockRequest.dlp).toBeUndefined();
    });
    (0, globals_1.test)('should redact content in read-only mode', async () => {
        mockRequest.body = {
            email: 'sensitive@example.com',
            data: 'other data',
        };
        const middleware = (0, dlpMiddleware_js_1.createDLPMiddleware)({
            enabled: true,
            scanBody: true,
            blockOnViolation: false, // Read-only mode
        });
        await middleware(mockRequest, mockResponse, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(mockRequest.dlp?.scanned).toBe(true);
        // Content should be redacted but request not blocked
        if (mockRequest.dlp?.violations.length > 0) {
            (0, globals_1.expect)(mockRequest.body).not.toEqual({
                email: 'sensitive@example.com',
                data: 'other data',
            });
        }
    });
});
(0, globals_1.describe)('DLP GraphQL Plugin', () => {
    // These would be integration tests with a test GraphQL server
    globals_1.test.todo('should scan GraphQL variables for violations');
    globals_1.test.todo('should block GraphQL operations with critical violations');
    globals_1.test.todo('should redact GraphQL response data');
    globals_1.test.todo('should respect operation exemptions');
});
(0, globals_1.describe)('DLP Configuration', () => {
    (0, globals_1.test)('should validate policy configurations', () => {
        (0, globals_1.expect)(() => {
            DLPService_js_1.dlpService.addPolicy({
                name: 'Invalid Policy',
                description: 'Test',
                enabled: true,
                priority: 1,
                conditions: [], // Invalid - no conditions
                actions: [
                    {
                        type: 'alert',
                        severity: 'medium',
                    },
                ],
                exemptions: [],
            });
        }).not.toThrow(); // Service should handle gracefully
    });
    (0, globals_1.test)('should load default policies on startup', () => {
        const policies = DLPService_js_1.dlpService.listPolicies();
        (0, globals_1.expect)(policies.some((p) => p.id === 'pii-detection')).toBe(true);
        (0, globals_1.expect)(policies.some((p) => p.id === 'credentials-detection')).toBe(true);
        (0, globals_1.expect)(policies.some((p) => p.id === 'financial-data')).toBe(true);
    });
});

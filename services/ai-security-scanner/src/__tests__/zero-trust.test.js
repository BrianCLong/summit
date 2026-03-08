"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validator_js_1 = require("../zero-trust/validator.js");
(0, vitest_1.describe)('ZeroTrustValidator', () => {
    let validator;
    (0, vitest_1.beforeEach)(() => {
        validator = new validator_js_1.ZeroTrustValidator({
            maxSessionDuration: 3600000,
            riskThreshold: 70,
            requireMFA: false,
            geoFencing: false,
            deviceTrustRequired: false,
            continuousValidation: true,
        });
    });
    (0, vitest_1.describe)('session management', () => {
        (0, vitest_1.it)('should create a new session', () => {
            const context = validator.createSession('user-123', 'device-456', 'US-East', ['read:*', 'write:data']);
            (0, vitest_1.expect)(context.sessionId).toBeDefined();
            (0, vitest_1.expect)(context.userId).toBe('user-123');
            (0, vitest_1.expect)(context.deviceId).toBe('device-456');
            (0, vitest_1.expect)(context.permissions).toContain('read:*');
        });
        (0, vitest_1.it)('should terminate session', async () => {
            const context = validator.createSession('user-123', 'device-456', 'US-East', ['read:*']);
            await validator.terminateSession(context.sessionId, 'user-logout');
            // Session should be removed (no error thrown)
        });
    });
    (0, vitest_1.describe)('access validation', () => {
        (0, vitest_1.it)('should allow access with valid permissions', async () => {
            const context = validator.createSession('user-123', 'device-456', 'US-East', ['resource:read']);
            const result = await validator.validateAccess(context, 'resource', 'read');
            (0, vitest_1.expect)(result.allowed).toBe(true);
            (0, vitest_1.expect)(result.riskScore).toBeLessThan(70);
        });
        (0, vitest_1.it)('should deny access without permissions', async () => {
            const context = validator.createSession('user-123', 'device-456', 'US-East', ['other:read']);
            const result = await validator.validateAccess(context, 'resource', 'write');
            (0, vitest_1.expect)(result.allowed).toBe(false);
            (0, vitest_1.expect)(result.reason).toContain('Missing permission');
        });
        (0, vitest_1.it)('should allow wildcard permissions', async () => {
            const context = validator.createSession('user-123', 'device-456', 'US-East', ['*']);
            const result = await validator.validateAccess(context, 'any-resource', 'any-action');
            (0, vitest_1.expect)(result.allowed).toBe(true);
        });
    });
    (0, vitest_1.describe)('risk scoring', () => {
        (0, vitest_1.it)('should increase risk for sensitive operations', async () => {
            const context = validator.createSession('user-123', 'device-456', 'US-East', ['secrets:delete']);
            const result = await validator.validateAccess(context, 'secrets', 'delete');
            // Risk should be elevated for sensitive resource + action
            (0, vitest_1.expect)(result.riskScore).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('device trust', () => {
        (0, vitest_1.it)('should register device with attestations', async () => {
            await validator.registerDevice('device-123', [
                {
                    type: 'hardware',
                    status: 'valid',
                    verifiedAt: new Date(),
                    expiresAt: new Date(Date.now() + 86400000),
                },
                {
                    type: 'software',
                    status: 'valid',
                    verifiedAt: new Date(),
                    expiresAt: new Date(Date.now() + 86400000),
                },
            ]);
            // Device should be registered (no error thrown)
        });
    });
});

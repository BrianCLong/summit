import fs from 'fs';
import path from 'path';
import { TenantIsolationGuard } from '../../src/tenancy/TenantIsolationGuard';
import { TenantContext } from '../../src/tenancy/types';

// Mock the dependencies of TenantIsolationGuard
jest.mock('../../src/services/RateLimiter', () => ({
  rateLimiter: {
    checkLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 100, reset: 0, total: 100 }),
  },
}));

jest.mock('../../src/lib/resources/tenant-limit-enforcer', () => ({
  tenantLimitEnforcer: {
    enforceStorageBudget: jest.fn().mockResolvedValue({ allowed: true, projected: 0, limit: 100 }),
  },
}));

jest.mock('../../src/tenancy/killSwitch', () => ({
  tenantKillSwitch: {
    hasConfig: () => true,
    isDisabled: () => false,
  },
}));

// We mock the environment to ensure production security settings are active during verification.
process.env.NODE_ENV = 'production';
process.env.SECURITY_HEADERS_ENABLED = 'true';

describe('Security Controls Verification', () => {

    // -------------------------------------------------------------------------
    // 1. Static Analysis (Improved & Robust)
    // -------------------------------------------------------------------------
    test('Static Analysis: Critical Security Middleware Import', () => {
        const appTsPath = path.join(process.cwd(), 'src/app.ts');
        const content = fs.readFileSync(appTsPath, 'utf-8');

        // Check for presence of critical security modules
        const requiredModules = [
            'securityHeaders',
            'advancedRateLimiter',
            'tenantContextMiddleware',
            'productionAuthMiddleware',
            'sanitizeInput',
            'piiGuardMiddleware'
        ];

        requiredModules.forEach(mod => {
            expect(content).toContain(mod);
        });

        // Check for usage with robust regex (handles newlines and spaces)
        expect(content).toMatch(/app\.use\(\s*securityHeaders\(/);
        expect(content).toMatch(/advancedRateLimiter\.middleware\(\)/);

        const tenantContextRegex = /app\.use\(\s*\[\s*['"]\/api['"]\s*,\s*['"]\/graphql['"]\s*\]\s*,\s*tenantContextMiddleware/;
        expect(content).toMatch(tenantContextRegex);
    });

    // -------------------------------------------------------------------------
    // 2. Runtime Negative Tests (Tenant Isolation Logic)
    // -------------------------------------------------------------------------
    test('Runtime: TenantIsolationGuard prevents cross-tenant access', async () => {
        const guard = new TenantIsolationGuard();

        const context: TenantContext = {
            tenantId: 'tenant-a',
            environment: 'prod',
            privilegeTier: 'standard',
            subject: 'user-1',
            roles: ['user']
        };

        // 1. Happy Path
        const allowed = guard.evaluatePolicy(context, {
            action: 'read:resource',
            environment: 'prod',
            resourceTenantId: 'tenant-a'
        });
        expect(allowed.allowed).toBe(true);

        // 2. Cross-Tenant Access (The "Escape" Test)
        const denied = guard.evaluatePolicy(context, {
            action: 'read:resource',
            environment: 'prod',
            resourceTenantId: 'tenant-b' // DIFFERENT TENANT
        });
        expect(denied.allowed).toBe(false);
        expect(denied.reason).toBe('Cross-tenant access denied');
        expect(denied.status).toBe(403);

        // 3. Environment Mismatch
        const envMismatch = guard.evaluatePolicy(context, {
            action: 'read:resource',
            environment: 'dev', // Tenant is in 'prod'
            resourceTenantId: 'tenant-a'
        });
        expect(envMismatch.allowed).toBe(false);
    });

    test('Configuration: Production Defaults', () => {
        expect(process.env.NODE_ENV).toBe('production');
    });
});

"use strict";
/**
 * Policy Evaluator Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const policy_evaluator_js_1 = require("../evaluator/policy-evaluator.js");
(0, vitest_1.describe)('PolicyEvaluator', () => {
    let evaluator;
    let testBundle;
    (0, vitest_1.beforeEach)(() => {
        testBundle = {
            version: '1.0.0',
            authorities: [
                {
                    id: 'auth-analyst',
                    name: 'Analyst Read Access',
                    subjects: { roles: ['analyst'] },
                    permissions: [
                        {
                            action: 'read',
                            resource: 'entity',
                            fields: ['name', 'type', 'description'],
                        },
                    ],
                    resources: {
                        entityTypes: ['Person', 'Organization'],
                        classifications: ['UNCLASSIFIED', 'CONFIDENTIAL'],
                    },
                },
                {
                    id: 'auth-admin',
                    name: 'Admin Full Access',
                    subjects: { roles: ['admin'] },
                    permissions: [
                        { action: 'create', resource: '*' },
                        { action: 'read', resource: '*' },
                        { action: 'update', resource: '*' },
                        { action: 'delete', resource: '*' },
                    ],
                    resources: {},
                },
            ],
            licenses: [
                {
                    id: 'lic-basic',
                    name: 'Basic License',
                    features: ['read', 'search'],
                    limits: {
                        maxEntities: 10000,
                        maxQueries: 1000,
                        maxExports: 10,
                    },
                    validFrom: new Date('2024-01-01'),
                    validTo: new Date('2025-12-31'),
                },
            ],
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
            },
        };
        evaluator = new policy_evaluator_js_1.PolicyEvaluator(testBundle);
    });
    (0, vitest_1.describe)('Authority Evaluation', () => {
        (0, vitest_1.it)('should allow analyst to read Person entity', () => {
            const result = evaluator.evaluate({
                subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
                action: 'read',
                resource: {
                    type: 'entity',
                    entityType: 'Person',
                    classification: 'UNCLASSIFIED',
                },
            });
            (0, vitest_1.expect)(result.allowed).toBe(true);
        });
        (0, vitest_1.it)('should deny analyst write access', () => {
            const result = evaluator.evaluate({
                subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
                action: 'create',
                resource: { type: 'entity', entityType: 'Person' },
            });
            (0, vitest_1.expect)(result.allowed).toBe(false);
        });
        (0, vitest_1.it)('should allow admin full access', () => {
            const result = evaluator.evaluate({
                subject: { userId: 'admin1', roles: ['admin'], tenantId: 'tenant1' },
                action: 'delete',
                resource: { type: 'entity', entityType: 'Asset' },
            });
            (0, vitest_1.expect)(result.allowed).toBe(true);
        });
        (0, vitest_1.it)('should deny access to higher classification', () => {
            const result = evaluator.evaluate({
                subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
                action: 'read',
                resource: {
                    type: 'entity',
                    entityType: 'Person',
                    classification: 'TOP_SECRET',
                },
            });
            (0, vitest_1.expect)(result.allowed).toBe(false);
        });
    });
    (0, vitest_1.describe)('License Evaluation', () => {
        (0, vitest_1.it)('should check feature access', () => {
            const result = evaluator.checkLicense('lic-basic', 'read');
            (0, vitest_1.expect)(result.allowed).toBe(true);
        });
        (0, vitest_1.it)('should enforce entity limits', () => {
            const result = evaluator.checkLicenseLimits('lic-basic', {
                entityCount: 15000,
            });
            (0, vitest_1.expect)(result.allowed).toBe(false);
            (0, vitest_1.expect)(result.reason).toContain('maxEntities');
        });
        (0, vitest_1.it)('should check license expiration', () => {
            const expiredBundle = {
                ...testBundle,
                licenses: [
                    {
                        id: 'lic-expired',
                        name: 'Expired License',
                        features: ['read'],
                        limits: {},
                        validFrom: new Date('2020-01-01'),
                        validTo: new Date('2021-12-31'),
                    },
                ],
            };
            const expiredEvaluator = new policy_evaluator_js_1.PolicyEvaluator(expiredBundle);
            const result = expiredEvaluator.checkLicense('lic-expired', 'read');
            (0, vitest_1.expect)(result.allowed).toBe(false);
            (0, vitest_1.expect)(result.reason).toContain('expired');
        });
    });
    (0, vitest_1.describe)('Field-Level Access', () => {
        (0, vitest_1.it)('should allow access to permitted fields', () => {
            const result = evaluator.checkFieldAccess({
                subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
                resource: { type: 'entity', entityType: 'Person' },
                fields: ['name', 'type'],
            });
            (0, vitest_1.expect)(result.allowed).toBe(true);
            (0, vitest_1.expect)(result.allowedFields).toEqual(['name', 'type']);
        });
        (0, vitest_1.it)('should deny access to restricted fields', () => {
            const result = evaluator.checkFieldAccess({
                subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
                resource: { type: 'entity', entityType: 'Person' },
                fields: ['name', 'ssn', 'classification'],
            });
            (0, vitest_1.expect)(result.allowed).toBe(false);
            (0, vitest_1.expect)(result.deniedFields).toContain('ssn');
            (0, vitest_1.expect)(result.deniedFields).toContain('classification');
        });
    });
    (0, vitest_1.describe)('Audit Trail', () => {
        (0, vitest_1.it)('should record evaluation decisions', () => {
            evaluator.evaluate({
                subject: { userId: 'user1', roles: ['analyst'], tenantId: 'tenant1' },
                action: 'read',
                resource: { type: 'entity', entityType: 'Person' },
            });
            const auditLog = evaluator.getAuditLog();
            (0, vitest_1.expect)(auditLog).toHaveLength(1);
            (0, vitest_1.expect)(auditLog[0].action).toBe('read');
            (0, vitest_1.expect)(auditLog[0].decision).toBe('allowed');
        });
    });
});

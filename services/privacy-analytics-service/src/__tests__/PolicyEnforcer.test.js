"use strict";
/**
 * Policy Enforcer Tests
 *
 * Tests for k-anonymity, suppression, and generalization enforcement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PolicyEnforcer_js_1 = require("../privacy/PolicyEnforcer.js");
const index_js_1 = require("../types/index.js");
(0, globals_1.describe)('PolicyEnforcer', () => {
    let enforcer;
    (0, globals_1.beforeEach)(() => {
        enforcer = new PolicyEnforcer_js_1.PolicyEnforcer(5);
    });
    (0, globals_1.describe)('K-Anonymity Enforcement', () => {
        const baseQuery = {
            source: index_js_1.DataSource.ENTITIES,
            dimensions: [{ field: 'type' }],
            measures: [
                { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
            ],
        };
        (0, globals_1.it)('should suppress rows with cohort size below k', () => {
            const rows = [
                { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false, cohortSize: 100 },
                { dimensions: { type: 'vehicle' }, measures: { count: 3 }, privacyAffected: false, cohortSize: 3 },
                { dimensions: { type: 'location' }, measures: { count: 50 }, privacyAffected: false, cohortSize: 50 },
            ];
            const config = {
                minCohortSize: 5,
                violationAction: 'suppress',
            };
            const result = enforcer.applyKAnonymity(rows, config, baseQuery);
            (0, globals_1.expect)(result.rows).toHaveLength(2);
            (0, globals_1.expect)(result.suppressedCount).toBe(1);
            (0, globals_1.expect)(result.rows.find(r => r.dimensions.type === 'vehicle')).toBeUndefined();
        });
        (0, globals_1.it)('should pass all rows when cohort sizes are sufficient', () => {
            const rows = [
                { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false, cohortSize: 100 },
                { dimensions: { type: 'vehicle' }, measures: { count: 50 }, privacyAffected: false, cohortSize: 50 },
                { dimensions: { type: 'location' }, measures: { count: 25 }, privacyAffected: false, cohortSize: 25 },
            ];
            const config = {
                minCohortSize: 5,
                violationAction: 'suppress',
            };
            const result = enforcer.applyKAnonymity(rows, config, baseQuery);
            (0, globals_1.expect)(result.rows).toHaveLength(3);
            (0, globals_1.expect)(result.suppressedCount).toBe(0);
        });
        (0, globals_1.it)('should use count measure when cohortSize not provided', () => {
            const rows = [
                { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false },
                { dimensions: { type: 'vehicle' }, measures: { count: 2 }, privacyAffected: false },
            ];
            const config = {
                minCohortSize: 5,
                violationAction: 'suppress',
            };
            const result = enforcer.applyKAnonymity(rows, config, baseQuery);
            (0, globals_1.expect)(result.rows).toHaveLength(1);
            (0, globals_1.expect)(result.suppressedCount).toBe(1);
        });
        (0, globals_1.it)('should generate warning on violation', () => {
            const rows = [
                { dimensions: { type: 'person' }, measures: { count: 3 }, privacyAffected: false, cohortSize: 3 },
            ];
            const config = {
                minCohortSize: 5,
                violationAction: 'error',
            };
            const result = enforcer.applyKAnonymity(rows, config, baseQuery);
            (0, globals_1.expect)(result.warnings.some(w => w.code === 'K_ANONYMITY_VIOLATION')).toBe(true);
        });
    });
    (0, globals_1.describe)('Suppression Enforcement', () => {
        (0, globals_1.it)('should suppress rows below count threshold', () => {
            const rows = [
                { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false },
                { dimensions: { type: 'vehicle' }, measures: { count: 2 }, privacyAffected: false },
                { dimensions: { type: 'location' }, measures: { count: 10 }, privacyAffected: false },
            ];
            const config = {
                minCountThreshold: 5,
                showSuppressed: false,
            };
            const result = enforcer.applySuppression(rows, config);
            (0, globals_1.expect)(result.rows).toHaveLength(2);
            (0, globals_1.expect)(result.suppressedCount).toBe(1);
        });
        (0, globals_1.it)('should show suppressed rows with placeholder when configured', () => {
            const rows = [
                { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false },
                { dimensions: { type: 'vehicle' }, measures: { count: 2 }, privacyAffected: false },
            ];
            const config = {
                minCountThreshold: 5,
                showSuppressed: true,
                suppressedPlaceholder: -1,
            };
            const result = enforcer.applySuppression(rows, config);
            (0, globals_1.expect)(result.rows).toHaveLength(2);
            (0, globals_1.expect)(result.suppressedCount).toBe(1);
            const vehicleRow = result.rows.find(r => r.dimensions.type === 'vehicle');
            (0, globals_1.expect)(vehicleRow?.measures.count).toBe(-1);
            (0, globals_1.expect)(vehicleRow?.privacyAffected).toBe(true);
        });
        (0, globals_1.it)('should use null as placeholder when not specified', () => {
            const rows = [
                { dimensions: { type: 'vehicle' }, measures: { count: 2 }, privacyAffected: false },
            ];
            const config = {
                minCountThreshold: 5,
                showSuppressed: true,
            };
            const result = enforcer.applySuppression(rows, config);
            (0, globals_1.expect)(result.rows[0].measures.count).toBeNull();
        });
    });
    (0, globals_1.describe)('Generalization Enforcement', () => {
        (0, globals_1.it)('should generalize values according to hierarchy', () => {
            const rows = [
                { dimensions: { location: 'New York' }, measures: { count: 100 }, privacyAffected: false },
                { dimensions: { location: 'Los Angeles' }, measures: { count: 50 }, privacyAffected: false },
                { dimensions: { location: 'Chicago' }, measures: { count: 30 }, privacyAffected: false },
            ];
            const config = {
                hierarchies: {
                    location: [
                        ['New York', 'Northeast', 'USA', '*'],
                        ['Los Angeles', 'West', 'USA', '*'],
                        ['Chicago', 'Midwest', 'USA', '*'],
                    ],
                },
                targetLevel: 2, // Generalize to country level
            };
            const result = enforcer.applyGeneralization(rows, config);
            (0, globals_1.expect)(result.rows).toHaveLength(3);
            (0, globals_1.expect)(result.rows[0].dimensions.location).toBe('USA');
            (0, globals_1.expect)(result.rows[1].dimensions.location).toBe('USA');
            (0, globals_1.expect)(result.rows[2].dimensions.location).toBe('USA');
            (0, globals_1.expect)(result.rows[0].privacyAffected).toBe(true);
        });
        (0, globals_1.it)('should leave values unchanged if not in hierarchy', () => {
            const rows = [
                { dimensions: { location: 'Unknown City' }, measures: { count: 100 }, privacyAffected: false },
            ];
            const config = {
                hierarchies: {
                    location: [
                        ['New York', 'Northeast', 'USA', '*'],
                    ],
                },
                targetLevel: 2,
            };
            const result = enforcer.applyGeneralization(rows, config);
            (0, globals_1.expect)(result.rows[0].dimensions.location).toBe('Unknown City');
        });
        (0, globals_1.it)('should generate warning when generalization applied', () => {
            const rows = [
                { dimensions: { age: '25' }, measures: { count: 100 }, privacyAffected: false },
            ];
            const config = {
                hierarchies: {
                    age: [
                        ['25', '20-29', '18-35', '*'],
                    ],
                },
                targetLevel: 1,
            };
            const result = enforcer.applyGeneralization(rows, config);
            (0, globals_1.expect)(result.warnings.some(w => w.code === 'GENERALIZATION_APPLIED')).toBe(true);
            (0, globals_1.expect)(result.rows[0].dimensions.age).toBe('20-29');
        });
    });
    (0, globals_1.describe)('Full Policy Enforcement', () => {
        (0, globals_1.it)('should apply multiple policies in priority order', async () => {
            const rows = [
                { dimensions: { type: 'person' }, measures: { count: 100 }, privacyAffected: false, cohortSize: 100 },
                { dimensions: { type: 'vehicle' }, measures: { count: 3 }, privacyAffected: false, cohortSize: 3 },
                { dimensions: { type: 'location' }, measures: { count: 50 }, privacyAffected: false, cohortSize: 50 },
            ];
            const policies = [
                {
                    id: 'policy-1',
                    name: 'K-Anonymity',
                    description: 'Test k-anonymity policy',
                    enabled: true,
                    mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                    kAnonymity: {
                        minCohortSize: 5,
                        violationAction: 'suppress',
                    },
                    applicableSources: [index_js_1.DataSource.ENTITIES],
                    priority: 100,
                    auditLevel: 'summary',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            const context = {
                executionId: 'test-123',
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['analyst'],
                policies,
                timestamp: new Date(),
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
            };
            const result = await enforcer.enforce({
                query,
                context,
                rawResults: rows,
            });
            (0, globals_1.expect)(result.rows).toHaveLength(2);
            (0, globals_1.expect)(result.suppressedCount).toBe(1);
            (0, globals_1.expect)(result.status).toBe(index_js_1.QueryStatus.PARTIAL);
            (0, globals_1.expect)(result.appliedPolicies).toContain('policy-1');
        });
        (0, globals_1.it)('should return SUPPRESSED status when all rows filtered', async () => {
            const rows = [
                { dimensions: { type: 'rare' }, measures: { count: 1 }, privacyAffected: false, cohortSize: 1 },
                { dimensions: { type: 'unique' }, measures: { count: 2 }, privacyAffected: false, cohortSize: 2 },
            ];
            const policies = [
                {
                    id: 'strict-policy',
                    name: 'Strict K-Anonymity',
                    description: 'Strict policy',
                    enabled: true,
                    mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                    kAnonymity: {
                        minCohortSize: 10,
                        violationAction: 'suppress',
                    },
                    applicableSources: [index_js_1.DataSource.ENTITIES],
                    priority: 100,
                    auditLevel: 'summary',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            const context = {
                executionId: 'test-456',
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['analyst'],
                policies,
                timestamp: new Date(),
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
            };
            const result = await enforcer.enforce({
                query,
                context,
                rawResults: rows,
            });
            (0, globals_1.expect)(result.rows).toHaveLength(0);
            (0, globals_1.expect)(result.status).toBe(index_js_1.QueryStatus.SUPPRESSED);
            (0, globals_1.expect)(result.warnings.some(w => w.code === 'ALL_ROWS_SUPPRESSED')).toBe(true);
        });
        (0, globals_1.it)('should skip disabled policies', async () => {
            const rows = [
                { dimensions: { type: 'person' }, measures: { count: 2 }, privacyAffected: false, cohortSize: 2 },
            ];
            const policies = [
                {
                    id: 'disabled-policy',
                    name: 'Disabled Policy',
                    description: 'Should be skipped',
                    enabled: false, // Disabled
                    mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                    kAnonymity: {
                        minCohortSize: 10,
                        violationAction: 'suppress',
                    },
                    applicableSources: [index_js_1.DataSource.ENTITIES],
                    priority: 100,
                    auditLevel: 'summary',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            const context = {
                executionId: 'test-789',
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['analyst'],
                policies,
                timestamp: new Date(),
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
            };
            const result = await enforcer.enforce({
                query,
                context,
                rawResults: rows,
            });
            // Disabled policy should not filter the row
            (0, globals_1.expect)(result.rows).toHaveLength(1);
            (0, globals_1.expect)(result.appliedPolicies).not.toContain('disabled-policy');
        });
    });
    (0, globals_1.describe)('Policy Validation', () => {
        (0, globals_1.it)('should validate policy with missing ID', () => {
            const policy = {
                id: '',
                name: 'Test',
                description: 'Test',
                enabled: true,
                mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                applicableSources: [],
                priority: 100,
                auditLevel: 'summary',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = enforcer.validatePolicy(policy);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Policy ID is required');
        });
        (0, globals_1.it)('should validate k-anonymity config', () => {
            const policy = {
                id: 'test',
                name: 'Test',
                description: 'Test',
                enabled: true,
                mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                kAnonymity: {
                    minCohortSize: 0, // Invalid
                    violationAction: 'suppress',
                },
                applicableSources: [],
                priority: 100,
                auditLevel: 'summary',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = enforcer.validatePolicy(policy);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('minCohortSize'))).toBe(true);
        });
        (0, globals_1.it)('should pass valid policy', () => {
            const policy = {
                id: 'valid-policy',
                name: 'Valid Policy',
                description: 'A valid policy',
                enabled: true,
                mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                kAnonymity: {
                    minCohortSize: 5,
                    violationAction: 'suppress',
                },
                applicableSources: [index_js_1.DataSource.ENTITIES],
                priority: 100,
                auditLevel: 'summary',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = enforcer.validatePolicy(policy);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
    });
});

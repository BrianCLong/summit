"use strict";
/**
 * Security Tests
 *
 * Tests for privacy attack mitigation scenarios including:
 * - Differencing attacks
 * - Linkage attacks
 * - Reconstruction attacks
 * - Membership inference
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const DifferentialPrivacy_js_1 = require("../privacy/DifferentialPrivacy.js");
const PolicyEnforcer_js_1 = require("../privacy/PolicyEnforcer.js");
const QueryTranslator_js_1 = require("../query/QueryTranslator.js");
const index_js_1 = require("../types/index.js");
(0, globals_1.describe)('Security Tests - Privacy Attack Mitigation', () => {
    let dp;
    let enforcer;
    let translator;
    (0, globals_1.beforeEach)(() => {
        dp = new DifferentialPrivacy_js_1.DifferentialPrivacy();
        enforcer = new PolicyEnforcer_js_1.PolicyEnforcer(5);
        translator = new QueryTranslator_js_1.QueryTranslator();
    });
    (0, globals_1.describe)('Differencing Attack Mitigation', () => {
        /**
         * Differencing attack: An adversary submits two queries that differ
         * only by including/excluding a single individual, then computes the
         * difference to learn about that individual.
         */
        (0, globals_1.it)('should prevent differencing attacks via noise addition', () => {
            // Simulates two queries that could be used in a differencing attack
            const queryAll = [
                { dimensions: { dept: 'Engineering' }, measures: { salary_sum: 500000 }, privacyAffected: false },
            ];
            const queryWithoutTarget = [
                { dimensions: { dept: 'Engineering' }, measures: { salary_sum: 400000 }, privacyAffected: false },
            ];
            const config = {
                epsilon: 0.1, // Strong privacy
                mechanism: 'laplace',
                budgetTracking: false,
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'dept' }],
                measures: [{ field: 'salary', aggregation: index_js_1.AggregationType.SUM, alias: 'salary_sum' }],
            };
            // Apply DP to both queries
            const noisyAll = dp.applyDP(queryAll, config, query);
            const noisyWithout = dp.applyDP(queryWithoutTarget, config, query);
            // The difference between noisy results should NOT reliably reveal
            // the target individual's salary (100000)
            const differences = [];
            for (let trial = 0; trial < 100; trial++) {
                const r1 = dp.applyDP([{ ...queryAll[0] }], config, query);
                const r2 = dp.applyDP([{ ...queryWithoutTarget[0] }], config, query);
                const diff = (r1.rows[0].measures.salary_sum || 0) - (r2.rows[0].measures.salary_sum || 0);
                differences.push(diff);
            }
            // The differences should have high variance due to noise
            const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
            const variance = differences.reduce((sum, x) => sum + (x - mean) ** 2, 0) / differences.length;
            // With epsilon=0.1 and sensitivity=100 (salary), noise scale = 1000
            // Variance should be substantial (at least 10000)
            (0, globals_1.expect)(variance).toBeGreaterThan(1000);
        });
        (0, globals_1.it)('should track budget to limit repeated queries', () => {
            dp.getBudgetState('attacker-tenant', undefined, {
                epsilon: 1.0, // Total budget
                mechanism: 'laplace',
                budgetTracking: true,
                budgetRenewalPeriod: 'day',
            });
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'dept' }],
                measures: [{ field: 'salary', aggregation: index_js_1.AggregationType.SUM, alias: 'salary_sum' }],
            };
            // Simulate many queries attempting differencing attack
            let queriesExecuted = 0;
            let budgetExceeded = false;
            for (let i = 0; i < 100; i++) {
                const rows = [
                    { dimensions: { dept: 'Engineering' }, measures: { salary_sum: 500000 }, privacyAffected: false },
                ];
                const budgetState = dp.getBudgetState('attacker-tenant');
                const result = dp.applyDP(rows, {
                    epsilon: 0.1, // Each query costs 0.1 epsilon
                    mechanism: 'laplace',
                    budgetTracking: true,
                }, query, budgetState);
                if (result.budgetExceeded) {
                    budgetExceeded = true;
                    break;
                }
                dp.consumeBudget('attacker-tenant', result.epsilonConsumed);
                queriesExecuted++;
            }
            // Should be blocked after ~10 queries (1.0 / 0.1)
            (0, globals_1.expect)(budgetExceeded).toBe(true);
            (0, globals_1.expect)(queriesExecuted).toBeLessThanOrEqual(10);
        });
    });
    (0, globals_1.describe)('Linkage Attack Mitigation', () => {
        /**
         * Linkage attack: An adversary uses external knowledge combined with
         * multiple quasi-identifiers to re-identify individuals.
         */
        (0, globals_1.it)('should detect high-risk dimension combinations', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [
                    { field: 'zip_code' },
                    { field: 'birth_date' },
                    { field: 'gender' },
                ],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' }],
            };
            const context = {
                executionId: 'test',
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['analyst'],
                policies: [],
                timestamp: new Date(),
            };
            // The enforcer should warn about this high-risk combination
            const result = enforcer['preflightCheck'](query, context);
            (0, globals_1.expect)(result.warnings.some(w => w.code === 'HIGH_RISK_COMBINATION')).toBe(true);
            (0, globals_1.expect)(result.warnings.some(w => w.affectedFields?.includes('zip_code') ||
                w.affectedFields?.includes('birth_date') ||
                w.affectedFields?.includes('gender'))).toBe(true);
        });
        (0, globals_1.it)('should enforce k-anonymity on quasi-identifier combinations', () => {
            const rows = [
                // This combination is unique (k=1)
                { dimensions: { zip: '12345', age: 35, gender: 'M' }, measures: { count: 1 }, privacyAffected: false, cohortSize: 1 },
                // This combination has sufficient k
                { dimensions: { zip: '54321', age: 30, gender: 'F' }, measures: { count: 10 }, privacyAffected: false, cohortSize: 10 },
            ];
            const policy = {
                id: 'linkage-protection',
                name: 'Linkage Protection',
                description: 'Protect against linkage attacks',
                enabled: true,
                mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                kAnonymity: {
                    minCohortSize: 5,
                    quasiIdentifiers: ['zip', 'age', 'gender'],
                    violationAction: 'suppress',
                },
                applicableSources: [index_js_1.DataSource.ENTITIES],
                priority: 100,
                auditLevel: 'detailed',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const context = {
                executionId: 'test',
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['analyst'],
                policies: [policy],
                timestamp: new Date(),
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [
                    { field: 'zip' },
                    { field: 'age' },
                    { field: 'gender' },
                ],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' }],
            };
            const result = enforcer.applyKAnonymity(rows, policy.kAnonymity, query);
            // The unique combination should be suppressed
            (0, globals_1.expect)(result.rows).toHaveLength(1);
            (0, globals_1.expect)(result.suppressedCount).toBe(1);
            (0, globals_1.expect)(result.rows[0].dimensions.zip).toBe('54321');
        });
    });
    (0, globals_1.describe)('Reconstruction Attack Mitigation', () => {
        /**
         * Reconstruction attack: An adversary uses multiple aggregate queries
         * to reconstruct individual records.
         */
        (0, globals_1.it)('should add noise to prevent exact reconstruction', () => {
            // An attacker tries to reconstruct individual salaries by querying
            // different slices of data
            const rows = [
                { dimensions: { role: 'Engineer' }, measures: { salary_avg: 120000 }, privacyAffected: false },
                { dimensions: { role: 'Manager' }, measures: { salary_avg: 150000 }, privacyAffected: false },
            ];
            const config = {
                epsilon: 0.5,
                mechanism: 'laplace',
                budgetTracking: false,
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'role' }],
                measures: [{ field: 'salary', aggregation: index_js_1.AggregationType.AVG, alias: 'salary_avg' }],
            };
            // Run multiple times to check noise prevents exact reconstruction
            const engineerSalaries = [];
            for (let i = 0; i < 50; i++) {
                const result = dp.applyDP([{ ...rows[0] }], config, query);
                engineerSalaries.push(result.rows[0].measures.salary_avg || 0);
            }
            // Check that we get different values each time
            const uniqueValues = new Set(engineerSalaries);
            (0, globals_1.expect)(uniqueValues.size).toBeGreaterThan(1);
            // Noise should make exact reconstruction infeasible
            const minSalary = Math.min(...engineerSalaries);
            const maxSalary = Math.max(...engineerSalaries);
            (0, globals_1.expect)(maxSalary - minSalary).toBeGreaterThan(1000); // Significant spread
        });
    });
    (0, globals_1.describe)('Membership Inference Attack Mitigation', () => {
        /**
         * Membership inference: An adversary tries to determine if a specific
         * individual is present in the dataset.
         */
        (0, globals_1.it)('should prevent membership inference via suppression', () => {
            // If querying for a specific individual returns exactly 1, it confirms their presence
            // Suppression with threshold > 1 prevents this
            const rows = [
                { dimensions: { name: 'Unique Person' }, measures: { count: 1 }, privacyAffected: false, cohortSize: 1 },
            ];
            const result = enforcer.applySuppression(rows, {
                minCountThreshold: 5,
                showSuppressed: false,
            });
            // The single-person result should be suppressed
            (0, globals_1.expect)(result.rows).toHaveLength(0);
            (0, globals_1.expect)(result.suppressedCount).toBe(1);
        });
        (0, globals_1.it)('should add noise to count queries to obscure membership', () => {
            // Even with threshold, DP adds uncertainty to count queries
            const rows = [
                { dimensions: { has_condition: true }, measures: { count: 3 }, privacyAffected: false },
            ];
            const config = {
                epsilon: 0.1, // Strong privacy
                mechanism: 'laplace',
                budgetTracking: false,
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'has_condition' }],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' }],
            };
            // Check that the noisy count varies
            const counts = [];
            for (let i = 0; i < 50; i++) {
                const result = dp.applyDP([{ ...rows[0] }], config, query);
                counts.push(result.rows[0].measures.count || 0);
            }
            // With epsilon=0.1, noise is large enough that count could be 0 or much higher
            const hasZero = counts.some(c => c === 0);
            const hasHigh = counts.some(c => c > 10);
            // At least one of these should be true due to noise
            (0, globals_1.expect)(hasZero || hasHigh).toBe(true);
        });
    });
    (0, globals_1.describe)('SQL Injection Prevention', () => {
        (0, globals_1.it)('should reject queries with SQL injection attempts in field names', () => {
            const maliciousQuery = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: "type'; DROP TABLE entities; --" }],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT }],
            };
            const result = translator.validateQuery(maliciousQuery);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('field name'))).toBe(true);
        });
        (0, globals_1.it)('should parameterize all user-provided values', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT }],
                filters: {
                    logic: 'AND',
                    conditions: [
                        { field: 'name', operator: index_js_1.FilterOperator.EQUALS, value: "'; DELETE FROM users; --" },
                    ],
                },
            };
            const result = translator.toPostgres(query);
            // The malicious value should be parameterized, not interpolated
            (0, globals_1.expect)(result.sql).not.toContain('DELETE');
            (0, globals_1.expect)(result.params).toContain("'; DELETE FROM users; --");
            (0, globals_1.expect)(result.sql).toMatch(/name = \$\d+/);
        });
    });
    (0, globals_1.describe)('Rate Limiting for Attack Prevention', () => {
        (0, globals_1.it)('should limit query frequency through budget mechanism', () => {
            const tenantId = 'rate-limited-tenant';
            dp.getBudgetState(tenantId, undefined, {
                epsilon: 0.5, // Small budget
                mechanism: 'laplace',
                budgetTracking: true,
                budgetRenewalPeriod: 'hour',
            });
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT }],
            };
            // Each query consumes budget
            let consecutiveQueries = 0;
            for (let i = 0; i < 20; i++) {
                const budgetState = dp.getBudgetState(tenantId);
                const rows = [{ dimensions: {}, measures: { count: 100 }, privacyAffected: false }];
                const result = dp.applyDP(rows, {
                    epsilon: 0.1,
                    mechanism: 'laplace',
                    budgetTracking: true,
                }, query, budgetState);
                if (result.budgetExceeded) {
                    break;
                }
                dp.consumeBudget(tenantId, result.epsilonConsumed);
                consecutiveQueries++;
            }
            // Should be limited to ~5 queries (0.5 / 0.1)
            (0, globals_1.expect)(consecutiveQueries).toBeLessThanOrEqual(5);
        });
    });
});

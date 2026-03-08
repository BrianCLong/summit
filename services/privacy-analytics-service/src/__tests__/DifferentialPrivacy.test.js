"use strict";
/**
 * Differential Privacy Module Tests
 *
 * Tests for the differential privacy mechanisms including:
 * - Laplace mechanism
 * - Gaussian mechanism
 * - Budget tracking
 * - Noise application
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const DifferentialPrivacy_js_1 = require("../privacy/DifferentialPrivacy.js");
const index_js_1 = require("../types/index.js");
(0, globals_1.describe)('DifferentialPrivacy', () => {
    let dp;
    (0, globals_1.beforeEach)(() => {
        dp = new DifferentialPrivacy_js_1.DifferentialPrivacy({
            countSensitivity: 1,
            sumSensitivity: 100,
            avgSensitivity: 10,
            fieldSensitivities: {},
        });
    });
    (0, globals_1.describe)('Laplace Mechanism', () => {
        (0, globals_1.it)('should generate noise with correct distribution properties', () => {
            const scale = 1.0;
            const samples = [];
            // Generate many samples
            for (let i = 0; i < 10000; i++) {
                samples.push(dp.laplaceMechanism(scale));
            }
            // Check mean is close to 0
            const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
            (0, globals_1.expect)(Math.abs(mean)).toBeLessThan(0.1);
            // Check variance is close to 2*scale^2 for Laplace
            const variance = samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples.length;
            const expectedVariance = 2 * scale * scale;
            (0, globals_1.expect)(Math.abs(variance - expectedVariance)).toBeLessThan(0.2);
        });
        (0, globals_1.it)('should scale noise with epsilon', () => {
            const highEpsNoise = [];
            const lowEpsNoise = [];
            for (let i = 0; i < 1000; i++) {
                highEpsNoise.push(Math.abs(dp.laplaceMechanism(1 / 10))); // high epsilon = low noise
                lowEpsNoise.push(Math.abs(dp.laplaceMechanism(1 / 0.1))); // low epsilon = high noise
            }
            const avgHighEps = highEpsNoise.reduce((a, b) => a + b, 0) / highEpsNoise.length;
            const avgLowEps = lowEpsNoise.reduce((a, b) => a + b, 0) / lowEpsNoise.length;
            // Low epsilon should produce larger noise
            (0, globals_1.expect)(avgLowEps).toBeGreaterThan(avgHighEps * 5);
        });
    });
    (0, globals_1.describe)('Gaussian Mechanism', () => {
        (0, globals_1.it)('should generate noise with approximately normal distribution', () => {
            const scale = 1.0;
            const delta = 1e-5;
            const samples = [];
            for (let i = 0; i < 10000; i++) {
                samples.push(dp.gaussianMechanism(scale, delta));
            }
            // Check mean is close to 0
            const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
            (0, globals_1.expect)(Math.abs(mean)).toBeLessThan(0.1);
            // Most samples should be within 3 standard deviations
            const sigma = scale * Math.sqrt(2 * Math.log(1.25 / delta));
            const withinThreeSigma = samples.filter(x => Math.abs(x) < 3 * sigma).length;
            (0, globals_1.expect)(withinThreeSigma / samples.length).toBeGreaterThan(0.99);
        });
    });
    (0, globals_1.describe)('Noise Application', () => {
        (0, globals_1.it)('should add noise to all measures in result rows', () => {
            const rows = [
                {
                    dimensions: { type: 'person' },
                    measures: { count: 100, sum_value: 5000 },
                    privacyAffected: false,
                },
                {
                    dimensions: { type: 'organization' },
                    measures: { count: 50, sum_value: 2500 },
                    privacyAffected: false,
                },
            ];
            const config = {
                epsilon: 1.0,
                mechanism: 'laplace',
                budgetTracking: false,
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                    { field: 'value', aggregation: index_js_1.AggregationType.SUM, alias: 'sum_value' },
                ],
            };
            const result = dp.applyDP(rows, config, query);
            (0, globals_1.expect)(result.budgetExceeded).toBe(false);
            (0, globals_1.expect)(result.rows).toHaveLength(2);
            // Values should be different (with high probability)
            (0, globals_1.expect)(result.rows[0].measures.count).not.toBe(100);
            (0, globals_1.expect)(result.rows[0].privacyAffected).toBe(true);
            // Values should be non-negative (counts can't be negative)
            (0, globals_1.expect)(result.rows[0].measures.count).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.rows[1].measures.count).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should preserve null values', () => {
            const rows = [
                {
                    dimensions: { type: 'person' },
                    measures: { count: 100, avg_value: null },
                    privacyAffected: false,
                },
            ];
            const config = {
                epsilon: 1.0,
                mechanism: 'laplace',
                budgetTracking: false,
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                    { field: 'value', aggregation: index_js_1.AggregationType.AVG, alias: 'avg_value' },
                ],
            };
            const result = dp.applyDP(rows, config, query);
            (0, globals_1.expect)(result.rows[0].measures.avg_value).toBeNull();
        });
    });
    (0, globals_1.describe)('Budget Tracking', () => {
        (0, globals_1.it)('should initialize budget state correctly', () => {
            const state = dp.getBudgetState('tenant-1', 'user-1', {
                epsilon: 2.0,
                mechanism: 'laplace',
                budgetTracking: true,
                budgetRenewalPeriod: 'day',
            });
            (0, globals_1.expect)(state.tenantId).toBe('tenant-1');
            (0, globals_1.expect)(state.userId).toBe('user-1');
            (0, globals_1.expect)(state.totalBudget).toBe(2.0);
            (0, globals_1.expect)(state.spentBudget).toBe(0);
            (0, globals_1.expect)(state.queryCount).toBe(0);
        });
        (0, globals_1.it)('should consume budget correctly', () => {
            // Initialize budget
            dp.getBudgetState('tenant-2', 'user-2', {
                epsilon: 5.0,
                mechanism: 'laplace',
                budgetTracking: true,
                budgetRenewalPeriod: 'day',
            });
            // Consume some budget
            const updated = dp.consumeBudget('tenant-2', 1.5, 'user-2');
            (0, globals_1.expect)(updated.spentBudget).toBe(1.5);
            (0, globals_1.expect)(updated.queryCount).toBe(1);
        });
        (0, globals_1.it)('should reject query when budget exceeded', () => {
            // Initialize budget
            const initialState = dp.getBudgetState('tenant-3', undefined, {
                epsilon: 1.0,
                mechanism: 'laplace',
                budgetTracking: true,
                budgetRenewalPeriod: 'day',
            });
            // Consume most of the budget
            dp.consumeBudget('tenant-3', 0.9);
            const rows = [
                {
                    dimensions: { type: 'person' },
                    measures: { count: 100 },
                    privacyAffected: false,
                },
            ];
            const config = {
                epsilon: 0.5, // This would require more budget than available
                mechanism: 'laplace',
                budgetTracking: true,
            };
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
            };
            // Get updated budget state
            const budgetState = {
                ...initialState,
                spentBudget: 0.9,
                queryCount: 1,
            };
            const result = dp.applyDP(rows, config, query, budgetState);
            (0, globals_1.expect)(result.budgetExceeded).toBe(true);
            (0, globals_1.expect)(result.rows).toHaveLength(0);
            (0, globals_1.expect)(result.warnings.some(w => w.code === 'BUDGET_EXCEEDED')).toBe(true);
        });
        (0, globals_1.it)('should reset budget correctly', () => {
            dp.getBudgetState('tenant-4', undefined, {
                epsilon: 1.0,
                mechanism: 'laplace',
                budgetTracking: true,
            });
            dp.consumeBudget('tenant-4', 0.5);
            dp.resetBudget('tenant-4');
            const newState = dp.getBudgetState('tenant-4', undefined, {
                epsilon: 1.0,
                mechanism: 'laplace',
                budgetTracking: true,
            });
            (0, globals_1.expect)(newState.spentBudget).toBe(0);
            (0, globals_1.expect)(newState.queryCount).toBe(0);
        });
    });
    (0, globals_1.describe)('Sensitivity Calculation', () => {
        (0, globals_1.it)('should use correct default sensitivities', () => {
            (0, globals_1.expect)(dp.getSensitivity('id', 'count')).toBe(1);
            (0, globals_1.expect)(dp.getSensitivity('value', 'sum')).toBe(100);
            (0, globals_1.expect)(dp.getSensitivity('value', 'avg')).toBe(10);
        });
        (0, globals_1.it)('should use field-specific sensitivities when configured', () => {
            const dpWithCustom = new DifferentialPrivacy_js_1.DifferentialPrivacy({
                countSensitivity: 1,
                sumSensitivity: 100,
                avgSensitivity: 10,
                fieldSensitivities: {
                    salary: 50000,
                    age: 120,
                },
            });
            (0, globals_1.expect)(dpWithCustom.getSensitivity('salary', 'sum')).toBe(50000);
            (0, globals_1.expect)(dpWithCustom.getSensitivity('age', 'avg')).toBe(120);
            (0, globals_1.expect)(dpWithCustom.getSensitivity('other_field', 'count')).toBe(1);
        });
    });
    (0, globals_1.describe)('Composition Bounds', () => {
        (0, globals_1.it)('should calculate advanced composition bounds', () => {
            const { totalEpsilon, totalDelta } = dp.advancedCompositionBound(0.1, // epsilon per query
            1e-5, // delta per query
            100 // number of queries
            );
            // Should be better than simple composition (100 * 0.1 = 10)
            (0, globals_1.expect)(totalEpsilon).toBeLessThan(10);
            (0, globals_1.expect)(totalDelta).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should estimate remaining queries under budget', () => {
            const remaining = dp.estimateRemainingQueries(1.0, // target epsilon
            1e-5, // target delta
            0.1, // per-query epsilon
            1e-7 // per-query delta
            );
            (0, globals_1.expect)(remaining).toBeGreaterThan(0);
            (0, globals_1.expect)(remaining).toBeLessThan(1000); // Should be bounded
        });
    });
    (0, globals_1.describe)('Exponential Mechanism', () => {
        (0, globals_1.it)('should select candidates based on scores', () => {
            const candidates = ['A', 'B', 'C', 'D'];
            const scores = { A: 1, B: 5, C: 10, D: 2 };
            // Run many times to check distribution
            const selections = { A: 0, B: 0, C: 0, D: 0 };
            for (let i = 0; i < 1000; i++) {
                const selected = dp.exponentialMechanism(candidates, c => scores[c], 1.0, 1);
                selections[selected]++;
            }
            // Highest scoring item (C) should be selected most often
            (0, globals_1.expect)(selections.C).toBeGreaterThan(selections.A);
            (0, globals_1.expect)(selections.C).toBeGreaterThan(selections.D);
        });
        (0, globals_1.it)('should handle single candidate', () => {
            const result = dp.exponentialMechanism(['only'], () => 1, 1.0, 1);
            (0, globals_1.expect)(result).toBe('only');
        });
        (0, globals_1.it)('should throw on empty candidates', () => {
            (0, globals_1.expect)(() => {
                dp.exponentialMechanism([], () => 1, 1.0, 1);
            }).toThrow();
        });
    });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_assert_1 = __importDefault(require("node:assert"));
const engine_js_1 = require("./engine.js");
(0, globals_1.describe)('Cross-Domain Scenario Simulation', () => {
    const engine = new engine_js_1.ScenarioEngine();
    const baseState = {
        timeMonth: 0,
        tenantCount: 100,
        totalCost: 0,
        reliabilityScore: 1.0,
        complianceScore: 1.0,
        autonomyAdoption: 0.1,
        activeRegulation: [],
        metrics: {},
        violations: []
    };
    (0, globals_1.it)('should run a Conservative Future (Scenario A)', () => {
        const scenarioA = {
            id: 'SCN-2025-A',
            name: 'Conservative',
            description: 'Slow growth, high regulation',
            horizonMonths: 24,
            resolution: 'quarterly',
            domains: ['cost', 'reliability', 'autonomy', 'regulatory'],
            initialState: baseState,
            parameters: {
                growthRate: 0.02, // 2% monthly
                regulatoryStrictness: 'high',
                autonomyLevel: 'tier1',
                baseCostPerTenant: 100,
                incidentBaseline: 0.001
            }
        };
        const result = engine.runSimulation(scenarioA);
        node_assert_1.default.strictEqual(result.status, 'success');
        node_assert_1.default.strictEqual(result.timeline.length, 9); // Initial + 8 quarters
        node_assert_1.default.ok(result.aggregateMetrics.totalTCO > 0);
        // Conservative = strict reg = low autonomy adoption
        const finalState = result.timeline[result.timeline.length - 1];
        node_assert_1.default.ok(finalState.autonomyAdoption <= 0.3, 'Autonomy adoption should be capped');
    });
    (0, globals_1.it)('should run an Aggressive Future (Scenario C)', () => {
        const scenarioC = {
            id: 'SCN-2025-C',
            name: 'Aggressive',
            description: 'High growth, permissive reg',
            horizonMonths: 24,
            resolution: 'quarterly',
            domains: ['cost', 'reliability', 'autonomy', 'regulatory'],
            initialState: baseState,
            parameters: {
                growthRate: 0.05, // 5% monthly
                regulatoryStrictness: 'low',
                autonomyLevel: 'tier3',
                baseCostPerTenant: 100,
                incidentBaseline: 0.001
            }
        };
        const result = engine.runSimulation(scenarioC);
        node_assert_1.default.strictEqual(result.status, 'success');
        // Aggressive = high growth
        const finalState = result.timeline[result.timeline.length - 1];
        node_assert_1.default.ok(finalState.tenantCount > baseState.tenantCount * 2, 'Tenant count should grow significantly');
        node_assert_1.default.ok(finalState.autonomyAdoption > 0.3, 'Autonomy adoption should be high');
    });
    (0, globals_1.it)('should detect invariants', () => {
        // Force a failure
        const scenarioFail = {
            id: 'SCN-FAIL',
            name: 'Failure Mode',
            description: 'High risk',
            horizonMonths: 12,
            resolution: 'monthly',
            domains: ['cost', 'reliability'],
            initialState: baseState,
            parameters: {
                growthRate: 0.50, // Massive growth
                regulatoryStrictness: 'low',
                autonomyLevel: 'tier3',
                baseCostPerTenant: 100,
                incidentBaseline: 0.1 // High incident rate
            }
        };
        const result = engine.runSimulation(scenarioFail);
        const violations = result.timeline.flatMap(t => t.violations);
        node_assert_1.default.ok(violations.length > 0, 'Should have invariant violations');
    });
});

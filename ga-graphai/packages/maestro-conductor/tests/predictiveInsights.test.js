"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const predictive_insights_js_1 = require("../src/predictive-insights.js");
const cost_guard_1 = require("@ga-graphai/cost-guard");
const load_golden_intelgraph_js_1 = require("../../../../scripts/testing/load-golden-intelgraph.js");
(0, vitest_1.describe)('PredictiveInsightEngine', () => {
    let knowledgeGraph;
    let costGuard;
    let scenario;
    (0, vitest_1.beforeEach)(async () => {
        const loaded = await (0, load_golden_intelgraph_js_1.loadGoldenIntelGraph)({ scenario: 'toy' });
        // Toy scenario keeps readiness checks fast while exercising golden fixtures.
        knowledgeGraph = loaded.graph;
        scenario = loaded.scenario;
        costGuard = new cost_guard_1.CostGuard();
    });
    (0, vitest_1.it)('builds readiness insight blending risk and health signals', () => {
        const serviceId = scenario.services[0].id;
        const environmentId = scenario.environments[0].id;
        const engine = new predictive_insights_js_1.PredictiveInsightEngine({
            knowledgeGraph,
            costGuard,
            riskThresholds: { high: 0.6, medium: 0.35 },
        });
        const latencySignal = {
            assetId: serviceId,
            metric: 'latency_p99',
            value: 1200,
            timestamp: new Date(),
        };
        engine.observeHealthSignal(latencySignal);
        const insight = engine.buildInsight(serviceId, environmentId);
        (0, vitest_1.expect)(insight).toBeDefined();
        (0, vitest_1.expect)(insight?.readinessScore).toBeLessThanOrEqual(1);
        (0, vitest_1.expect)(insight?.recommendations.some((rec) => rec.includes('release readiness survey'))).toBe(true);
    });
    (0, vitest_1.it)('returns high risk insights sorted by score', () => {
        const engine = new predictive_insights_js_1.PredictiveInsightEngine({ knowledgeGraph, costGuard });
        const results = engine.listHighRiskInsights();
        (0, vitest_1.expect)(results.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(results[0].riskScore).toBeGreaterThanOrEqual(results[results.length - 1].riskScore);
    });
});

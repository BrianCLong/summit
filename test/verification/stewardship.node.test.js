"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const service_js_1 = require("../../server/src/stewardship/drift/service.js");
const service_js_2 = require("../../server/src/stewardship/forecast/service.js");
const engine_js_1 = require("../../server/src/stewardship/roadmap/engine.js");
const types_js_1 = require("../../server/src/stewardship/drift/types.js");
(0, node_test_1.describe)('Stewardship Governance Verification', () => {
    (0, node_test_1.test)('Drift Detection triggers on threshold crossing', async () => {
        const driftService = new service_js_1.DriftGovernanceService();
        const signals = await driftService.collectDriftSignals();
        // We expect some mock signals from our implementation
        node_assert_1.default.ok(signals.length > 0, 'Should detect mock drift signals');
        const costDrift = signals.find(s => s.type === types_js_1.DriftType.COST);
        node_assert_1.default.ok(costDrift, 'Should detect cost drift');
        node_assert_1.default.strictEqual(costDrift?.severity, types_js_1.DriftSeverity.HIGH);
    });
    (0, node_test_1.test)('Forecasts include confidence intervals and assumptions', async () => {
        const forecastService = new service_js_2.ForecastingService();
        const forecasts = await forecastService.generateForecasts();
        node_assert_1.default.ok(forecasts.length > 0);
        forecasts.forEach(f => {
            node_assert_1.default.ok(f.confidenceInterval, 'Forecast must have confidence interval');
            node_assert_1.default.ok(typeof f.confidenceInterval.lower === 'number');
            node_assert_1.default.ok(typeof f.confidenceInterval.upper === 'number');
            node_assert_1.default.ok(f.assumptions.length > 0, 'Forecast must have assumptions');
        });
    });
    (0, node_test_1.test)('Roadmap signals reference evidence', async () => {
        const driftService = new service_js_1.DriftGovernanceService();
        const forecastService = new service_js_2.ForecastingService();
        const roadmapEngine = new engine_js_1.RoadmapEngine();
        const driftSignals = await driftService.collectDriftSignals();
        const forecasts = await forecastService.generateForecasts();
        const signals = roadmapEngine.generateSignals(driftSignals, forecasts);
        node_assert_1.default.ok(signals.length > 0, 'Should generate roadmap signals');
        signals.forEach(s => {
            node_assert_1.default.ok(s.supportingEvidence, 'Roadmap signal must have supporting evidence');
            node_assert_1.default.ok(s.supportingEvidence.driftSignals.length > 0 || s.supportingEvidence.forecasts.length > 0, 'Evidence must include drift or forecasts');
        });
    });
});

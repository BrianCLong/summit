"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const node_fs_1 = require("node:fs");
const fixture = JSON.parse((0, node_fs_1.readFileSync)(new URL('../../controller/planfixtures/plan.json', import.meta.url), 'utf8'));
(0, vitest_1.describe)('ICO dashboard state', () => {
    (0, vitest_1.it)('summarises planner output deterministically', () => {
        const state = (0, index_js_1.buildDashboardState)(fixture);
        (0, vitest_1.expect)(state.totals.savingsPct).toBeCloseTo(0.566, 3);
        (0, vitest_1.expect)(state.endpoints).toHaveLength(2);
        const [first] = state.endpoints;
        (0, vitest_1.expect)(first.quantizationStrategy).toBe('int8');
        (0, vitest_1.expect)(first.savingsPct).toBeGreaterThan(0.5);
    });
    (0, vitest_1.it)('builds utilization forecast for multiple load levels', () => {
        const points = (0, index_js_1.computeUtilizationForecast)(fixture, [0.5, 1, 1.5]);
        (0, vitest_1.expect)(points).toHaveLength(3);
        (0, vitest_1.expect)(points[0].label).toBe('50% load');
        (0, vitest_1.expect)(points[2].value).toBeCloseTo(150, 1);
    });
});

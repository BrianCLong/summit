"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cost_guard_tiles_js_1 = require("../src/cost-guard-tiles.js");
(0, vitest_1.describe)('cost guard tiles', () => {
    (0, vitest_1.it)('builds p95 and kill tiles', () => {
        const tiles = (0, cost_guard_tiles_js_1.buildCostGuardTiles)({
            p95LatencyMs: 1400,
            killCount: 2,
            killReasons: { 'cartesian-product': 2 },
            sloTargetMs: 1200,
        });
        (0, vitest_1.expect)(tiles).toHaveLength(2);
        (0, vitest_1.expect)(tiles[0].status).toBe('warn');
        (0, vitest_1.expect)(tiles[1].hint).toContain('cartesian-product');
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('CibScreeningService', () => {
    (0, vitest_1.it)('should return low risk for empty input', async () => {
        const service = new index_js_1.CibScreeningService();
        const result = await service.screenGraph([]);
        (0, vitest_1.expect)(result.score).toBe(0);
    });
    (0, vitest_1.it)('should detect suspicious entities (stub)', async () => {
        const service = new index_js_1.CibScreeningService();
        const entities = [{ id: "user_bot_1", type: "account", metadata: {} }];
        const result = await service.screenGraph(entities);
        (0, vitest_1.expect)(result.score).toBeGreaterThan(0.5);
        (0, vitest_1.expect)(result.reasons).toContain("Detected suspicious entity pattern");
    });
});

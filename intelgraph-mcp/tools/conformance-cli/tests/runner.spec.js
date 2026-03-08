"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const runner_1 = require("../src/runner");
(0, vitest_1.describe)('runAll', () => {
    (0, vitest_1.it)('aggregates check results', async () => {
        const res = await (0, runner_1.runAll)('http://localhost:0');
        (0, vitest_1.expect)(res.summary.failed + res.summary.passed).toBe(res.checks.length);
    });
});

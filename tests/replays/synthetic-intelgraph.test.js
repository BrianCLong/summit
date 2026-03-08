"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const run_replay_js_1 = require("../../scripts/testing/run-replay.js");
(0, vitest_1.describe)('replay promotion - intelgraph sandbox', () => {
    (0, vitest_1.it)('classifies the synthetic write query as a persisted failure', async () => {
        const result = await (0, run_replay_js_1.runReplay)('replays/intelgraph/synthetic-known-fail.json');
        (0, vitest_1.expect)(result.status).toBe('FAIL');
    });
});

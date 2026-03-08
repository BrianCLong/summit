"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const BugReproducer_js_1 = require("../repro/BugReproducer.js");
(0, vitest_1.describe)('BugReproducer', () => {
    (0, vitest_1.it)('reproduces timeout issue', async () => {
        const reproducer = new BugReproducer_js_1.BugReproducer({
            quotas: {
                cpuMs: 1000,
                memoryMb: 128,
                wallClockMs: 200, // Short timeout for test
                maxOutputBytes: 1024,
                maxNetworkBytes: 0
            }
        });
        const result = await reproducer.reproduce('The application hangs and eventually times out');
        (0, vitest_1.expect)(result.script).toContain('setTimeout');
        (0, vitest_1.expect)(result.executionResult.status).toBe('timeout');
        (0, vitest_1.expect)(result.reproduced).toBe(true);
    });
    (0, vitest_1.it)('reproduces crash issue', async () => {
        const reproducer = new BugReproducer_js_1.BugReproducer();
        const result = await reproducer.reproduce('It crashes with an error');
        (0, vitest_1.expect)(result.script).toContain('throw new Error');
        // Depending on how SecureSandbox handles throws, it might be 'error'
        (0, vitest_1.expect)(result.executionResult.status).toBe('error');
        (0, vitest_1.expect)(result.reproduced).toBe(true);
    });
    (0, vitest_1.it)('fails to reproduce unknown issue', async () => {
        const reproducer = new BugReproducer_js_1.BugReproducer();
        const result = await reproducer.reproduce('Just a feature request');
        (0, vitest_1.expect)(result.executionResult.status).toBe('success');
        (0, vitest_1.expect)(result.reproduced).toBe(false);
    });
});

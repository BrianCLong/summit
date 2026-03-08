"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('migration runner', () => {
    (0, vitest_1.it)('performs preflight and dry-run planning', async () => {
        const store = new index_js_1.InMemoryCheckpointStore();
        const steps = [
            {
                id: 'check-connectivity',
                description: 'ensure db reachable',
                preflight: async () => ({ ok: true }),
                dryRun: async () => ['ping database'],
                apply: async () => { },
            },
        ];
        const runner = new index_js_1.MigrationRunner(store, steps);
        const plan = await runner.dryRun();
        (0, vitest_1.expect)(plan).toEqual(['ping database']);
    });
    (0, vitest_1.it)('is resumable after partial failure', async () => {
        const store = new index_js_1.InMemoryCheckpointStore();
        let applied = 0;
        const steps = [
            {
                id: 'step-1',
                description: 'first',
                apply: async () => {
                    applied += 1;
                },
            },
            {
                id: 'step-2',
                description: 'second',
                dependsOn: ['step-1'],
                apply: async () => {
                    applied += 1;
                    throw new Error('crash');
                },
            },
        ];
        const runner = new index_js_1.MigrationRunner(store, steps);
        await (0, vitest_1.expect)(runner.apply()).rejects.toThrowError(/crash/);
        // resume
        const resumedSteps = [
            steps[0],
            {
                ...steps[1],
                apply: async () => {
                    applied += 1;
                },
            },
        ];
        const resumed = new index_js_1.MigrationRunner(store, resumedSteps);
        await resumed.apply();
        (0, vitest_1.expect)(applied).toBe(3);
    });
});

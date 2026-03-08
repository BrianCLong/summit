"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const evidence_js_1 = require("../../libs/maestro/longrun/evidence.js");
const job = {
    job_id: 'longrun-test',
    goal: 'Validate evidence manifest formatting',
    scope_paths: ['libs/maestro/longrun'],
    allowed_tools: ['rg', 'pnpm'],
    mode: 'advisory',
    budgets: { perHourUsd: 5, totalUsd: 10, tokens: 1000 },
    model_policy: {
        searchModel: 'gpt-4.1-mini',
        buildModel: 'gpt-4.1',
        debugModel: 'gpt-4.1',
        maxContextTokens: 100000,
    },
    quality_gates: {
        required: ['pnpm test'],
    },
    stop_conditions: {
        maxIterations: 5,
        maxStallIterations: 2,
        maxRepeatErrors: 2,
        maxRepeatDiffs: 2,
        requireConsecutiveDone: 2,
        manualStopFile: '.maestro/STOP',
    },
};
describe('evidence manifest', () => {
    it('captures iteration summary and completion contract', () => {
        const manifest = (0, evidence_js_1.createEvidenceManifest)(job, '2026-01-10T00:00:00.000Z');
        const stopDecision = {
            status: 'stop',
            reason: 'verified-completion',
        };
        const updated = (0, evidence_js_1.recordIteration)({
            manifest,
            iteration: {
                iteration: 2,
                planStatus: { completed: 2, total: 2 },
                qualityGates: { passed: ['pnpm test'], failed: [] },
                diffSummary: { hash: 'abc', meaningful: true, changedLines: 12 },
                metrics: {
                    tokensUsed: 1200,
                    costUsd: 2.25,
                    iterationTimeMs: 120000,
                    testTimeMs: 45000,
                },
            },
            stopDecision,
            checkpointPath: '.maestro/checkpoints/longrun-test/0002',
            timestamp: '2026-01-10T00:10:00.000Z',
        });
        expect(updated).toMatchSnapshot();
    });
});

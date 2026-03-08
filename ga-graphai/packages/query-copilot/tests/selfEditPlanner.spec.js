"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const selfEditPlanner_1 = require("../src/selfEditPlanner");
const prov_ledger_1 = require("@ga-graphai/prov-ledger");
const baseProposal = {
    instruction: 'Improve summary faithfulness for regulatory filings.',
    expectedOutput: 'Self-edit patch tuned for 10-K risk sections.',
    rationale: 'Large hallucination delta in latest filing batch.',
    modelId: 'graphai-copilot-001',
    baseCheckpoint: 'ckpt-ga-main',
};
(0, vitest_1.describe)('buildSelfEditEvaluationPlan', () => {
    (0, vitest_1.it)('ranks ready self-edits ahead of queued items and enforces domain caps', () => {
        let now = new Date('2025-10-14T00:00:00.000Z');
        const registry = new prov_ledger_1.SelfEditRegistry({
            clock: () => now,
            minVerifierCount: 1,
            passScoreThreshold: 0.9,
        });
        const ready = registry.register({ ...baseProposal, domain: 'compliance' });
        registry.recordVerifierScore(ready.id, {
            verifier: 'baseline',
            score: 0.95,
            passed: true,
        });
        now = new Date('2025-10-14T00:10:00.000Z');
        const queued = registry.register({
            ...baseProposal,
            domain: 'threat-intel',
        });
        registry.recordVerifierScore(queued.id, {
            verifier: 'baseline',
            score: 0.85,
            passed: true,
        });
        now = new Date('2025-10-14T00:12:00.000Z');
        const rejected = registry.register({
            ...baseProposal,
            domain: 'compliance',
        });
        registry.recordVerifierScore(rejected.id, {
            verifier: 'safety',
            score: 0.6,
            passed: false,
        });
        now = new Date('2025-10-14T00:15:00.000Z');
        const overflow = registry.register({
            ...baseProposal,
            domain: 'compliance',
        });
        const plan = (0, selfEditPlanner_1.buildSelfEditEvaluationPlan)(registry, {
            maxPerDomain: 1,
            now: new Date('2025-10-14T00:20:00.000Z'),
        });
        (0, vitest_1.expect)(plan.map((item) => item.record.id)).toEqual([ready.id, queued.id]);
        (0, vitest_1.expect)(plan.every((item) => item.domain === item.record.domain ?? 'general')).toBe(true);
        (0, vitest_1.expect)(plan.find((item) => item.record.id === rejected.id)).toBeUndefined();
        (0, vitest_1.expect)(plan.find((item) => item.record.id === overflow.id)).toBeUndefined();
    });
    (0, vitest_1.it)('allows rejected edits to be surfaced when explicitly requested', () => {
        const now = new Date('2025-10-14T01:00:00.000Z');
        const registry = new prov_ledger_1.SelfEditRegistry({
            clock: () => now,
            minVerifierCount: 1,
            passScoreThreshold: 0.9,
        });
        const failed = registry.register({ ...baseProposal, domain: 'general' });
        registry.recordVerifierScore(failed.id, {
            verifier: 'policy',
            score: 0.4,
            passed: false,
        });
        const plan = (0, selfEditPlanner_1.buildSelfEditEvaluationPlan)(registry, {
            includeRejected: true,
            maxPerDomain: 2,
            now: new Date('2025-10-14T01:05:00.000Z'),
        });
        (0, vitest_1.expect)(plan).toHaveLength(1);
        (0, vitest_1.expect)(plan[0].record.status).toBe('rejected');
        (0, vitest_1.expect)(plan[0].priority).toBeLessThan(0);
    });
});

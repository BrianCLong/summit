"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const selfEditRegistry_1 = require("../src/selfEditRegistry");
(0, vitest_1.describe)('SelfEditRegistry', () => {
    let now;
    let registry;
    const proposal = {
        instruction: 'Refine classification heuristic for threat actor clustering.',
        expectedOutput: 'Updated clustering pipeline with lower false positive rate.',
        rationale: 'Sandbox replay shows drift on finance tenants.',
        modelId: 'graphai-respond-001',
        baseCheckpoint: 'ckpt-main-2025-09-30',
        domain: 'threat-intel',
        ttlMs: 60_000,
    };
    (0, vitest_1.beforeEach)(() => {
        now = new Date('2025-10-14T00:00:00.000Z');
        registry = new selfEditRegistry_1.SelfEditRegistry({
            clock: () => now,
            defaultTtlMs: 120_000,
            passScoreThreshold: 0.9,
            minVerifierCount: 2,
        });
    });
    (0, vitest_1.it)('registers proposals with derived expiry and initial status', () => {
        const record = registry.register(proposal);
        (0, vitest_1.expect)(record.status).toBe('proposed');
        (0, vitest_1.expect)(record.expiresAt).toBe('2025-10-14T00:01:00.000Z');
        (0, vitest_1.expect)(record.verifierScores).toHaveLength(0);
    });
    (0, vitest_1.it)('promotes self-edits to approved when verifiers succeed', () => {
        const record = registry.register(proposal);
        registry.recordVerifierScore(record.id, {
            verifier: 'baseline-regression',
            score: 0.93,
            passed: true,
        });
        now = new Date('2025-10-14T00:00:10.000Z');
        const updated = registry.recordVerifierScore(record.id, {
            verifier: 'safety-sweeps',
            score: 0.95,
            passed: true,
            rationale: 'No jailbreak regressions detected.',
        });
        (0, vitest_1.expect)(updated.status).toBe('approved');
        const card = registry.getScorecard(record.id);
        (0, vitest_1.expect)(card.ready).toBe(true);
        (0, vitest_1.expect)(card.averageScore).toBeCloseTo(0.94, 2);
    });
    (0, vitest_1.it)('rejects self-edits when any verifier fails', () => {
        const record = registry.register(proposal);
        registry.recordVerifierScore(record.id, {
            verifier: 'sandbox-metrics',
            score: 0.78,
            passed: false,
        });
        const card = registry.getScorecard(record.id);
        (0, vitest_1.expect)(card.failedChecks).toBe(1);
        (0, vitest_1.expect)(card.ready).toBe(false);
        const stored = registry.get(record.id);
        (0, vitest_1.expect)(stored?.status).toBe('rejected');
    });
    (0, vitest_1.it)('expires proposals after the TTL elapses', () => {
        const record = registry.register(proposal);
        now = new Date('2025-10-14T00:02:00.000Z');
        registry.sweepExpired();
        const expired = registry.get(record.id);
        (0, vitest_1.expect)(expired?.status).toBe('expired');
    });
});

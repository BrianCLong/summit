"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ReviewDecisionEngine_js_1 = require("./ReviewDecisionEngine.js");
const pendingItem = {
    id: 'item-1',
    type: 'entity',
    status: 'pending',
    createdAt: '2024-01-01T00:00:00.000Z',
};
(0, vitest_1.describe)('ReviewDecisionEngine', () => {
    (0, vitest_1.it)('applies a decision when no prior decision exists', () => {
        const engine = new ReviewDecisionEngine_js_1.ReviewDecisionEngine();
        const result = engine.applyDecision(pendingItem, {
            action: 'approve',
            reasonCode: 'rule_match',
            correlationId: 'corr-1',
            decidedAt: '2024-02-01T00:00:00.000Z',
        });
        (0, vitest_1.expect)(result.item.status).toBe('decided');
        (0, vitest_1.expect)(result.item.lastDecision?.action).toBe('approve');
        (0, vitest_1.expect)(result.idempotent).toBe(false);
    });
    (0, vitest_1.it)('is idempotent for the same correlation id', () => {
        const engine = new ReviewDecisionEngine_js_1.ReviewDecisionEngine();
        const initial = engine.applyDecision(pendingItem, {
            action: 'reject',
            reasonCode: 'validation_failed',
            correlationId: 'corr-2',
            decidedAt: '2024-02-02T00:00:00.000Z',
        });
        const repeat = engine.applyDecision(initial.item, {
            action: 'reject',
            reasonCode: 'validation_failed',
            correlationId: 'corr-2',
            decidedAt: '2024-02-02T00:00:00.000Z',
        });
        (0, vitest_1.expect)(repeat.idempotent).toBe(true);
        (0, vitest_1.expect)(repeat.item).toEqual(initial.item);
    });
    (0, vitest_1.it)('rejects conflicting decisions', () => {
        const engine = new ReviewDecisionEngine_js_1.ReviewDecisionEngine();
        const decided = engine.applyDecision(pendingItem, {
            action: 'approve',
            reasonCode: 'rule_match',
            correlationId: 'corr-3',
            decidedAt: '2024-02-03T00:00:00.000Z',
        });
        (0, vitest_1.expect)(() => engine.applyDecision(decided.item, {
            action: 'reject',
            reasonCode: 'manual_override',
            correlationId: 'different-corr',
            decidedAt: '2024-02-04T00:00:00.000Z',
        })).toThrow('decision_already_recorded');
    });
});

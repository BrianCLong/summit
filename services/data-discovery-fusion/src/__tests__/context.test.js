"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ContextPersistence_js_1 = require("../context/ContextPersistence.js");
(0, vitest_1.describe)('ContextPersistence', () => {
    let context;
    (0, vitest_1.beforeEach)(() => {
        context = new ContextPersistence_js_1.ContextPersistence({
            maxFeedbackHistory: 100,
            learningThreshold: 2,
            decayFactor: 0.95,
        });
    });
    const createMockFusionResult = (overrides = {}) => ({
        id: 'fusion-1',
        sourceRecords: [{ sourceId: 'src1', recordId: '1', data: { name: 'John' } }],
        fusedRecord: { name: 'John', email: 'john@example.com' },
        confidenceScore: 0.9,
        strategyUsed: 'fuzzy_match',
        conflictsResolved: [],
        lineage: {
            createdAt: new Date(),
            sources: ['src1'],
            transformations: [],
        },
        ...overrides,
    });
    (0, vitest_1.describe)('recordFeedback', () => {
        (0, vitest_1.it)('should record positive feedback', () => {
            const result = createMockFusionResult();
            const feedback = context.recordFeedback('user1', result, 'correct');
            (0, vitest_1.expect)(feedback.feedbackType).toBe('correct');
            (0, vitest_1.expect)(feedback.userId).toBe('user1');
            (0, vitest_1.expect)(feedback.targetId).toBe(result.id);
        });
        (0, vitest_1.it)('should record correction feedback', () => {
            const result = createMockFusionResult();
            const correction = { name: 'Jonathan' };
            const feedback = context.recordFeedback('user1', result, 'incorrect', correction);
            (0, vitest_1.expect)(feedback.feedbackType).toBe('incorrect');
            (0, vitest_1.expect)(feedback.correction).toEqual(correction);
        });
    });
    (0, vitest_1.describe)('getFeedback', () => {
        (0, vitest_1.it)('should retrieve feedback by target', () => {
            const result = createMockFusionResult();
            context.recordFeedback('user1', result, 'correct');
            context.recordFeedback('user2', result, 'correct');
            const feedbacks = context.getFeedback(result.id);
            (0, vitest_1.expect)(feedbacks).toHaveLength(2);
        });
        (0, vitest_1.it)('should return empty array for unknown target', () => {
            const feedbacks = context.getFeedback('unknown');
            (0, vitest_1.expect)(feedbacks).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('applyLearnedCorrections', () => {
        (0, vitest_1.it)('should apply learned corrections to fusion result', () => {
            const result = createMockFusionResult({
                fusedRecord: { name: 'John', status: 'active' },
            });
            // Record multiple corrections to trigger learning
            context.recordFeedback('user1', result, 'incorrect', { status: 'inactive' });
            context.recordFeedback('user2', result, 'incorrect', { status: 'inactive' });
            const corrected = context.applyLearnedCorrections(result);
            // After learning threshold is met, corrections should be applied
            (0, vitest_1.expect)(corrected.fusedRecord.status).toBe('inactive');
        });
    });
    (0, vitest_1.describe)('getStats', () => {
        (0, vitest_1.it)('should return feedback statistics', () => {
            const result = createMockFusionResult();
            context.recordFeedback('user1', result, 'correct');
            context.recordFeedback('user2', result, 'incorrect');
            const stats = context.getStats();
            (0, vitest_1.expect)(stats.totalFeedback).toBe(2);
            (0, vitest_1.expect)(stats.correctFeedback).toBe(1);
            (0, vitest_1.expect)(stats.incorrectFeedback).toBe(1);
            (0, vitest_1.expect)(stats.accuracyRate).toBe(0.5);
        });
    });
    (0, vitest_1.describe)('recordPreference', () => {
        (0, vitest_1.it)('should store and retrieve user preferences', () => {
            context.recordPreference('src1', 'dateFormat', 'ISO8601');
            const pref = context.getPreference('src1', 'dateFormat');
            (0, vitest_1.expect)(pref).toBe('ISO8601');
        });
    });
    (0, vitest_1.describe)('exportContexts / importContexts', () => {
        (0, vitest_1.it)('should export and import contexts', () => {
            const result = createMockFusionResult();
            context.recordFeedback('user1', result, 'correct');
            context.recordPreference('src1', 'test', 'value');
            const exported = context.exportContexts();
            const newContext = new ContextPersistence_js_1.ContextPersistence();
            newContext.importContexts(exported);
            (0, vitest_1.expect)(newContext.getPreference('src1', 'test')).toBe('value');
        });
    });
});

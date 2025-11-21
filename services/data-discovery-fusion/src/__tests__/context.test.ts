import { describe, it, expect, beforeEach } from 'vitest';
import { ContextPersistence } from '../context/ContextPersistence.js';
import { FusionResult } from '../types.js';

describe('ContextPersistence', () => {
  let context: ContextPersistence;

  beforeEach(() => {
    context = new ContextPersistence({
      maxFeedbackHistory: 100,
      learningThreshold: 2,
      decayFactor: 0.95,
    });
  });

  const createMockFusionResult = (overrides: Partial<FusionResult> = {}): FusionResult => ({
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

  describe('recordFeedback', () => {
    it('should record positive feedback', () => {
      const result = createMockFusionResult();
      const feedback = context.recordFeedback('user1', result, 'correct');

      expect(feedback.feedbackType).toBe('correct');
      expect(feedback.userId).toBe('user1');
      expect(feedback.targetId).toBe(result.id);
    });

    it('should record correction feedback', () => {
      const result = createMockFusionResult();
      const correction = { name: 'Jonathan' };
      const feedback = context.recordFeedback('user1', result, 'incorrect', correction);

      expect(feedback.feedbackType).toBe('incorrect');
      expect(feedback.correction).toEqual(correction);
    });
  });

  describe('getFeedback', () => {
    it('should retrieve feedback by target', () => {
      const result = createMockFusionResult();
      context.recordFeedback('user1', result, 'correct');
      context.recordFeedback('user2', result, 'correct');

      const feedbacks = context.getFeedback(result.id);
      expect(feedbacks).toHaveLength(2);
    });

    it('should return empty array for unknown target', () => {
      const feedbacks = context.getFeedback('unknown');
      expect(feedbacks).toHaveLength(0);
    });
  });

  describe('applyLearnedCorrections', () => {
    it('should apply learned corrections to fusion result', () => {
      const result = createMockFusionResult({
        fusedRecord: { name: 'John', status: 'active' },
      });

      // Record multiple corrections to trigger learning
      context.recordFeedback('user1', result, 'incorrect', { status: 'inactive' });
      context.recordFeedback('user2', result, 'incorrect', { status: 'inactive' });

      const corrected = context.applyLearnedCorrections(result);

      // After learning threshold is met, corrections should be applied
      expect(corrected.fusedRecord.status).toBe('inactive');
    });
  });

  describe('getStats', () => {
    it('should return feedback statistics', () => {
      const result = createMockFusionResult();
      context.recordFeedback('user1', result, 'correct');
      context.recordFeedback('user2', result, 'incorrect');

      const stats = context.getStats();

      expect(stats.totalFeedback).toBe(2);
      expect(stats.correctFeedback).toBe(1);
      expect(stats.incorrectFeedback).toBe(1);
      expect(stats.accuracyRate).toBe(0.5);
    });
  });

  describe('recordPreference', () => {
    it('should store and retrieve user preferences', () => {
      context.recordPreference('src1', 'dateFormat', 'ISO8601');

      const pref = context.getPreference('src1', 'dateFormat');
      expect(pref).toBe('ISO8601');
    });
  });

  describe('exportContexts / importContexts', () => {
    it('should export and import contexts', () => {
      const result = createMockFusionResult();
      context.recordFeedback('user1', result, 'correct');
      context.recordPreference('src1', 'test', 'value');

      const exported = context.exportContexts();

      const newContext = new ContextPersistence();
      newContext.importContexts(exported);

      expect(newContext.getPreference('src1', 'test')).toBe('value');
    });
  });
});

/**
 * Tests for AI-Human Collaboration Service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  AIHumanCollaborationService,
  RecommendationEngine,
  CommanderControl,
  FeedbackCollector,
  MissionTraceability,
  LRUCache,
  SecondaryIndex,
  RateLimiter,
  MetricsCollector,
} from '../index.js';

describe('AIHumanCollaborationService', () => {
  let service: AIHumanCollaborationService;

  beforeEach(() => {
    service = new AIHumanCollaborationService({
      autoApprovalThreshold: 0.9,
      minFeedbackForRetraining: 5,
    });
  });

  describe('Session Management', () => {
    it('should start a collaboration session', () => {
      const session = service.startSession('mission-1', 'commander-1');

      expect(session).toBeDefined();
      expect(session.missionId).toBe('mission-1');
      expect(session.commanderId).toBe('commander-1');
      expect(session.status).toBe('active');
    });

    it('should end a collaboration session', () => {
      const session = service.startSession('mission-1', 'commander-1');
      const ended = service.endSession(session.id);

      expect(ended.status).toBe('completed');
      expect(ended.endedAt).toBeDefined();
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate recommendations with confidence scores', async () => {
      service.startSession('mission-1', 'commander-1');

      const rec = await service.recommend(
        'mission-1',
        'analyze_entity',
        'read',
        { entityId: 'entity-123' },
        { urgency: 'high' }
      );

      expect(rec).toBeDefined();
      expect(rec.confidence).toBeGreaterThan(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
      expect(rec.confidenceBand).toBeDefined();
      expect(rec.outcomes).toHaveLength(3);
      expect(rec.traceId).toBeDefined();
    });

    it('should highlight probable outcomes', async () => {
      service.startSession('mission-1', 'commander-1');

      const rec = await service.recommend(
        'mission-1',
        'test_action',
        'read',
        {}
      );

      const highlights = service.getOutcomeHighlights(rec.id);

      expect(highlights).toBeDefined();
      expect(highlights?.positiveOutcomes).toBeDefined();
      expect(highlights?.negativeOutcomes).toBeDefined();
    });
  });

  describe('Commander Decisions', () => {
    const commander = {
      id: 'cmd-1',
      name: 'Test Commander',
      role: 'mission_commander',
      authority: 'full',
      permissions: ['*'],
    };

    it('should accept a recommendation', async () => {
      service.startSession('mission-1', 'commander-1');
      const rec = await service.recommend('mission-1', 'action', 'read', {});

      const decision = await service.decide(
        rec.id,
        'accepted',
        commander,
        'Approved for execution'
      );

      expect(decision.outcome).toBe('accepted');
      expect(decision.commanderId).toBe(commander.id);
    });

    it('should reject a recommendation', async () => {
      service.startSession('mission-1', 'commander-1');
      const rec = await service.recommend('mission-1', 'action', 'read', {});

      const decision = await service.decide(
        rec.id,
        'rejected',
        commander,
        'Not appropriate for this context'
      );

      expect(decision.outcome).toBe('rejected');
    });

    it('should modify a recommendation', async () => {
      service.startSession('mission-1', 'commander-1');
      const rec = await service.recommend('mission-1', 'action', 'read', { scope: 'narrow' });

      const decision = await service.decide(
        rec.id,
        'modified',
        commander,
        'Expanding scope',
        'enhanced_action',
        { scope: 'wide' }
      );

      expect(decision.outcome).toBe('modified');
      expect(decision.modifiedAction).toBe('enhanced_action');
      expect(decision.modifiedParameters).toEqual({ scope: 'wide' });
    });
  });

  describe('Feedback Collection', () => {
    const operator = {
      id: 'op-1',
      name: 'Test Operator',
      role: 'analyst',
    };

    it('should collect operator feedback', async () => {
      service.startSession('mission-1', 'commander-1');
      const rec = await service.recommend('mission-1', 'action', 'read', {});

      const feedback = await service.submitFeedback(
        rec.id,
        operator,
        4,
        true,
        'positive',
        'Good recommendation'
      );

      expect(feedback).toBeDefined();
      expect(feedback.rating).toBe(4);
      expect(feedback.wasCorrect).toBe(true);
    });

    it('should collect corrective feedback', async () => {
      service.startSession('mission-1', 'commander-1');
      const rec = await service.recommend('mission-1', 'wrong_action', 'read', {});

      const feedback = await service.submitFeedback(
        rec.id,
        operator,
        2,
        false,
        'corrective',
        'Should have been a different action',
        'correct_action',
        { betterParam: true }
      );

      expect(feedback.wasCorrect).toBe(false);
      expect(feedback.correctAction).toBe('correct_action');
    });
  });

  describe('Mission Traceability', () => {
    it('should maintain audit trail', async () => {
      service.startSession('mission-1', 'commander-1');

      await service.recommend('mission-1', 'action1', 'read', {});
      await service.recommend('mission-1', 'action2', 'write', {});

      const trail = service.getMissionAuditTrail('mission-1');

      expect(trail.length).toBeGreaterThanOrEqual(2);
    });

    it('should verify audit integrity', async () => {
      service.startSession('mission-1', 'commander-1');
      await service.recommend('mission-1', 'action', 'read', {});

      const integrity = service.verifyMissionIntegrity('mission-1');

      expect(integrity.valid).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track session statistics', async () => {
      const session = service.startSession('mission-1', 'commander-1');

      await service.recommend('mission-1', 'action1', 'read', {});
      await service.recommend('mission-1', 'action2', 'read', {});

      const refreshedSession = service.getActiveSession('mission-1');

      expect(refreshedSession?.stats.recommendationsGenerated).toBe(2);
    });
  });
});

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  it('should classify confidence bands correctly', async () => {
    const rec = await engine.generateRecommendation({
      missionId: 'test',
      context: { a: 1, b: 2, c: 3, d: 4, e: 5 },
      action: 'test',
      actionType: 'read',
      parameters: {},
    });

    expect(['high', 'medium', 'low', 'uncertain']).toContain(rec.confidenceBand);
  });

  it('should assess risk levels', async () => {
    const rec = await engine.generateRecommendation({
      missionId: 'test',
      context: {},
      action: 'delete_entity',
      actionType: 'delete',
      parameters: {},
    });

    expect(rec.riskLevel).toBe('high');
  });

  it('should determine auto-approval eligibility', async () => {
    engine.updateConfig({ autoApprovalThreshold: 0.5, highRiskRequiresApproval: false });

    const rec = await engine.generateRecommendation({
      missionId: 'test',
      context: { a: 1, b: 2, c: 3 },
      action: 'read_entity',
      actionType: 'read',
      parameters: {},
    });

    expect(engine.canAutoApprove(rec)).toBe(true);
  });
});

describe('MissionTraceability', () => {
  let traceability: MissionTraceability;

  beforeEach(() => {
    traceability = new MissionTraceability();
  });

  it('should create hash-chained entries', () => {
    const entry1 = traceability.record({
      missionId: 'mission-1',
      eventType: 'recommendation',
      eventCategory: 'ai_action',
      actor: { type: 'ai', id: 'model-1' },
      action: 'recommend',
      resourceType: 'recommendation',
      resourceId: 'rec-1',
    });

    const entry2 = traceability.record({
      missionId: 'mission-1',
      eventType: 'decision',
      eventCategory: 'human_action',
      actor: { type: 'human', id: 'user-1' },
      action: 'approve',
      resourceType: 'decision',
      resourceId: 'dec-1',
    });

    expect(entry2.previousHash).toBe(entry1.hash);
  });

  it('should verify chain integrity', () => {
    traceability.record({
      missionId: 'mission-1',
      eventType: 'recommendation',
      eventCategory: 'ai_action',
      actor: { type: 'ai', id: 'model-1' },
      action: 'recommend',
      resourceType: 'recommendation',
      resourceId: 'rec-1',
    });

    const integrity = traceability.verifyIntegrity('mission-1');
    expect(integrity.valid).toBe(true);
  });

  it('should search audit entries', () => {
    traceability.record({
      missionId: 'mission-1',
      eventType: 'recommendation',
      eventCategory: 'ai_action',
      actor: { type: 'ai', id: 'model-1' },
      action: 'recommend',
      resourceType: 'recommendation',
      resourceId: 'rec-1',
    });

    traceability.record({
      missionId: 'mission-1',
      eventType: 'decision',
      eventCategory: 'human_action',
      actor: { type: 'human', id: 'user-1' },
      action: 'approve',
      resourceType: 'decision',
      resourceId: 'dec-1',
    });

    const humanActions = traceability.search({ actorType: 'human' });
    expect(humanActions.length).toBe(1);
  });
});

describe('Performance Utilities', () => {
  describe('LRUCache', () => {
    it('should evict least recently used items', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.get('a'); // Access 'a' to make it recently used
      cache.set('d', 4); // Should evict 'b'

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });
  });

  describe('SecondaryIndex', () => {
    it('should index and retrieve by secondary key', () => {
      const index = new SecondaryIndex<string, string>();

      index.add('mission-1', 'rec-1');
      index.add('mission-1', 'rec-2');
      index.add('mission-2', 'rec-3');

      expect(index.get('mission-1')).toHaveLength(2);
      expect(index.get('mission-2')).toHaveLength(1);
    });
  });

  describe('RateLimiter', () => {
    it('should limit request rate', () => {
      const limiter = new RateLimiter(5, 1);

      // Should succeed for first 5
      for (let i = 0; i < 5; i++) {
        expect(limiter.tryAcquire()).toBe(true);
      }

      // Should fail for 6th
      expect(limiter.tryAcquire()).toBe(false);
    });
  });

  describe('MetricsCollector', () => {
    it('should collect and report metrics', () => {
      const metrics = new MetricsCollector();

      metrics.increment('requests');
      metrics.increment('requests');
      metrics.gauge('active_sessions', 5);
      metrics.histogram('latency', 100);
      metrics.histogram('latency', 150);
      metrics.histogram('latency', 120);

      expect(metrics.getCounter('requests')).toBe(2);
      expect(metrics.getGauge('active_sessions')).toBe(5);

      const stats = metrics.getHistogramStats('latency');
      expect(stats?.min).toBe(100);
      expect(stats?.max).toBe(150);
    });
  });
});

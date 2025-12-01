import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataDiscoveryFusionEngine } from '../DataDiscoveryFusionEngine.js';

describe('DataDiscoveryFusionEngine', () => {
  let engine: DataDiscoveryFusionEngine;

  beforeEach(() => {
    engine = new DataDiscoveryFusionEngine({
      enableAutoDiscovery: false,
      enableLearning: true,
      enableEventPublishing: false, // Disable Redis in tests
    });
  });

  afterEach(async () => {
    await engine.stop();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const stats = engine.getStats();
      expect(stats).toHaveProperty('sources', 0);
      expect(stats).toHaveProperty('profiles', 0);
      expect(stats).toHaveProperty('fusionResults', 0);
    });
  });

  describe('getStats', () => {
    it('should return engine statistics', () => {
      const stats = engine.getStats();

      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('sources');
      expect(stats).toHaveProperty('profiles');
      expect(stats).toHaveProperty('fusionResults');
      expect(stats).toHaveProperty('recipes');
      expect(stats).toHaveProperty('learning');
    });
  });

  describe('fuse', () => {
    it('should fuse records from multiple sources', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'John Doe', email: 'john@example.com' } },
        { sourceId: 'src2', recordId: '2', data: { name: 'John Doe', phone: '555-1234' } },
      ];

      const results = await engine.fuse(records, ['name']);

      expect(results).toHaveLength(1);
      expect(results[0].fusedRecord).toHaveProperty('email');
      expect(results[0].fusedRecord).toHaveProperty('phone');
    });

    it('should store fusion results', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'Test' } },
      ];

      const results = await engine.fuse(records, ['name']);
      const stored = engine.getFusionResult(results[0].id);

      expect(stored).toBeDefined();
      expect(stored?.id).toBe(results[0].id);
    });
  });

  describe('deduplicate', () => {
    it('should identify duplicate records', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'John', email: 'john@example.com' } },
        { sourceId: 'src1', recordId: '2', data: { name: 'John', email: 'john@example.com' } },
      ];

      const results = await engine.deduplicate(records, ['name', 'email']);

      expect(results).toHaveLength(1);
      expect(results[0].duplicatesRemoved).toBe(1);
    });
  });

  describe('feedback', () => {
    it('should record and retrieve feedback', async () => {
      const records = [
        { sourceId: 'src1', recordId: '1', data: { name: 'Test' } },
      ];

      const fusionResults = await engine.fuse(records, ['name']);
      const fusionId = fusionResults[0].id;

      const feedback = engine.recordFeedback('user1', fusionId, 'correct');

      expect(feedback.feedbackType).toBe('correct');
      expect(feedback.userId).toBe('user1');

      const retrieved = engine.getFeedback(fusionId);
      expect(retrieved).toHaveLength(1);
    });
  });

  describe('automation recipes', () => {
    it('should return available recipes', () => {
      const recipes = engine.getAutomationRecipes();

      expect(recipes.length).toBeGreaterThan(0);
      expect(recipes.some(r => r.id === 'full-discovery')).toBe(true);
      expect(recipes.some(r => r.id === 'entity-fusion')).toBe(true);
    });
  });

  describe('addScanEndpoint', () => {
    it('should add scan endpoint', () => {
      engine.addScanEndpoint({
        type: 'database',
        uri: 'postgresql://localhost/test',
      });

      // No error thrown
      expect(true).toBe(true);
    });
  });

  describe('scan', () => {
    it('should execute scan and return results', async () => {
      const result = await engine.scan();

      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('duration');
    });
  });

  describe('getLearningStats', () => {
    it('should return learning statistics', () => {
      const stats = engine.getLearningStats();

      expect(stats).toHaveProperty('totalFeedback');
      expect(stats).toHaveProperty('learnedRules');
    });
  });
});

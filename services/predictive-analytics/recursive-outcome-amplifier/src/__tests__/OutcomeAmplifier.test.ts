/**
 * Tests for OutcomeAmplifier
 */

import { OutcomeAmplifier } from '../OutcomeAmplifier.js';
import type { OutcomeNodeInput } from '../models/OutcomeNode.js';

describe('OutcomeAmplifier', () => {
  let amplifier: OutcomeAmplifier;

  beforeEach(() => {
    amplifier = new OutcomeAmplifier({
      defaultMaxOrder: 5,
      defaultProbabilityThreshold: 0.1,
      defaultMagnitudeThreshold: 0.1,
      enableCaching: true,
    });
  });

  afterEach(() => {
    amplifier.clearCache();
  });

  describe('amplifyOutcome', () => {
    it('should amplify outcomes for a simple event', async () => {
      const event: OutcomeNodeInput = {
        event: 'New economic policy implemented',
        domain: 'POLICY',
        initialMagnitude: 7.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);

      expect(cascade).toBeDefined();
      expect(cascade.id).toBeDefined();
      expect(cascade.rootEvent).toBe(event.event);
      expect(cascade.totalNodes).toBeGreaterThan(0);
      expect(cascade.nodes).toHaveLength(cascade.totalNodes);
    });

    it('should respect maxOrder option', async () => {
      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      const cascade = await amplifier.amplifyOutcome(event, {
        maxOrder: 3,
      });

      const maxOrder = Math.max(...cascade.nodes.map((n) => n.order));
      expect(maxOrder).toBeLessThanOrEqual(3);
    });

    it('should filter by probability threshold', async () => {
      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      const cascade = await amplifier.amplifyOutcome(event, {
        probabilityThreshold: 0.5,
      });

      // All nodes should have probability >= threshold
      cascade.nodes.forEach((node) => {
        expect(node.probability).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should include critical paths', async () => {
      const event: OutcomeNodeInput = {
        event: 'Major geopolitical event',
        domain: 'GEOPOLITICAL',
        initialMagnitude: 8.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);

      expect(cascade.criticalPaths).toBeDefined();
      expect(Array.isArray(cascade.criticalPaths)).toBe(true);
    });

    it('should identify leverage points', async () => {
      const event: OutcomeNodeInput = {
        event: 'Technology deployment',
        domain: 'TECHNOLOGY',
        initialMagnitude: 6.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);

      expect(cascade.leveragePoints).toBeDefined();
      expect(Array.isArray(cascade.leveragePoints)).toBe(true);
    });

    it('should calculate amplification factor', async () => {
      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'ECONOMIC',
        initialMagnitude: 5.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);

      expect(cascade.amplificationFactor).toBeGreaterThan(0);
    });

    it('should cache results when caching is enabled', async () => {
      const event: OutcomeNodeInput = {
        event: 'Cached event',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      const cascade1 = await amplifier.amplifyOutcome(event);
      const initialCacheSize = amplifier.getCacheSize();

      expect(initialCacheSize).toBeGreaterThan(0);

      const cascade2 = await amplifier.getCascadeMap(cascade1.id);
      expect(cascade2).toEqual(cascade1);
    });
  });

  describe('getCascadeMap', () => {
    it('should retrieve cached cascade', async () => {
      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);
      const retrieved = await amplifier.getCascadeMap(cascade.id);

      expect(retrieved).toEqual(cascade);
    });

    it('should return null for non-existent cascade', async () => {
      const retrieved = await amplifier.getCascadeMap('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('findLeveragePoints', () => {
    it('should find leverage points in cascade', async () => {
      const event: OutcomeNodeInput = {
        event: 'Complex event',
        domain: 'GEOPOLITICAL',
        initialMagnitude: 7.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);
      const leveragePoints = await amplifier.findLeveragePoints(cascade.id, {
        topN: 5,
      });

      expect(leveragePoints).toHaveLength(
        Math.min(5, cascade.leveragePoints.length),
      );
    });

    it('should filter by minimum score', async () => {
      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'POLICY',
        initialMagnitude: 6.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);
      const leveragePoints = await amplifier.findLeveragePoints(cascade.id, {
        minScore: 5.0,
      });

      leveragePoints.forEach((point) => {
        expect(point.leverageScore).toBeGreaterThanOrEqual(5.0);
      });
    });

    it('should throw error for non-existent cascade', async () => {
      await expect(
        amplifier.findLeveragePoints('non-existent-id'),
      ).rejects.toThrow('Cascade not found');
    });
  });

  describe('getAmplificationPath', () => {
    it('should find path to target node', async () => {
      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);

      // Get a non-root node
      const targetNode = cascade.nodes.find((n) => n.order > 1);
      if (targetNode) {
        const path = await amplifier.getAmplificationPath(
          cascade.id,
          targetNode.id,
        );

        expect(path).toBeDefined();
        if (path) {
          expect(path.nodes).toContain(targetNode);
          expect(path.pathLength).toBeGreaterThan(1);
        }
      }
    });

    it('should return null for non-existent node', async () => {
      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);
      const path = await amplifier.getAmplificationPath(
        cascade.id,
        'non-existent-node',
      );

      expect(path).toBeNull();
    });
  });

  describe('getAmplificationAnalysis', () => {
    it('should provide amplification analysis', async () => {
      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'ECONOMIC',
        initialMagnitude: 5.0,
      };

      const cascade = await amplifier.amplifyOutcome(event);
      const analysis = await amplifier.getAmplificationAnalysis(cascade.id);

      expect(analysis.rootMagnitude).toBe(5.0);
      expect(analysis.totalMagnitude).toBeGreaterThan(0);
      expect(analysis.amplificationRatio).toBeGreaterThan(0);
      expect(analysis.orderBreakdown).toHaveLength(cascade.maxOrder);
    });

    it('should throw error for non-existent cascade', async () => {
      await expect(
        amplifier.getAmplificationAnalysis('non-existent-id'),
      ).rejects.toThrow('Cascade not found');
    });
  });

  describe('listCascades', () => {
    it('should list cached cascades', async () => {
      const event1: OutcomeNodeInput = {
        event: 'Event 1',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      const event2: OutcomeNodeInput = {
        event: 'Event 2',
        domain: 'ECONOMIC',
        initialMagnitude: 6.0,
      };

      await amplifier.amplifyOutcome(event1);
      await amplifier.amplifyOutcome(event2);

      const cascades = await amplifier.listCascades(10, 0);

      expect(cascades.length).toBeGreaterThanOrEqual(2);
    });

    it('should respect limit parameter', async () => {
      const cascades = await amplifier.listCascades(5, 0);
      expect(cascades.length).toBeLessThanOrEqual(5);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      await amplifier.amplifyOutcome(event);
      expect(amplifier.getCacheSize()).toBeGreaterThan(0);

      amplifier.clearCache();
      expect(amplifier.getCacheSize()).toBe(0);
    });

    it('should not cache when caching is disabled', async () => {
      const noCacheAmplifier = new OutcomeAmplifier({
        enableCaching: false,
      });

      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      await noCacheAmplifier.amplifyOutcome(event);
      expect(noCacheAmplifier.getCacheSize()).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should use custom default values', async () => {
      const customAmplifier = new OutcomeAmplifier({
        defaultMaxOrder: 3,
        defaultProbabilityThreshold: 0.3,
      });

      const event: OutcomeNodeInput = {
        event: 'Test event',
        domain: 'POLICY',
        initialMagnitude: 5.0,
      };

      const cascade = await customAmplifier.amplifyOutcome(event);

      expect(cascade.maxOrder).toBe(3);
      const maxOrder = Math.max(...cascade.nodes.map((n) => n.order));
      expect(maxOrder).toBeLessThanOrEqual(3);
    });
  });
});

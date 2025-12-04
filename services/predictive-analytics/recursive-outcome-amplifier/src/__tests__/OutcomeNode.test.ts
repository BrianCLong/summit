/**
 * Tests for OutcomeNode model
 */

import {
  OutcomeNodeBuilder,
  createRootNode,
  applyDampening,
  mergeOutcomeNodes,
  type OutcomeNode,
} from '../models/OutcomeNode.js';

describe('OutcomeNode', () => {
  describe('OutcomeNodeBuilder', () => {
    it('should build a valid outcome node with defaults', () => {
      const node = new OutcomeNodeBuilder('Test event', 1).build();

      expect(node.id).toBeDefined();
      expect(node.event).toBe('Test event');
      expect(node.order).toBe(1);
      expect(node.probability).toBe(1.0);
      expect(node.magnitude).toBe(1.0);
      expect(node.domain).toBe('UNKNOWN');
      expect(node.parentNodes).toEqual([]);
      expect(node.childNodes).toEqual([]);
    });

    it('should build a node with custom properties', () => {
      const node = new OutcomeNodeBuilder('Custom event', 2)
        .withProbability(0.7)
        .withMagnitude(5.0)
        .withDomain('ECONOMIC')
        .withTimeDelay(48)
        .withConfidence(0.8)
        .withEvidenceStrength(0.9)
        .withParents(['parent-1'])
        .withChildren(['child-1', 'child-2'])
        .build();

      expect(node.event).toBe('Custom event');
      expect(node.order).toBe(2);
      expect(node.probability).toBe(0.7);
      expect(node.magnitude).toBe(5.0);
      expect(node.domain).toBe('ECONOMIC');
      expect(node.timeDelay).toBe(48);
      expect(node.confidence).toBe(0.8);
      expect(node.evidenceStrength).toBe(0.9);
      expect(node.parentNodes).toEqual(['parent-1']);
      expect(node.childNodes).toEqual(['child-1', 'child-2']);
    });

    it('should clamp probability to 0-1 range', () => {
      const node1 = new OutcomeNodeBuilder('Test', 1)
        .withProbability(1.5)
        .build();
      expect(node1.probability).toBe(1.0);

      const node2 = new OutcomeNodeBuilder('Test', 1)
        .withProbability(-0.5)
        .build();
      expect(node2.probability).toBe(0);
    });

    it('should clamp confidence to 0-1 range', () => {
      const node1 = new OutcomeNodeBuilder('Test', 1)
        .withConfidence(1.5)
        .build();
      expect(node1.confidence).toBe(1.0);

      const node2 = new OutcomeNodeBuilder('Test', 1)
        .withConfidence(-0.5)
        .build();
      expect(node2.confidence).toBe(0);
    });
  });

  describe('createRootNode', () => {
    it('should create a root node with order 1', () => {
      const root = createRootNode({
        event: 'Root event',
        domain: 'POLICY',
        initialMagnitude: 7.0,
      });

      expect(root.event).toBe('Root event');
      expect(root.order).toBe(1);
      expect(root.domain).toBe('POLICY');
      expect(root.magnitude).toBe(7.0);
      expect(root.probability).toBe(1.0);
      expect(root.confidence).toBe(0.9);
      expect(root.evidenceStrength).toBe(1.0);
    });

    it('should use default magnitude if not provided', () => {
      const root = createRootNode({
        event: 'Root event',
        domain: 'POLICY',
      });

      expect(root.magnitude).toBe(1.0);
    });
  });

  describe('applyDampening', () => {
    it('should dampen probability and magnitude', () => {
      const node: OutcomeNode = new OutcomeNodeBuilder('Test', 2)
        .withProbability(0.8)
        .withMagnitude(5.0)
        .withConfidence(0.9)
        .build();

      const dampened = applyDampening(node, 0.7);

      expect(dampened.probability).toBeCloseTo(0.56);
      expect(dampened.magnitude).toBeCloseTo(3.5);
      expect(dampened.confidence).toBeCloseTo(0.753, 2);
    });

    it('should not modify original node', () => {
      const node: OutcomeNode = new OutcomeNodeBuilder('Test', 2)
        .withProbability(0.8)
        .build();

      const originalProb = node.probability;
      applyDampening(node, 0.5);

      expect(node.probability).toBe(originalProb);
    });
  });

  describe('mergeOutcomeNodes', () => {
    it('should remove duplicate nodes', () => {
      const node1 = new OutcomeNodeBuilder('Test', 1).build();
      const node2 = { ...node1 }; // Same ID
      const node3 = new OutcomeNodeBuilder('Different', 2).build();

      const merged = mergeOutcomeNodes([node1, node2, node3]);

      expect(merged).toHaveLength(2);
    });

    it('should keep node with higher probability when merging duplicates', () => {
      const node1: OutcomeNode = new OutcomeNodeBuilder('Test', 1)
        .withProbability(0.5)
        .build();

      const node2: OutcomeNode = {
        ...node1,
        probability: 0.8,
      };

      const merged = mergeOutcomeNodes([node1, node2]);

      expect(merged).toHaveLength(1);
      expect(merged[0].probability).toBe(0.8);
    });
  });
});

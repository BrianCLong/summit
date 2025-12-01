import { describe, it, expect, beforeEach } from 'vitest';
import { GraphStorage } from '@intelgraph/graph-database';
import { LinkPredictor } from '../LinkPredictor.js';

describe('LinkPredictor', () => {
  let storage: GraphStorage;
  let predictor: LinkPredictor;

  beforeEach(() => {
    storage = new GraphStorage();

    // Create a small social network
    const alice = storage.addNode('Person', { name: 'Alice' });
    const bob = storage.addNode('Person', { name: 'Bob' });
    const charlie = storage.addNode('Person', { name: 'Charlie' });
    const dave = storage.addNode('Person', { name: 'Dave' });

    // Alice knows Bob and Charlie
    storage.addEdge(alice.id, bob.id, 'KNOWS');
    storage.addEdge(alice.id, charlie.id, 'KNOWS');

    // Bob knows Charlie
    storage.addEdge(bob.id, charlie.id, 'KNOWS');

    // Dave only knows Charlie
    storage.addEdge(dave.id, charlie.id, 'KNOWS');

    predictor = new LinkPredictor(storage);
  });

  describe('Common Neighbors', () => {
    it('should calculate common neighbors score', () => {
      const nodes = Array.from(storage.getAllNodes());
      const alice = nodes.find(n => n.properties.name === 'Alice')!;
      const bob = nodes.find(n => n.properties.name === 'Bob')!;
      const dave = nodes.find(n => n.properties.name === 'Dave')!;

      // Alice-Bob have Charlie as common neighbor (but they're already connected)
      // Alice-Dave have Charlie as common neighbor
      const score = predictor.commonNeighbors(alice.id, dave.id);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Jaccard Coefficient', () => {
    it('should calculate Jaccard similarity', () => {
      const nodes = Array.from(storage.getAllNodes());
      const alice = nodes.find(n => n.properties.name === 'Alice')!;
      const dave = nodes.find(n => n.properties.name === 'Dave')!;

      const score = predictor.jaccardCoefficient(alice.id, dave.id);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Adamic-Adar Index', () => {
    it('should calculate Adamic-Adar score', () => {
      const nodes = Array.from(storage.getAllNodes());
      const alice = nodes.find(n => n.properties.name === 'Alice')!;
      const dave = nodes.find(n => n.properties.name === 'Dave')!;

      const score = predictor.adamicAdar(alice.id, dave.id);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Link Predictions', () => {
    it('should predict potential links', () => {
      const predictions = predictor.predictLinks(5);

      expect(Array.isArray(predictions)).toBe(true);
      predictions.forEach(pred => {
        expect(pred).toHaveProperty('source');
        expect(pred).toHaveProperty('target');
        expect(pred).toHaveProperty('score');
      });
    });
  });
});

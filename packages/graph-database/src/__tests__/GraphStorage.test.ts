import { describe, it, expect, beforeEach } from 'vitest';
import { GraphStorage } from '../storage/GraphStorage.js';
import type { Node, Edge } from '../types.js';

describe('GraphStorage', () => {
  let storage: GraphStorage;

  beforeEach(() => {
    storage = new GraphStorage();
  });

  describe('Node Operations', () => {
    it('should add and retrieve a node', () => {
      const node = storage.addNode('Person', { name: 'Alice', age: 30 });
      expect(node.labels).toContain('Person');
      expect(node.properties.name).toBe('Alice');

      const retrieved = storage.getNode(node.id);
      expect(retrieved).toEqual(node);
    });

    it('should update node properties', () => {
      const node = storage.addNode('Person', { name: 'Bob' });
      const updated = storage.updateNode(node.id, { name: 'Robert', age: 25 });

      expect(updated?.properties.name).toBe('Robert');
      expect(updated?.properties.age).toBe(25);
    });

    it('should delete a node', () => {
      const node = storage.addNode('Person', { name: 'Charlie' });
      const deleted = storage.deleteNode(node.id);

      expect(deleted).toBe(true);
      expect(storage.getNode(node.id)).toBeUndefined();
    });

    it('should find nodes by label', () => {
      storage.addNode('Person', { name: 'Alice' });
      storage.addNode('Person', { name: 'Bob' });
      storage.addNode('Company', { name: 'Acme' });

      const people = storage.findNodesByLabel('Person');
      expect(people.length).toBe(2);
    });

    it('should find nodes by property', () => {
      storage.addNode('Person', { name: 'Alice', city: 'NYC' });
      storage.addNode('Person', { name: 'Bob', city: 'LA' });

      const nycResidents = storage.findNodesByProperty('city', 'NYC');
      expect(nycResidents.length).toBe(1);
      expect(nycResidents[0].properties.name).toBe('Alice');
    });
  });

  describe('Edge Operations', () => {
    let alice: Node;
    let bob: Node;

    beforeEach(() => {
      alice = storage.addNode('Person', { name: 'Alice' });
      bob = storage.addNode('Person', { name: 'Bob' });
    });

    it('should add and retrieve an edge', () => {
      const edge = storage.addEdge(alice.id, bob.id, 'KNOWS', { since: 2020 });

      expect(edge.type).toBe('KNOWS');
      expect(edge.source).toBe(alice.id);
      expect(edge.target).toBe(bob.id);

      const retrieved = storage.getEdge(edge.id);
      expect(retrieved).toEqual(edge);
    });

    it('should get neighbors of a node', () => {
      const charlie = storage.addNode('Person', { name: 'Charlie' });
      storage.addEdge(alice.id, bob.id, 'KNOWS');
      storage.addEdge(alice.id, charlie.id, 'KNOWS');

      const neighbors = storage.getNeighbors(alice.id);
      expect(neighbors.length).toBe(2);
    });

    it('should get outgoing edges', () => {
      storage.addEdge(alice.id, bob.id, 'KNOWS');
      storage.addEdge(bob.id, alice.id, 'FOLLOWS');

      const outgoing = storage.getOutgoingEdges(alice.id);
      expect(outgoing.length).toBe(1);
      expect(outgoing[0].type).toBe('KNOWS');
    });

    it('should get incoming edges', () => {
      storage.addEdge(alice.id, bob.id, 'KNOWS');
      storage.addEdge(bob.id, alice.id, 'FOLLOWS');

      const incoming = storage.getIncomingEdges(alice.id);
      expect(incoming.length).toBe(1);
      expect(incoming[0].type).toBe('FOLLOWS');
    });

    it('should delete an edge', () => {
      const edge = storage.addEdge(alice.id, bob.id, 'KNOWS');
      const deleted = storage.deleteEdge(edge.id);

      expect(deleted).toBe(true);
      expect(storage.getEdge(edge.id)).toBeUndefined();
    });
  });

  describe('Graph Statistics', () => {
    it('should track node and edge counts', () => {
      const alice = storage.addNode('Person', { name: 'Alice' });
      const bob = storage.addNode('Person', { name: 'Bob' });
      storage.addEdge(alice.id, bob.id, 'KNOWS');

      const stats = storage.getStats();
      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
    });
  });
});

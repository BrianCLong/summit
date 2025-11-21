import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkTopologyManager } from './NetworkTopologyManager.js';

describe('NetworkTopologyManager', () => {
  let manager: NetworkTopologyManager;

  beforeEach(() => {
    manager = new NetworkTopologyManager();
  });

  describe('registerNode', () => {
    it('should register a new node with generated id', () => {
      const node = manager.registerNode({
        name: 'test-node',
        type: 'field',
        endpoints: [{
          id: 'ep-1',
          protocol: 'tcp',
          address: 'localhost',
          port: 8080,
          latencyMs: 10,
          bandwidthKbps: 1000,
          available: true,
          securityLevel: 'unclass',
        }],
        condition: 'nominal',
        priority: 5,
        capabilities: ['compute'],
        metadata: {},
      });

      expect(node.id).toBeDefined();
      expect(node.name).toBe('test-node');
      expect(node.type).toBe('field');
      expect(node.condition).toBe('nominal');
    });

    it('should emit node:added event', () => {
      const handler = vi.fn();
      manager.on('node:added', handler);

      manager.registerNode({
        name: 'test-node',
        type: 'field',
        endpoints: [],
        condition: 'nominal',
        priority: 5,
        capabilities: [],
        metadata: {},
      });

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('updateNodeCondition', () => {
    it('should update node condition', () => {
      const node = manager.registerNode({
        name: 'test-node',
        type: 'field',
        endpoints: [],
        condition: 'nominal',
        priority: 5,
        capabilities: [],
        metadata: {},
      });

      manager.updateNodeCondition(node.id, 'degraded');

      // The condition is updated internally, verify via snapshot
      const snapshot = manager.getTopologySnapshot();
      const updatedNode = snapshot.nodes.find(n => n.id === node.id);
      expect(updatedNode?.condition).toBe('degraded');
    });

    it('should emit condition-changed event', () => {
      const handler = vi.fn();
      manager.on('node:condition-changed', handler);

      const node = manager.registerNode({
        name: 'test-node',
        type: 'field',
        endpoints: [],
        condition: 'nominal',
        priority: 5,
        capabilities: [],
        metadata: {},
      });

      manager.updateNodeCondition(node.id, 'degraded');

      expect(handler).toHaveBeenCalledWith(node.id, 'degraded');
    });
  });

  describe('removeNode', () => {
    it('should remove a node', () => {
      const node = manager.registerNode({
        name: 'test-node',
        type: 'field',
        endpoints: [],
        condition: 'nominal',
        priority: 5,
        capabilities: [],
        metadata: {},
      });

      const result = manager.removeNode(node.id);

      expect(result).toBe(true);
      expect(manager.getTopologySnapshot().nodes).toHaveLength(0);
    });

    it('should return false for non-existent node', () => {
      const result = manager.removeNode('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('calculateRoute', () => {
    it('should return null if source node does not exist', () => {
      const dest = manager.registerNode({
        name: 'dest',
        type: 'field',
        endpoints: [],
        condition: 'nominal',
        priority: 5,
        capabilities: [],
        metadata: {},
      });

      const route = manager.calculateRoute('non-existent', dest.id);
      expect(route).toBeNull();
    });

    it('should calculate route between connected nodes', () => {
      const source = manager.registerNode({
        name: 'source',
        type: 'command',
        endpoints: [{
          id: 'ep-1',
          protocol: 'tcp',
          address: 'localhost',
          port: 8080,
          latencyMs: 10,
          bandwidthKbps: 1000,
          available: true,
          securityLevel: 'unclass',
        }],
        condition: 'nominal',
        priority: 10,
        capabilities: ['routing'],
        metadata: {},
      });

      const dest = manager.registerNode({
        name: 'dest',
        type: 'field',
        endpoints: [{
          id: 'ep-2',
          protocol: 'tcp',
          address: 'localhost',
          port: 8081,
          latencyMs: 10,
          bandwidthKbps: 1000,
          available: true,
          securityLevel: 'unclass',
        }],
        condition: 'nominal',
        priority: 5,
        capabilities: ['compute'],
        metadata: {},
      });

      const route = manager.calculateRoute(source.id, dest.id);

      expect(route).not.toBeNull();
      expect(route?.source).toBe(source.id);
      expect(route?.destination).toBe(dest.id);
      expect(route?.active).toBe(true);
    });
  });

  describe('getTopologySnapshot', () => {
    it('should return empty snapshot initially', () => {
      const snapshot = manager.getTopologySnapshot();

      expect(snapshot.nodes).toHaveLength(0);
      expect(snapshot.routes).toHaveLength(0);
      expect(snapshot.healthySummary.total).toBe(0);
    });

    it('should include registered nodes in snapshot', () => {
      manager.registerNode({
        name: 'node-1',
        type: 'field',
        endpoints: [],
        condition: 'nominal',
        priority: 5,
        capabilities: [],
        metadata: {},
      });

      manager.registerNode({
        name: 'node-2',
        type: 'relay',
        endpoints: [],
        condition: 'degraded',
        priority: 3,
        capabilities: [],
        metadata: {},
      });

      const snapshot = manager.getTopologySnapshot();

      expect(snapshot.nodes).toHaveLength(2);
      expect(snapshot.healthySummary.total).toBe(2);
      expect(snapshot.healthySummary.healthy).toBe(1);
      expect(snapshot.healthySummary.degraded).toBe(1);
    });
  });

  describe('getSatelliteNodes', () => {
    it('should return nodes with satellite endpoints', () => {
      manager.registerNode({
        name: 'sat-node',
        type: 'relay',
        endpoints: [{
          id: 'ep-sat',
          protocol: 'satellite',
          address: 'sat.example.com',
          port: 9090,
          latencyMs: 500,
          bandwidthKbps: 100,
          available: true,
          securityLevel: 'secret',
        }],
        condition: 'nominal',
        priority: 5,
        capabilities: ['satellite'],
        metadata: {},
      });

      manager.registerNode({
        name: 'tcp-node',
        type: 'field',
        endpoints: [{
          id: 'ep-tcp',
          protocol: 'tcp',
          address: 'tcp.example.com',
          port: 8080,
          latencyMs: 10,
          bandwidthKbps: 1000,
          available: true,
          securityLevel: 'unclass',
        }],
        condition: 'nominal',
        priority: 5,
        capabilities: [],
        metadata: {},
      });

      const satNodes = manager.getSatelliteNodes();

      expect(satNodes).toHaveLength(1);
      expect(satNodes[0].name).toBe('sat-node');
    });
  });
});

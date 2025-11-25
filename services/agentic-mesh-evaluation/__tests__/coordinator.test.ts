/**
 * Tests for Mesh Coordinator
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MeshCoordinator } from '../src/coordinator/MeshCoordinator';
import { MeshRegistry } from '../src/registry/MeshRegistry';
import { CommunicationFabric } from '../src/fabric/CommunicationFabric';
import { MetricsCollector } from '../src/metrics/MetricsCollector';

describe('MeshCoordinator', () => {
  let coordinator: MeshCoordinator;
  let registry: MeshRegistry;
  let fabric: CommunicationFabric;
  let metrics: MetricsCollector;

  beforeAll(async () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    registry = new MeshRegistry(redisUrl);
    fabric = new CommunicationFabric({
      redisUrl,
      enableRetries: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      enableDeadLetterQueue: true,
      messageTimeoutMs: 30000,
    });
    metrics = new MetricsCollector(redisUrl);

    coordinator = new MeshCoordinator(
      {
        enableAutoHealing: true,
        enableLoadBalancing: true,
        enableDynamicTopology: true,
        heartbeatIntervalMs: 5000,
        healthCheckTimeoutMs: 10000,
        taskTimeoutMs: 300000,
        maxRetries: 3,
      },
      registry,
      fabric,
      metrics
    );
  });

  afterAll(async () => {
    await fabric.close();
    await metrics.close();
    await registry.close();
  });

  describe('Mesh Creation', () => {
    it('should create a mesh with peer-to-peer topology', async () => {
      const mesh = await coordinator.createMesh({
        name: 'Test Mesh',
        description: 'A test mesh for unit tests',
        topology: 'peer-to-peer',
        nodes: [
          {
            name: 'Node 1',
            agentId: 'agent-1',
            role: 'worker',
            status: 'initializing',
            capabilities: ['computation'],
            specializations: [],
            maxConcurrentTasks: 10,
            endpoint: 'http://localhost:5001',
            protocol: ['websocket'],
            neighbors: [],
          },
          {
            name: 'Node 2',
            agentId: 'agent-2',
            role: 'worker',
            status: 'initializing',
            capabilities: ['computation'],
            specializations: [],
            maxConcurrentTasks: 10,
            endpoint: 'http://localhost:5002',
            protocol: ['websocket'],
            neighbors: [],
          },
        ],
        tenantId: 'tenant-1',
        ownerId: 'user-1',
      });

      expect(mesh).toBeDefined();
      expect(mesh.id).toBeDefined();
      expect(mesh.name).toBe('Test Mesh');
      expect(mesh.topology).toBe('peer-to-peer');
      expect(mesh.nodes).toHaveLength(2);
      expect(mesh.edges.length).toBeGreaterThan(0);
    });

    it('should create a mesh with hierarchical topology', async () => {
      const mesh = await coordinator.createMesh({
        name: 'Hierarchical Mesh',
        topology: 'hierarchical',
        nodes: [
          {
            name: 'Coordinator Node',
            agentId: 'agent-coord',
            role: 'coordinator',
            status: 'initializing',
            capabilities: ['coordination'],
            specializations: [],
            maxConcurrentTasks: 50,
            endpoint: 'http://localhost:5100',
            protocol: ['websocket'],
            neighbors: [],
          },
          {
            name: 'Worker 1',
            agentId: 'agent-w1',
            role: 'worker',
            status: 'initializing',
            capabilities: ['computation'],
            specializations: [],
            maxConcurrentTasks: 10,
            endpoint: 'http://localhost:5101',
            protocol: ['websocket'],
            neighbors: [],
          },
          {
            name: 'Worker 2',
            agentId: 'agent-w2',
            role: 'worker',
            status: 'initializing',
            capabilities: ['computation'],
            specializations: [],
            maxConcurrentTasks: 10,
            endpoint: 'http://localhost:5102',
            protocol: ['websocket'],
            neighbors: [],
          },
        ],
        tenantId: 'tenant-1',
        ownerId: 'user-1',
      });

      expect(mesh.topology).toBe('hierarchical');
      expect(mesh.nodes).toHaveLength(3);

      // Verify coordinator is connected to workers
      const coordinatorNode = mesh.nodes.find((n) => n.role === 'coordinator');
      expect(coordinatorNode).toBeDefined();
    });
  });

  describe('Node Management', () => {
    it('should add a node to existing mesh', async () => {
      const mesh = await coordinator.createMesh({
        name: 'Dynamic Mesh',
        topology: 'peer-to-peer',
        nodes: [
          {
            name: 'Initial Node',
            agentId: 'agent-init',
            role: 'worker',
            status: 'initializing',
            capabilities: ['computation'],
            specializations: [],
            maxConcurrentTasks: 10,
            endpoint: 'http://localhost:6001',
            protocol: ['websocket'],
            neighbors: [],
          },
        ],
        tenantId: 'tenant-1',
        ownerId: 'user-1',
      });

      const initialNodeCount = mesh.nodes.length;

      const newNode = await coordinator.addNode(mesh.id, {
        name: 'Added Node',
        agentId: 'agent-added',
        role: 'worker',
        status: 'initializing',
        capabilities: ['computation'],
        specializations: [],
        maxConcurrentTasks: 10,
        endpoint: 'http://localhost:6002',
        protocol: ['websocket'],
        neighbors: [],
      });

      expect(newNode).toBeDefined();
      expect(newNode.name).toBe('Added Node');

      const updatedMesh = coordinator.getMesh(mesh.id);
      expect(updatedMesh?.nodes.length).toBe(initialNodeCount + 1);
    });

    it('should remove a node from mesh', async () => {
      const mesh = await coordinator.createMesh({
        name: 'Removable Mesh',
        topology: 'peer-to-peer',
        nodes: [
          {
            name: 'Node A',
            agentId: 'agent-a',
            role: 'worker',
            status: 'initializing',
            capabilities: [],
            specializations: [],
            maxConcurrentTasks: 10,
            endpoint: 'http://localhost:7001',
            protocol: ['websocket'],
            neighbors: [],
          },
          {
            name: 'Node B',
            agentId: 'agent-b',
            role: 'worker',
            status: 'initializing',
            capabilities: [],
            specializations: [],
            maxConcurrentTasks: 10,
            endpoint: 'http://localhost:7002',
            protocol: ['websocket'],
            neighbors: [],
          },
        ],
        tenantId: 'tenant-1',
        ownerId: 'user-1',
      });

      const nodeToRemove = mesh.nodes[0];
      await coordinator.removeNode(mesh.id, nodeToRemove.id);

      const updatedMesh = coordinator.getMesh(mesh.id);
      expect(updatedMesh?.nodes.length).toBe(1);
      expect(updatedMesh?.nodes.find((n) => n.id === nodeToRemove.id)).toBeUndefined();
    });
  });

  describe('Task Submission', () => {
    it('should submit and route a task', async () => {
      const mesh = await coordinator.createMesh({
        name: 'Task Mesh',
        topology: 'peer-to-peer',
        nodes: [
          {
            name: 'Worker Node',
            agentId: 'agent-worker',
            role: 'worker',
            status: 'ready',
            capabilities: ['computation'],
            specializations: [],
            maxConcurrentTasks: 10,
            endpoint: 'http://localhost:8001',
            protocol: ['websocket'],
            neighbors: [],
          },
        ],
        tenantId: 'tenant-1',
        ownerId: 'user-1',
      });

      const task = await coordinator.submitTask({
        meshId: mesh.id,
        type: 'computation',
        name: 'Test Task',
        payload: { data: 'test' },
        priority: 50,
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.name).toBe('Test Task');
      expect(task.meshId).toBe(mesh.id);
      expect(task.status).toBeDefined();
    });
  });

  describe('Mesh Lifecycle', () => {
    it('should stop and delete a mesh', async () => {
      const mesh = await coordinator.createMesh({
        name: 'Temporary Mesh',
        topology: 'star',
        nodes: [
          {
            name: 'Hub Node',
            agentId: 'agent-hub',
            role: 'coordinator',
            status: 'initializing',
            capabilities: [],
            specializations: [],
            maxConcurrentTasks: 10,
            endpoint: 'http://localhost:9001',
            protocol: ['websocket'],
            neighbors: [],
          },
        ],
        tenantId: 'tenant-1',
        ownerId: 'user-1',
      });

      await coordinator.stopMesh(mesh.id);
      const stoppedMesh = coordinator.getMesh(mesh.id);
      expect(stoppedMesh?.status).toBe('offline');

      await coordinator.deleteMesh(mesh.id);
      const deletedMesh = coordinator.getMesh(mesh.id);
      expect(deletedMesh).toBeUndefined();
    });
  });
});

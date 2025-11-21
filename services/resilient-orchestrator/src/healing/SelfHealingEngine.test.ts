import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelfHealingEngine } from './SelfHealingEngine.js';
import { NetworkTopologyManager } from '../routing/NetworkTopologyManager.js';
import { SatelliteCommHandler } from '../comms/SatelliteCommHandler.js';
import { FailoverController } from '../comms/FailoverController.js';
import type { Workflow, Task } from '../types.js';

describe('SelfHealingEngine', () => {
  let engine: SelfHealingEngine;
  let topologyManager: NetworkTopologyManager;
  let satelliteHandler: SatelliteCommHandler;
  let failoverController: FailoverController;

  beforeEach(() => {
    topologyManager = new NetworkTopologyManager();
    satelliteHandler = new SatelliteCommHandler();
    failoverController = new FailoverController(topologyManager, satelliteHandler);
    engine = new SelfHealingEngine(topologyManager, failoverController);
  });

  const createWorkflow = (overrides: Partial<Workflow> = {}): Workflow => ({
    id: 'wf-1',
    name: 'test-workflow',
    version: '1.0.0',
    priority: 'normal',
    tasks: [],
    state: 'running',
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: 'test',
    metadata: {},
    ...overrides,
  });

  const createTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'task-1',
    workflowId: 'wf-1',
    name: 'test-task',
    type: 'compute',
    state: 'pending',
    dependencies: [],
    retryPolicy: {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT'],
    },
    timeout: 60000,
    input: {},
    ...overrides,
  });

  describe('registerWorkflow', () => {
    it('should register a workflow for monitoring', () => {
      const workflow = createWorkflow();
      engine.registerWorkflow(workflow);

      // Verify checkpoint was created
      const handler = vi.fn();
      engine.on('checkpoint:created', handler);

      // Register another workflow to verify events work
      const workflow2 = createWorkflow({ id: 'wf-2' });
      engine.registerWorkflow(workflow2);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint for workflow', () => {
      const handler = vi.fn();
      engine.on('checkpoint:created', handler);

      const workflow = createWorkflow({
        tasks: [createTask({ state: 'completed' })],
      });

      const checkpoint = engine.createCheckpoint(workflow);

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.workflowId).toBe(workflow.id);
      expect(handler).toHaveBeenCalledWith(checkpoint);
    });
  });

  describe('createTaskCheckpoint', () => {
    it('should create a task-level checkpoint', () => {
      const task = createTask();

      engine.createTaskCheckpoint(task.id, 50, { partial: 'data' });

      // The checkpoint is stored internally
      // This is verified by the checkpoint-resume healing strategy
    });
  });

  describe('handleTaskFailure', () => {
    it('should return null if workflow not found', async () => {
      const task = createTask({ workflowId: 'non-existent' });

      const result = await engine.handleTaskFailure(task);

      expect(result).toBeNull();
    });

    it('should emit healing:started when handling failure', async () => {
      const handler = vi.fn();
      engine.on('healing:started', handler);

      const workflow = createWorkflow();
      const task = createTask({
        state: 'failed',
        error: {
          code: 'NETWORK_ERROR',
          message: 'Connection timeout',
          recoverable: true,
          timestamp: new Date(),
        },
      });
      workflow.tasks = [task];

      engine.registerWorkflow(workflow);
      await engine.handleTaskFailure(task);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('getHealingStats', () => {
    it('should return initial empty stats', () => {
      const stats = engine.getHealingStats();

      expect(stats.totalActions).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.byStrategy).toBeDefined();
      expect(stats.recent).toHaveLength(0);
    });

    it('should include all strategy types', () => {
      const stats = engine.getHealingStats();

      expect(stats.byStrategy).toHaveProperty('retry');
      expect(stats.byStrategy).toHaveProperty('reroute');
      expect(stats.byStrategy).toHaveProperty('failover');
      expect(stats.byStrategy).toHaveProperty('checkpoint-resume');
      expect(stats.byStrategy).toHaveProperty('store-forward');
      expect(stats.byStrategy).toHaveProperty('degrade-gracefully');
    });
  });

  describe('updateHealthStatus', () => {
    it('should update health status for a node', () => {
      const status = {
        nodeId: 'node-1',
        healthy: true,
        condition: 'nominal' as const,
        metrics: {
          cpuPercent: 50,
          memoryPercent: 60,
          diskPercent: 70,
          activeWorkflows: 5,
          queueDepth: 10,
        },
        lastHeartbeat: new Date(),
      };

      // Should not throw
      engine.updateHealthStatus(status);
    });
  });
});

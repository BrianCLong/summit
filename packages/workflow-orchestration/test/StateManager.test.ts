import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../src/state/StateManager.js';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  it('should store and retrieve DAG config', () => {
    const config = {
      dagId: 'test-dag',
      description: 'Test DAG',
      defaultArgs: {},
    };

    stateManager.storeDagConfig(config);
    const retrieved = stateManager.getDagConfig('test-dag');

    expect(retrieved).toEqual(config);
  });

  it('should store and retrieve workflow execution', () => {
    const execution = {
      executionId: 'exec-1',
      dagId: 'test-dag',
      state: 'running' as const,
      startTime: new Date(),
      params: {},
    };

    stateManager.storeWorkflowExecution(execution);
    const retrieved = stateManager.getWorkflowExecution('exec-1');

    expect(retrieved?.executionId).toBe('exec-1');
    expect(retrieved?.state).toBe('running');
  });

  it('should update workflow state', () => {
    const execution = {
      executionId: 'exec-1',
      dagId: 'test-dag',
      state: 'running' as const,
      startTime: new Date(),
      params: {},
    };

    stateManager.storeWorkflowExecution(execution);
    stateManager.updateWorkflowState('exec-1', 'success');

    const retrieved = stateManager.getWorkflowExecution('exec-1');
    expect(retrieved?.state).toBe('success');
    expect(retrieved?.endTime).toBeDefined();
  });

  it('should get active workflows', () => {
    stateManager.storeWorkflowExecution({
      executionId: 'exec-1',
      dagId: 'dag-1',
      state: 'running',
      startTime: new Date(),
      params: {},
    });

    stateManager.storeWorkflowExecution({
      executionId: 'exec-2',
      dagId: 'dag-2',
      state: 'success',
      startTime: new Date(),
      params: {},
    });

    const active = stateManager.getActiveWorkflows();
    expect(active.length).toBe(1);
    expect(active[0].executionId).toBe('exec-1');
  });

  it('should create and retrieve snapshots', () => {
    stateManager.storeWorkflowExecution({
      executionId: 'exec-1',
      dagId: 'dag-1',
      state: 'running',
      startTime: new Date(),
      params: {},
    });

    const snapshot = stateManager.createSnapshot();
    expect(snapshot.workflowExecutions.length).toBe(1);
    expect(snapshot.timestamp).toBeDefined();

    const latest = stateManager.getLatestSnapshot();
    expect(latest).toEqual(snapshot);
  });

  it('should return statistics', () => {
    stateManager.storeWorkflowExecution({
      executionId: 'exec-1',
      dagId: 'dag-1',
      state: 'success',
      startTime: new Date(),
      params: {},
    });

    stateManager.storeWorkflowExecution({
      executionId: 'exec-2',
      dagId: 'dag-2',
      state: 'failed',
      startTime: new Date(),
      params: {},
    });

    const stats = stateManager.getStatistics();
    expect(stats.totalWorkflows).toBe(2);
    expect(stats.successfulWorkflows).toBe(1);
    expect(stats.failedWorkflows).toBe(1);
  });
});

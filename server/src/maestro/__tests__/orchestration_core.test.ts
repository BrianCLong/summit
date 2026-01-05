import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';
import { Maestro } from '../core';
import { AgentService } from '../agent_service';
import { PolicyEngine } from '../policy/PolicyEngine';
import { Task } from '../types';

describe('Maestro Orchestration Core', () => {
  let mockIg: any;
  let mockCostMeter: any;
  let mockLlm: any;
  let mockGraphTool: any;
  let maestro: Maestro;

  beforeEach(() => {
    mockIg = {
      createRun: mock.fn(),
      createTask: mock.fn(),
      updateTask: mock.fn(),
      createArtifact: mock.fn(),
    };
    mockCostMeter = {
      summarize: mock.fn(),
    };
    mockLlm = {
      callCompletion: mock.fn(async () => ({ content: 'Mock response' })),
    };
    mockGraphTool = {
      execute: mock.fn(async () => [{ id: 'node-1', labels: ['Test'] }]),
    };

    // We can instantiate Maestro with defaults
    maestro = new Maestro(
        mockIg,
        mockCostMeter,
        mockLlm,
        { defaultPlannerAgent: 'mock', defaultActionAgent: 'mock' }
    );
  });

  test('should execute standard LLM task', async () => {
    const task: Task = {
      id: 'task-1',
      runId: 'run-1',
      status: 'queued',
      kind: 'action',
      agent: { id: 'agent-1', name: 'gpt', kind: 'llm', modelId: 'gpt-4' },
      description: 'do something',
      input: { requestText: 'hi' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await maestro.executeTask(task);
    assert.strictEqual(result.task.status, 'succeeded');
    assert.ok(result.artifact);
    assert.match(mockIg.updateTask.mock.calls[0].arguments[1].status, /running/);
  });

  test('should block task if policy fails', async () => {
    // Custom policy engine that denies everything
    const denyPolicy = {
        evaluate: async () => ({ allowed: false, reason: 'Denied by test' })
    };

    maestro = new Maestro(
        mockIg,
        mockCostMeter,
        mockLlm,
        { defaultPlannerAgent: 'mock', defaultActionAgent: 'mock' },
        denyPolicy as any
    );

    const task: Task = {
      id: 'task-2',
      runId: 'run-1',
      status: 'queued',
      kind: 'action',
      agent: { id: 'agent-1', name: 'gpt', kind: 'llm' },
      description: 'do something',
      input: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await maestro.executeTask(task);
    assert.strictEqual(result.task.status, 'failed');
    assert.match(result.task.errorMessage || '', /Denied by test/);
  });

  test('GraphTool integration should be attempted for graph-engine tasks', async () => {
    // Inject the mock graph tool
    maestro = new Maestro(
        mockIg,
        mockCostMeter,
        mockLlm,
        { defaultPlannerAgent: 'mock', defaultActionAgent: 'mock' },
        undefined, // default policy engine
        mockGraphTool
    );

    const task: Task = {
        id: 'task-3',
        runId: 'run-1',
        status: 'queued',
        kind: 'graph.analysis',
        agent: { id: 'graph-1', name: 'graph', kind: 'graph-engine' },
        description: 'query graph',
        input: { query: 'MATCH (n) RETURN n' }, // Valid input
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const result = await maestro.executeTask(task);

    // Assert status is succeeded (since mock returns data)
    assert.strictEqual(result.task.status, 'succeeded');

    // Assert graph tool was called
    assert.strictEqual(mockGraphTool.execute.mock.callCount(), 1);

    // Assert artifact data
    const artifactData = JSON.parse(result.artifact?.data as string);
    assert.deepStrictEqual(artifactData, [{ id: 'node-1', labels: ['Test'] }]);
  });
});

import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { Maestro } from '../core.js';
import { Task } from '../types.js';

describe('Maestro Orchestration Core', () => {
  let mockIg: any;
  let mockCostMeter: any;
  let mockLlm: any;
  let maestro: Maestro;

  beforeEach(() => {
    mockIg = {
      createRun: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      createArtifact: jest.fn(),
    };
    mockCostMeter = {
      summarize: jest.fn(),
    };
    mockLlm = {
      callCompletion: jest.fn(async () => ({ content: 'Mock response' })),
    };

    maestro = new Maestro(
      mockIg,
      mockCostMeter,
      mockLlm,
      { defaultPlannerAgent: 'mock', defaultActionAgent: 'mock' },
    );
  });

  it('should execute standard LLM task', async () => {
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
    expect(result.task.status).toBe('succeeded');
    expect(result.artifact).toBeTruthy();
    expect(mockIg.updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ status: 'running' }),
    );
  });

  it('marks the task failed when the LLM throws', async () => {
    mockLlm.callCompletion.mockImplementation(async () => {
      throw new Error('LLM down');
    });

    const task: Task = {
      id: 'task-2',
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
    expect(result.task.status).toBe('failed');
    expect(result.task.errorMessage).toContain('LLM down');
  });

  it('executes non-LLM tasks with a placeholder result', async () => {
    const task: Task = {
      id: 'task-3',
      runId: 'run-1',
      status: 'queued',
      kind: 'graph.analysis',
      agent: { id: 'graph-1', name: 'graph', kind: 'graph-engine' },
      description: 'query graph',
      input: { query: 'MATCH (n) RETURN n' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await maestro.executeTask(task);
    expect(result.task.status).toBe('succeeded');
    expect(result.artifact?.data).toContain('TODO: implement non-LLM agent');
  });
});

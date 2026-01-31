
import { jest } from '@jest/globals';
import { Maestro } from '../src/maestro/core';
import { IntelGraphClient } from '../src/intelgraph/client';
import { CostMeter } from '../src/maestro/cost_meter';
import { OpenAILLM } from '../src/maestro/adapters/llm_openai';
import { Task } from '../src/maestro/types';

describe('Maestro Reliability', () => {
  let maestro: Maestro;
  let mockIg: jest.Mocked<IntelGraphClient>;
  let mockCostMeter: jest.Mocked<CostMeter>;
  let mockLlm: jest.Mocked<OpenAILLM>;

  beforeEach(() => {
    mockIg = {
      createRun: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      createArtifact: jest.fn(),
    } as any;

    mockCostMeter = {} as any;

    mockLlm = {
      callCompletion: jest.fn(),
    } as any;

    maestro = new Maestro(
      mockIg,
      mockCostMeter,
      mockLlm,
      { defaultPlannerAgent: 'agent-1', defaultActionAgent: 'agent-2' }
    );
  });

  it('should retry LLM call on failure and succeed', async () => {
    const task: Task = {
      id: 'task-1',
      runId: 'run-1',
      kind: 'action',
      status: 'queued',
      agent: { kind: 'llm', modelId: 'gpt-4', id: 'agent-2', name: 'test' },
      description: 'test task',
      input: { requestText: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Fail twice, then succeed
    mockLlm.callCompletion
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({ content: 'Success', usage: { totalTokens: 10 } } as any);

    const result = await maestro.executeTask(task);

    expect(result.task.status).toBe('succeeded');
    expect(result.task.output?.result).toBe('Success');
    expect(mockLlm.callCompletion).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const task: Task = {
      id: 'task-1',
      runId: 'run-1',
      kind: 'action',
      status: 'queued',
      agent: { kind: 'llm', modelId: 'gpt-4', id: 'agent-2', name: 'test' },
      description: 'test task',
      input: { requestText: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Fail 3 times
    mockLlm.callCompletion.mockRejectedValue(new Error('Persistent error'));

    const result = await maestro.executeTask(task);

    expect(result.task.status).toBe('failed');
    expect(result.task.errorMessage).toBe('Persistent error');
    expect(mockLlm.callCompletion).toHaveBeenCalledTimes(3);
  });
});

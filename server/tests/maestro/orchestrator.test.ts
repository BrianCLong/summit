import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Maestro } from '../../src/maestro/core';
import { IntelGraphClient } from '../../src/intelgraph/client';
import { CostMeter } from '../../src/maestro/cost_meter';
import { OpenAILLM } from '../../src/maestro/adapters/llm_openai';
import { Run } from '../../src/maestro/types';

describe('Maestro Core', () => {
  let maestro: Maestro;
  let mockIgClient: IntelGraphClient;
  let mockCostMeter: CostMeter;
  let mockLlm: OpenAILLM;

  beforeEach(() => {
    // Re-create mocks for each test to avoid resetMocks: true issue
    mockIgClient = {
      createRun: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      createArtifact: jest.fn(),
    } as unknown as IntelGraphClient;

    mockCostMeter = {
      summarize: jest.fn().mockResolvedValue({ totalTokens: 100, cost: 0.002 }),
    } as unknown as CostMeter;

    mockLlm = {
      callCompletion: jest.fn().mockResolvedValue('Mocked LLM Response'),
    } as unknown as OpenAILLM;

    maestro = new Maestro(
      mockIgClient,
      mockCostMeter,
      mockLlm,
      {
        defaultPlannerAgent: 'gpt-4',
        defaultActionAgent: 'gpt-3.5',
      }
    );
  });

  it('should create a run', async () => {
    const run = await maestro.createRun('user-1', 'Test Request');
    expect(run).toBeDefined();
    expect(run.id).toBeDefined();
    expect(run.user.id).toBe('user-1');
    expect(mockIgClient.createRun).toHaveBeenCalledWith(run);
  });

  it('should plan a request', async () => {
    const run: Run = { id: 'run-1', user: { id: 'u1' }, createdAt: '', requestText: 'Hello' };
    const tasks = await maestro.planRequest(run);

    expect(tasks).toHaveLength(2); // plan + action
    expect(tasks[0].kind).toBe('plan');
    expect(tasks[1].kind).toBe('action');
    expect(mockIgClient.createTask).toHaveBeenCalledTimes(2);
  });

  it('should execute a task successfully', async () => {
    const task: any = {
      id: 'task-1',
      runId: 'run-1',
      kind: 'action',
      status: 'queued',
      description: 'Do work',
      input: { requestText: 'Work' },
      agent: { kind: 'llm', modelId: 'gpt-4' },
    };

    const result = await maestro.executeTask(task);

    expect(result.task.status).toBe('succeeded');
    expect(result.artifact).toBeDefined();
    expect(result.artifact?.data).toBe('Mocked LLM Response');
    expect(mockIgClient.updateTask).toHaveBeenCalled();
    expect(mockIgClient.createArtifact).toHaveBeenCalled();
  });

  it('should handle task execution failure', async () => {
    (mockLlm.callCompletion as jest.Mock).mockRejectedValueOnce(new Error('LLM Error'));

    const task: any = {
      id: 'task-1',
      runId: 'run-1',
      kind: 'action',
      status: 'queued',
      description: 'Do work',
      input: { requestText: 'Work' },
      agent: { kind: 'llm', modelId: 'gpt-4' },
    };

    const result = await maestro.executeTask(task);

    expect(result.task.status).toBe('failed');
    expect(result.task.errorMessage).toBe('LLM Error');
    expect(result.artifact).toBeNull();
    expect(mockIgClient.updateTask).toHaveBeenCalled();
  });

  it('should run full pipeline', async () => {
    const res = await maestro.runPipeline('user-1', 'Full Run');

    expect(res.run).toBeDefined();
    expect(res.tasks).toHaveLength(2);
    expect(res.results).toHaveLength(1); // Only the action task is 'queued' and executed
    expect(res.costSummary).toBeDefined();
  });
});

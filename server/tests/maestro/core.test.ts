// server/tests/maestro/core.test.ts

import { Maestro } from '../../src/maestro/core';
import { CostMeter } from '../../src/maestro/cost_meter';
import { IntelGraphClient } from '../../src/intelgraph/client';

function createMockIntelGraph(): IntelGraphClient {
  return {
    createRun: jest.fn(),
    updateRun: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    createArtifact: jest.fn(),
    recordCostSample: jest.fn(),
    getRunCostSummary: jest.fn().mockResolvedValue({
      runId: 'test-run',
      totalCostUSD: 0.0123,
      totalInputTokens: 123,
      totalOutputTokens: 456,
      byModel: {
        'openai:gpt-4.1': {
          costUSD: 0.0123,
          inputTokens: 123,
          outputTokens: 456,
        },
      },
    }),
    getRun: jest.fn().mockResolvedValue({
      id: 'test-run',
      user: { id: 'user-1' },
      createdAt: new Date().toISOString(),
      requestText: 'test request',
      status: 'completed'
    }),
    getTasksForRun: jest.fn().mockResolvedValue([
      { id: 'task-plan', status: 'succeeded', description: 'Plan' },
      { id: 'task-act', status: 'succeeded', description: 'Action' }
    ]),
    getTask: jest.fn(),
    getArtifactsForRun: jest.fn().mockResolvedValue([]),
    getArtifactsForTask: jest.fn().mockResolvedValue([]),
  };
}

const mockLLM = {
  callCompletion: jest.fn().mockResolvedValue('mock-llm-output'),
};

describe('Maestro core', () => {
  let ig: IntelGraphClient;
  let costMeter: CostMeter;
  let maestro: Maestro;

  beforeEach(() => {
    ig = createMockIntelGraph();
    costMeter = new CostMeter(ig, {
      'openai:gpt-4.1': { inputPer1K: 0.01, outputPer1K: 0.03 },
    });

    maestro = new Maestro(
      ig,
      costMeter,
      mockLLM as any,
      {
        defaultPlannerAgent: 'openai:gpt-4.1',
        defaultActionAgent: 'openai:gpt-4.1',
      },
    );
  });

  it('creates a run, plans tasks, executes, and returns cost summary', async () => {
    // Override getRun to return created run ID logic if needed, but mock is simple
    const result = await maestro.runPipeline('user-1', 'test request');

    // Run basics
    // Note: ID is generated inside runPipeline, so we check calls
    expect(ig.createRun).toHaveBeenCalledTimes(1);

    // Plan created at least 2 tasks
    expect(ig.createTask).toHaveBeenCalledTimes(2);
    expect(result.tasks.length).toBeGreaterThanOrEqual(1);

    // LLM called for action task
    expect(mockLLM.callCompletion).toHaveBeenCalled();

    // Artifact created
    expect(ig.createArtifact).toHaveBeenCalledTimes(1);

    // Cost summary passed through
    // result.costSummary comes from ig.getRunCostSummary which is mocked
    expect(result.costSummary.totalInputTokens).toBe(123);
  });

  it('marks task failed when execution throws', async () => {
    (mockLLM.callCompletion as any).mockRejectedValueOnce(
      new Error('boom'),
    );

    // Mock getRun and getTasksForRun to reflect the failure state for the response builder
    (ig.getRun as jest.Mock).mockResolvedValueOnce({
      id: 'test-run',
      user: { id: 'user-1' },
      createdAt: new Date().toISOString(),
      requestText: 'test request',
      status: 'failed'
    });

    (ig.getTasksForRun as jest.Mock).mockResolvedValueOnce([
       { id: 'task-plan', status: 'succeeded', description: 'Plan' },
       { id: 'task-act', status: 'failed', description: 'Action', errorMessage: 'boom' }
    ]);

    const result = await maestro.runPipeline('user-1', 'test request');

    // Verify DB updates were called
    expect(ig.updateTask).toHaveBeenCalledWith(
      expect.stringMatching(/task-act/),
      expect.objectContaining({ status: 'failed', errorMessage: 'boom' })
    );
    expect(ig.updateRun).toHaveBeenCalledWith(
      expect.stringMatching(/run-/),
      expect.objectContaining({ status: 'failed' })
    );

    // Verify response
    const failedTask = result.results.find(
      r => r.task.status === 'failed',
    );
    expect(failedTask).toBeTruthy();
    expect(failedTask?.task.errorMessage).toMatch(/boom/);
  });
});

// server/tests/maestro/queries.test.ts

import { MaestroQueries } from '../../src/maestro/queries';
import type { IntelGraphClient } from '../../src/intelgraph/client';

describe('MaestroQueries', () => {
  it('builds a MaestroRunResponse from graph data', async () => {
    const ig: IntelGraphClient = {
      // writes not used in this test
      createRun: jest.fn(),
      updateRun: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      createArtifact: jest.fn(),
      recordCostSample: jest.fn(),
      // reads
      getRun: jest.fn().mockResolvedValue({
        id: 'run-1',
        user: { id: 'user-1' },
        createdAt: new Date().toISOString(),
        requestText: 'hello',
      }),
      getTasksForRun: jest.fn().mockResolvedValue([
        {
          id: 'task-1',
          runId: 'run-1',
          status: 'succeeded',
          agent: { id: 'agent-1', name: 'agent', kind: 'llm' },
          kind: 'action',
          description: 'do something',
          input: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
      getTask: jest.fn(),
      getArtifactsForRun: jest.fn().mockResolvedValue([
        {
          id: 'artifact-1',
          runId: 'run-1',
          taskId: 'task-1',
          kind: 'text',
          label: 'task-output',
          data: 'result',
          createdAt: new Date().toISOString(),
        },
      ]),
      getArtifactsForTask: jest.fn(),
      getRunCostSummary: jest.fn().mockResolvedValue({
        runId: 'run-1',
        totalCostUSD: 0.001,
        totalInputTokens: 10,
        totalOutputTokens: 20,
        byModel: {
          'openai:gpt-4.1': {
            costUSD: 0.001,
            inputTokens: 10,
            outputTokens: 20,
          },
        },
      }),
    };

    const queries = new MaestroQueries(ig);
    const response = await queries.getRunResponse('run-1');

    expect(response).not.toBeNull();
    if (!response) return;

    expect(response.run.id).toBe('run-1');
    expect(response.tasks).toHaveLength(1);
    expect(response.results[0].artifact?.data).toBe('result');
    expect(response.costSummary.totalInputTokens).toBe(10);
  });
});

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { systemMonitor } from '../../src/lib/system-monitor';
import type { AgentTask } from '../../src/orchestrator/types';

let maestro: typeof import('../../src/orchestrator/maestro').maestro;

beforeAll(async () => {
  ({ maestro } = await import('../../src/orchestrator/maestro'));
});

describe('Maestro Orchestrator & RunManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(systemMonitor, 'getHealth').mockReturnValue({
      isOverloaded: false,
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0,
        loadAverage: [0, 0, 0],
      },
    });
  });

  afterAll(async () => {
    await maestro.shutdown();
  });

  it('enqueues a task when policy allows it', async () => {
    const task: AgentTask = {
      kind: 'plan',
      repo: 'test-repo',
      issue: 'issue-123',
      budgetUSD: 10,
      context: {},
      metadata: {
        actor: 'test-user',
        timestamp: new Date().toISOString(),
        sprint_version: 'v1',
      },
    };

    const jobId = await maestro.enqueueTask(task);
    expect(jobId).toBeDefined();
  });

  it('rejects tasks that violate policy guardrails', async () => {
    const task: AgentTask = {
      kind: 'plan',
      repo: 'test-repo',
      issue: 'issue-oversized-budget',
      budgetUSD: 100,
      context: {},
      metadata: {
        actor: 'test-user',
        timestamp: new Date().toISOString(),
        sprint_version: 'v1',
      },
    };

    await expect(maestro.enqueueTask(task)).rejects.toThrow(/policy/i);
  });
});

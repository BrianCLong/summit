import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PlaybookExecutorService } from '../playbook-executor.js';
import type { PlaybookDefinition } from '../types.js';

let workerProcessor: ((job: { data: any }) => Promise<void>) | null = null;

const queuedJobs: Array<{ name: string; data: any; opts?: any }> = [];

const mockQueue = {
  add: jest.fn(async (name: string, data: any, opts?: any) => {
    queuedJobs.push({ name, data, opts });
  }),
  close: jest.fn(),
};

const makePlaybook = (): PlaybookDefinition => ({
  id: 'pb-1',
  name: 'Test Playbook',
  steps: [
    { id: 'step-1', kind: 'action', action: 'mock.first' },
    { id: 'step-2', kind: 'action', action: 'mock.second' },
  ],
});

describe('PlaybookExecutorService', () => {
  beforeEach(() => {
    (PlaybookExecutorService as any).instance = null;
    queuedJobs.length = 0;
    mockQueue.add.mockReset();
    mockQueue.add.mockImplementation(async (name: string, data: any, opts?: any) => {
      queuedJobs.push({ name, data, opts });
    });
    workerProcessor = null;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('validates playbook schema', async () => {
    const service = PlaybookExecutorService.getInstance({
      redisConnection: {},
      queueFactory: () => mockQueue,
      workerFactory: (_name, processor) => {
        workerProcessor = processor;
        return { close: jest.fn() };
      },
    });
    const invalidPlaybook = { id: 'pb-1', name: 'Invalid' } as PlaybookDefinition;
    await expect(
      service.executePlaybook(invalidPlaybook, {
        runId: 'run-1',
        playbookId: 'pb-1',
        idempotencyKey: 'run-1',
      }),
    ).rejects.toThrow('Invalid playbook schema');

    await service.shutdown();
  });

  it('executes steps in order with idempotent run keys', async () => {
    const service = PlaybookExecutorService.getInstance({
      redisConnection: {},
      queueFactory: () => mockQueue,
      workerFactory: (_name, processor) => {
        workerProcessor = processor;
        return { close: jest.fn() };
      },
    });

    const executionOrder: string[] = [];
    service.registerActionHandler('mock.first', async () => {
      executionOrder.push('step-1');
    });
    service.registerActionHandler('mock.second', async () => {
      executionOrder.push('step-2');
    });

    const playbook = makePlaybook();
    const runContext = {
      runId: 'run-1',
      playbookId: playbook.id,
      idempotencyKey: 'idempotent-key',
    };

    const runPromise = service.executePlaybook(playbook, runContext);
    const runPromiseDuplicate = service.executePlaybook(playbook, runContext);

    expect(workerProcessor).not.toBeNull();
    expect(queuedJobs).toHaveLength(1);

    const firstJob = queuedJobs.shift();
    expect(firstJob).toBeDefined();
    await workerProcessor?.({ data: firstJob?.data });

    expect(queuedJobs).toHaveLength(1);
    const secondJob = queuedJobs.shift();
    expect(secondJob).toBeDefined();
    await workerProcessor?.({ data: secondJob?.data });

    jest.advanceTimersByTime(50);
    await Promise.resolve();

    const result = await runPromise;
    const duplicateResult = await runPromiseDuplicate;

    expect(result.status).toBe('succeeded');
    expect(duplicateResult.status).toBe('succeeded');
    expect(executionOrder).toEqual(['step-1', 'step-2']);
    expect(mockQueue.add).toHaveBeenCalledTimes(2);

    await service.shutdown();
  });
});

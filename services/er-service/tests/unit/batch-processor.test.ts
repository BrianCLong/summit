import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BatchProcessor } from '../../src/batch/BatchProcessor.js';

const addMock = jest.fn();
const closeMock = jest.fn();
const updateProgressMock = jest.fn();
const publishMock = jest.fn();
const executeMock = jest.fn();
const queryOneMock = jest.fn();
const mockClient = { query: jest.fn() } as const;
const transactionMock = jest.fn(async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient));
const resolveNowMock = jest.fn();

class MockQueue {
  constructor(public name: string) {}

  add = addMock;
  close = closeMock;
}

class MockWorker {
  handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

  constructor(public queueName: string, public processor: (job: unknown) => Promise<void>) {}

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.handlers[event] = [...(this.handlers[event] ?? []), handler];
  }

  async close(): Promise<void> {
    // noop for tests
  }
}

jest.mock('bullmq', () => ({
  __esModule: true,
  Queue: MockQueue,
  Worker: MockWorker,
  Job: class {},
}));

jest.mock('../../src/events/EventBus.js', () => ({
  __esModule: true,
  getEventBus: () => ({ publish: publishMock }),
}));

jest.mock('../../src/db/connection.js', () => ({
  __esModule: true,
  getDatabase: () => ({
    execute: executeMock,
    queryOne: queryOneMock,
    transaction: transactionMock,
  }),
}));

jest.mock('../../src/core/ResolutionService.js', () => ({
  __esModule: true,
  ResolutionService: jest.fn().mockImplementation(() => ({ resolveNow: resolveNowMock })),
}));

describe('BatchProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addMock.mockResolvedValue(undefined);
    closeMock.mockResolvedValue(undefined);
    updateProgressMock.mockResolvedValue(undefined);
    publishMock.mockResolvedValue(undefined);
    executeMock.mockResolvedValue(1);
    queryOneMock.mockResolvedValue(null);
    mockClient.query.mockResolvedValue({ rowCount: 1 });
    resolveNowMock.mockImplementation(async ({ recordRef }) => ({
      candidates: [
        {
          decision: 'AUTO_NO_MATCH',
          score: 0.5,
          nodeId: recordRef.recordId,
        },
      ],
      matchedNodeId: null,
      clusterId: null,
    }));
  });

  it('completes an empty batch without errors and persists completion', async () => {
    const processor = new BatchProcessor({ progressUpdateInterval: 1 });
    const records: Array<{ recordId: string; attributes: Record<string, unknown> }> = [];
    const job = await processor.submitBatch({
      tenantId: 'tenant-1',
      entityType: 'Person',
      datasetRef: 'dataset-empty',
      records,
      createdBy: 'tester',
    });

    await (processor as unknown as { processJob: (job: unknown) => Promise<void> }).processJob({
      data: { jobId: job.jobId, records },
      updateProgress: updateProgressMock,
    });

    expect(job.status).toBe('COMPLETED');
    expect(job.processedRecords).toBe(0);
    expect(job.completedAt).toBeDefined();
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'BATCH_COMPLETED',
        payload: expect.objectContaining({ processedRecords: 0 }),
      })
    );
  });

  it('honors cancellation mid-batch without marking the job completed', async () => {
    const processor = new BatchProcessor({ progressUpdateInterval: 1 });
    const records = [
      { recordId: 'r1', attributes: { firstName: 'A' } },
      { recordId: 'r2', attributes: { firstName: 'B' } },
      { recordId: 'r3', attributes: { firstName: 'C' } },
    ];
    const job = await processor.submitBatch({
      tenantId: 'tenant-1',
      entityType: 'Person',
      datasetRef: 'dataset-partial',
      records,
      createdBy: 'tester',
    });

    let callCount = 0;
    resolveNowMock.mockImplementation(async ({ recordRef }) => {
      callCount++;
      if (callCount === 1) {
        const inMemoryJob = (processor as unknown as { jobStore: Map<string, unknown> }).jobStore.get(job.jobId) as {
          status: string;
        } | null;
        if (inMemoryJob) {
          inMemoryJob.status = 'CANCELLED';
        }
      }
      return {
        candidates: [
          { decision: 'AUTO_MERGE', score: 0.9, nodeId: recordRef.recordId },
        ],
        matchedNodeId: 'node-' + recordRef.recordId,
        clusterId: 'cluster-' + recordRef.recordId,
      };
    });

    await (processor as unknown as { processJob: (job: unknown) => Promise<void> }).processJob({
      data: { jobId: job.jobId, records },
      updateProgress: updateProgressMock,
    });

    expect(job.status).toBe('CANCELLED');
    expect(job.processedRecords).toBe(1);
    expect(job.completedAt).toBeDefined();
    expect(publishMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'BATCH_COMPLETED' })
    );
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it('processes multiple jobs concurrently without sharing progress counters', async () => {
    const processor = new BatchProcessor({ progressUpdateInterval: 1 });
    const recordsA = [
      { recordId: 'a1', attributes: { firstName: 'A1' } },
      { recordId: 'a2', attributes: { firstName: 'A2' } },
    ];
    const jobA = await processor.submitBatch({
      tenantId: 'tenant-1',
      entityType: 'Person',
      datasetRef: 'dataset-a',
      records: recordsA,
      createdBy: 'tester',
    });
    const recordsB = [
      { recordId: 'b1', attributes: { name: 'B1' } },
      { recordId: 'b2', attributes: { name: 'B2' } },
    ];
    const jobB = await processor.submitBatch({
      tenantId: 'tenant-2',
      entityType: 'Organization',
      datasetRef: 'dataset-b',
      records: recordsB,
      createdBy: 'tester',
    });

    const updateProgressA = jest.fn();
    const updateProgressB = jest.fn();

    await Promise.all([
      (processor as unknown as { processJob: (job: unknown) => Promise<void> }).processJob({
        data: { jobId: jobA.jobId, records: recordsA },
        updateProgress: updateProgressA,
      }),
      (processor as unknown as { processJob: (job: unknown) => Promise<void> }).processJob({
        data: { jobId: jobB.jobId, records: recordsB },
        updateProgress: updateProgressB,
      }),
    ]);

    expect(jobA.processedRecords).toBe(2);
    expect(jobB.processedRecords).toBe(2);
    expect(jobA.status).toBe('COMPLETED');
    expect(jobB.status).toBe('COMPLETED');
    expect(transactionMock).toHaveBeenCalledTimes(4);
    expect(updateProgressA).toHaveBeenCalled();
    expect(updateProgressB).toHaveBeenCalled();
  });
});

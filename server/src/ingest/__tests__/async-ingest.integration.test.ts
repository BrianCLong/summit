import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  AsyncIngestDispatcher,
  AsyncIngestWorker,
  InMemoryAsyncIngestRepository,
} from '../async-pipeline';

describe('Async ingestion pipeline - integration', () => {
  const basePayload = {
    tenantId: 'tenant-a',
    sourceType: 'api',
    sourceId: 'source-1',
    userId: 'user-1',
    entities: [
      {
        externalId: 'person-1',
        kind: 'person',
        labels: ['Person'],
        properties: { name: 'Alice' },
      },
    ],
    relationships: [],
  };

  it('deduplicates identical payloads and processes once', async () => {
    const repo = new InMemoryAsyncIngestRepository();
    const dispatcher = new AsyncIngestDispatcher(repo as any);
    const ingestService = { ingest: jest.fn().mockResolvedValue({ success: true }) } as any;
    const worker = new AsyncIngestWorker(repo as any, ingestService, {
      batchSize: 5,
      baseBackoffMs: 10,
    });

    const first = await dispatcher.enqueue(basePayload as any, 'run-1');
    const second = await dispatcher.enqueue(basePayload as any, 'run-1');

    expect(first.jobId).toBe(second.jobId);
    expect(second.duplicate).toBe(true);

    await worker.processOnce();

    expect(ingestService.ingest).toHaveBeenCalledTimes(1);
    const job = repo.jobs.get(first.jobId)!;
    expect(job.status).toBe('COMPLETED');
    const processedEvents = Array.from(repo.outbox.values()).filter(
      (evt) => evt.processedAt,
    );
    expect(processedEvents).toHaveLength(1);
  });

  it('reschedules after failure and succeeds after restart', async () => {
    const repo = new InMemoryAsyncIngestRepository();
    const dispatcher = new AsyncIngestDispatcher(repo as any);
    const ingestService = {
      ingest: jest
        .fn()
        .mockRejectedValueOnce(new Error('neo4j down'))
        .mockResolvedValueOnce({ success: true }),
    } as any;
    const worker = new AsyncIngestWorker(repo as any, ingestService, {
      batchSize: 2,
      baseBackoffMs: 5,
    });

    const { jobId } = await dispatcher.enqueue(
      { ...basePayload, sourceId: 'source-2' } as any,
      'crashy-run',
    );

    await worker.processOnce();
    expect(ingestService.ingest).toHaveBeenCalledTimes(1);

    const afterFailure = repo.jobs.get(jobId)!;
    expect(afterFailure.status).toBe('FAILED');

    await worker.processOnce(new Date(Date.now() + 10_000));

    expect(ingestService.ingest).toHaveBeenCalledTimes(2);
    const completed = repo.jobs.get(jobId)!;
    expect(completed.status).toBe('COMPLETED');
    const processedOutbox = Array.from(repo.outbox.values()).find(
      (evt) => evt.jobId === jobId,
    );
    expect(processedOutbox?.processedAt).toBeTruthy();
  });
});

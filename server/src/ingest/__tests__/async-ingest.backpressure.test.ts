import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  AsyncIngestDispatcher,
  AsyncIngestWorker,
  InMemoryAsyncIngestRepository,
  calculateBackoffDelay,
} from '../async-pipeline';

describe('Async ingestion backpressure and backoff', () => {
  const payload = {
    tenantId: 'tenant-cap',
    sourceType: 'api',
    sourceId: 'src-cap',
    userId: 'user-cap',
    entities: [
      {
        externalId: 'entity-1',
        kind: 'indicator',
        labels: ['Indicator'],
        properties: { value: 'abc' },
      },
    ],
    relationships: [],
  };

  it('calculates exponential backoff with cap', () => {
    expect(calculateBackoffDelay(1, 100, 1000)).toBe(100);
    expect(calculateBackoffDelay(2, 100, 1000)).toBe(200);
    expect(calculateBackoffDelay(4, 100, 1000)).toBe(800);
    expect(calculateBackoffDelay(6, 100, 500)).toBe(500);
  });

  it('applies per-tenant concurrency cap and reschedules work', async () => {
    const repo = new InMemoryAsyncIngestRepository();
    const dispatcher = new AsyncIngestDispatcher(repo as any);
    const ingestService = { ingest: jest.fn().mockResolvedValue({ success: true }) } as any;
    const worker = new AsyncIngestWorker(repo as any, ingestService, {
      maxTenantConcurrency: 1,
      baseBackoffMs: 50,
      batchSize: 10,
    });

    const first = await dispatcher.enqueue(payload as any, 'cap-1');
    const second = await dispatcher.enqueue(
      { ...payload, sourceId: 'src-cap-2' } as any,
      'cap-2',
    );

    const firstJob = repo.jobs.get(first.jobId)!;
    repo.jobs.set(firstJob.id, { ...firstJob, status: 'PROCESSING' });

    await worker.processOnce();

    expect(ingestService.ingest).not.toHaveBeenCalled();

    const blocked = Array.from(repo.outbox.values()).find(
      (evt) => evt.jobId === second.jobId,
    )!;
    expect(blocked.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(blocked.processedAt).toBeFalsy();
  });
});

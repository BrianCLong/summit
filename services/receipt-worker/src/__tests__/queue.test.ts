import { ReceiptWorker } from '../queue';

const draft = {
  id: 'draft-1',
  caseId: 'case-1',
  claimIds: ['claim-1'],
  createdAt: new Date().toISOString(),
  actor: { id: 'agent-1', role: 'analyst' },
};

describe('ReceiptWorker', () => {
  it('processes jobs and records metrics', async () => {
    const worker = new ReceiptWorker();

    worker.enqueue({ id: 'job-1', draft });
    const receipt = await worker.tick();

    expect(receipt?.id).toBeDefined();
    expect(worker.getQueueLength()).toBe(0);

    const metrics = worker.getMetricsSnapshot();
    expect(metrics.processed).toBe(1);
  });

  it('routes failed jobs to DLQ after max attempts', async () => {
    let attempts = 0;
    const worker = new ReceiptWorker({
      maxAttempts: 2,
      handler: async () => {
        attempts += 1;
        throw new Error('boom');
      },
    });

    worker.enqueue({ id: 'job-2', draft });
    await worker.tick();
    await worker.tick();

    expect(attempts).toBe(2);
    expect(worker.getDlqLength()).toBe(1);
    expect(worker.getQueueLength()).toBe(0);
  });

  it('tracks backpressure when queue is saturated', () => {
    const worker = new ReceiptWorker({ backpressureThreshold: 1 });
    worker.enqueue({ id: 'job-3', draft });
    worker.enqueue({ id: 'job-4', draft });

    const snapshot = worker.getMetricsSnapshot();
    expect(snapshot.backpressure).toBe(true);
    expect(snapshot.queue).toBe(2);
  });
});

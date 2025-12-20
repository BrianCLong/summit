import { ExecutionReceipt } from '@intelgraph/provenance';
import { ReceiptWorker } from '../src';

const receipt: ExecutionReceipt = {
  id: 'r1',
  createdAt: new Date().toISOString(),
  executionId: 'e1',
  hashes: { inputs: [], outputs: [], manifest: 'm' },
  signer: { keyId: 'local', algorithm: 'ed25519' },
  signature: '',
};

describe('ReceiptWorker', () => {
  it('sends failed jobs to the DLQ after retries', async () => {
    const worker = new ReceiptWorker(async () => {
      throw new Error('fail');
    }, {});
    worker.enqueue({ id: 'job-1', receipt });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const metrics = worker.metricsSnapshot();
    expect(metrics.dlqDepth).toBe(1);
    expect(metrics.failed).toBe(1);
  });

  it('tracks backpressure when queue exceeds threshold', () => {
    const worker = new ReceiptWorker(async () => {}, { backpressureThreshold: 1 });
    worker.enqueue({ id: 'job-1', receipt });
    worker.enqueue({ id: 'job-2', receipt });
    const metrics = worker.metricsSnapshot();
    expect(metrics.backpressure).toBe(true);
  });
});

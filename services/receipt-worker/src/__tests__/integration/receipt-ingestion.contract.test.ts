import {
  RECEIPT_VERSION,
  Receipt,
  computeReceiptHash,
  computeReceiptPayloadHash,
} from '@intelgraph/provenance';
import { createReceiptWorker } from '../../index';
import { ReceiptWorkerMetrics } from '../../metrics/metrics';

type IngestPayload = {
  idempotencyKey: string;
  receipt: Receipt;
};

const baseReceipt: Receipt = {
  id: 'rcpt-valid-001',
  version: RECEIPT_VERSION,
  caseId: 'case-ingest-007',
  claimIds: ['claim-01'],
  createdAt: '2025-01-05T00:00:00.000Z',
  actor: { id: 'agent-99', role: 'analyst', tenantId: 'tenant-88' },
  pipeline: { runId: 'run-abc', taskId: 'task-1' },
  payloadHash: '',
  signature: {
    algorithm: 'ed25519',
    keyId: 'kms-test',
    publicKey: 'cHVibGljLWRldg==',
    value: 'c2lnbmF0dXJl',
    signedAt: '2025-01-05T00:00:00.000Z',
  },
  proofs: {
    receiptHash: '',
    manifestMerkleRoot: 'merkle-root-123',
    claimHashes: ['claim-hash-01'],
  },
  metadata: { workflow: 'ingest', region: 'us-test-1' },
};

function finalizeReceipt(template: Receipt, signatureValue = 'c2lnbmF0dXJl') {
  const payloadHash = computeReceiptPayloadHash(template);
  const signed: Receipt = {
    ...template,
    payloadHash,
    signature: { ...template.signature, value: signatureValue },
  };

  const receiptHash = computeReceiptHash(signed);
  return {
    ...signed,
    proofs: { ...signed.proofs, receiptHash },
  } as Receipt;
}

const validReceipt = finalizeReceipt(baseReceipt);
const invalidReceipt = finalizeReceipt({
  ...baseReceipt,
  claimIds: [],
});
const replayReceipt = finalizeReceipt({
  ...baseReceipt,
  id: 'rcpt-valid-001-replay',
  createdAt: '2025-01-05T00:10:00.000Z',
  metadata: { ...baseReceipt.metadata, replay: true },
});

describe('receipt ingestion contract', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-05T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('validates, enqueues, processes, writes to ledger, and dedupes replays', async () => {
    const metrics = new ReceiptWorkerMetrics();
    const ledgerWrites: Array<{
      receiptId: string;
      caseId: string;
      claimIds: string[];
      payloadHash: string;
      idempotencyKey: string;
    }> = [];
    const processedKeys = new Set<string>();

    const { worker, queue, deadLetterQueue } = createReceiptWorker<IngestPayload>({
      metrics,
      config: { pollIntervalMs: 5, backoffMs: 10, backoffCapMs: 10, maxAttempts: 2 },
      handler: async (job) => {
        if (!job.payload?.idempotencyKey) {
          throw new Error('idempotency key required');
        }

        const receipt = job.payload.receipt;
        if (!receipt.caseId || receipt.claimIds.length === 0) {
          throw new Error('invalid receipt payload');
        }

        if (processedKeys.has(job.payload.idempotencyKey)) {
          return;
        }

        processedKeys.add(job.payload.idempotencyKey);
        ledgerWrites.push({
          receiptId: receipt.id,
          caseId: receipt.caseId,
          claimIds: receipt.claimIds,
          payloadHash: receipt.payloadHash,
          idempotencyKey: job.payload.idempotencyKey,
        });
      },
    });

    const ingest = (payload: IngestPayload) => {
      if (!payload.receipt.payloadHash || payload.receipt.claimIds.length === 0) {
        throw new Error('receipt failed validation');
      }

      queue.enqueue({
        id: `job-${payload.receipt.id}`,
        payload,
        attempts: 0,
        firstEnqueuedAt: Date.now(),
      });
    };

    expect(() => ingest({ idempotencyKey: 'invalid', receipt: invalidReceipt })).toThrow(
      'receipt failed validation',
    );
    expect(queue.size()).toBe(0);

    ingest({ idempotencyKey: 'idem-1', receipt: validReceipt });
    ingest({ idempotencyKey: 'idem-1', receipt: replayReceipt });

    worker.start();

    await jest.advanceTimersByTimeAsync(10);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(10);

    expect(ledgerWrites).toHaveLength(1);
    expect(ledgerWrites[0]).toEqual(
      expect.objectContaining({
        receiptId: validReceipt.id,
        caseId: validReceipt.caseId,
        claimIds: validReceipt.claimIds,
        payloadHash: validReceipt.payloadHash,
        idempotencyKey: 'idem-1',
      }),
    );

    expect(deadLetterQueue.size()).toBe(0);
    await expect(metrics.getLatestLag()).resolves.toBeGreaterThanOrEqual(0);

    worker.stop();
  });
});

/// <reference path="../types/supertest.d.ts" />

import request from 'supertest';

import { ProvenanceReceipt } from '@intelgraph/provenance';
import {
  InMemoryReceiptStore,
  ReceiptVerifier,
  hashReceiptPayload,
} from '../../services/receipt-signer/src/index';
import { buildApp } from '../../apps/api/src/app';

class FakeVerifier implements ReceiptVerifier {
  constructor(private readonly result: boolean, private readonly shouldThrow = false) {}

  async verify(receipt: ProvenanceReceipt): Promise<boolean> {
    if (this.shouldThrow) {
      throw new Error(`failed to verify ${receipt.id}`);
    }
    return this.result;
  }
}

function buildReceipt(id: string, payload: Record<string, unknown>): ProvenanceReceipt {
  return {
    id,
    payload,
    payloadHash: hashReceiptPayload(payload),
    issuedAt: new Date().toISOString(),
    metadata: { workflow: 'ingest' },
    signer: {
      keyId: 'alias/test',
      algorithm: 'RSASSA_PSS_SHA_256',
    },
    signature: Buffer.from('signature').toString('base64'),
  };
}

describe('GET /receipts/:id', () => {
  it('returns a verified receipt when it exists', async () => {
    const receipt: ProvenanceReceipt = buildReceipt('receipt-1', { case: 'abc' });
    const store = new InMemoryReceiptStore([receipt]);
    const app = buildApp({
      store,
      verifier: new FakeVerifier(true),
    });

    const response = await request(app).get('/receipts/receipt-1');

    expect(response.status).toBe(200);
    expect(response.body.receipt.id).toBe('receipt-1');
    expect(response.body.verified).toBe(true);
    expect(response.body.receipt.payloadHash).toBe(receipt.payloadHash);
  });

  it('returns 404 for unknown receipts', async () => {
    const store = new InMemoryReceiptStore();
    const app = buildApp({
      store,
      verifier: new FakeVerifier(true),
    });

    const response = await request(app).get('/receipts/missing');
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Receipt not found');
  });

  it('surfaces verifier errors as server failures', async () => {
    const receipt: ProvenanceReceipt = buildReceipt('receipt-2', { case: 'def' });
    const store = new InMemoryReceiptStore([receipt]);
    const app = buildApp({
      store,
      verifier: new FakeVerifier(false, true),
    });

    const response = await request(app).get('/receipts/receipt-2');
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to load receipt');
  });
});

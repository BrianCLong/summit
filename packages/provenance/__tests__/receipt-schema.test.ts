import fs from 'fs';
import path from 'path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { Receipt } from '../src/index.js';

const receiptSchema = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../../../prov-ledger/schema/receipt.v0.1.json'),
    'utf-8',
  ),
);

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);

const hex = (char: string) => char.repeat(64);

describe('receipt schema', () => {
  it('validates a complete signed receipt', () => {
    const receipt: Receipt = {
      id: 'receipt-12345678',
      version: '0.1.0',
      caseId: 'case-abc',
      claimIds: ['claim-1', 'claim-2'],
      createdAt: '2025-01-01T00:00:00.000Z',
      actor: { id: 'actor-1', role: 'analyst', tenantId: 'tenant-1', displayName: 'Analyst One' },
      pipeline: { stage: 'ingest', runId: 'run-1', taskId: 'task-1', step: 'step-1' },
      payloadHash: hex('a'),
      signature: {
        algorithm: 'ed25519',
        keyId: 'key-1',
        publicKey: Buffer.from('public-key').toString('base64'),
        value: Buffer.from('signature').toString('base64'),
        signedAt: '2025-01-01T00:00:00.000Z',
      },
      proofs: {
        receiptHash: hex('b'),
        manifestMerkleRoot: hex('c'),
        claimHashes: [hex('d')],
      },
      metadata: { region: 'us-east-1' },
      redactions: [
        {
          path: 'metadata.secret',
          reason: 'policy',
          appliedAt: '2025-01-02T00:00:00.000Z',
          appliedBy: 'system',
        },
      ],
    };

    const validate = ajv.compile<Receipt>(receiptSchema);
    expect(validate(receipt)).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it('rejects payloads with the wrong schema version', () => {
    const validate = ajv.compile<Receipt>(receiptSchema);
    const invalid: Receipt = {
      id: 'receipt-87654321',
      version: '0.0.1',
      caseId: 'case-xyz',
      claimIds: ['claim-9'],
      createdAt: '2025-01-01T00:00:00.000Z',
      actor: { id: 'actor-9', role: 'analyst' },
      payloadHash: hex('e'),
      signature: {
        algorithm: 'ed25519',
        keyId: 'key-9',
        publicKey: Buffer.from('public-key').toString('base64'),
        value: Buffer.from('signature').toString('base64'),
        signedAt: '2025-01-01T00:00:00.000Z',
      },
      proofs: {
        receiptHash: hex('f'),
      },
    };

    expect(validate(invalid)).toBe(false);
    expect(validate.errors).not.toBeNull();
  });
});

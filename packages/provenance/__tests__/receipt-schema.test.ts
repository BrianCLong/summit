import { readFileSync } from 'fs';
import path from 'path';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import { Receipt, RECEIPT_VERSION, signReceipt } from '../src/index.js';

const receiptSchemaPath = path.resolve(
  __dirname,
  '../../../..',
  'prov-ledger',
  'schema',
  'receipt.v0.1.json',
);
const receiptSchema = JSON.parse(readFileSync(receiptSchemaPath, 'utf-8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

describe('receipt schema', () => {
  const baseReceipt: Omit<Receipt, 'signature' | 'proofs' | 'payloadHash' | 'version'> = {
    id: 'receipt-0001',
    caseId: 'case-123',
    claimIds: ['claim-1'],
    createdAt: '2025-01-01T00:00:00.000Z',
    actor: {
      id: 'analyst-1',
      role: 'analyst',
    },
    pipeline: {
      runId: 'run-1',
      stage: 'ingest',
    },
    metadata: {
      environment: 'test',
    },
  };

  it('validates a complete signed receipt', () => {
    const receipt = signReceipt(baseReceipt, 'test-key');

    const validate = ajv.compile<Receipt>(receiptSchema);
    expect(validate(receipt)).toBe(true);
    expect(validate.errors).toBeNull();
    expect(receipt.version).toBe(RECEIPT_VERSION);
  });

  it('rejects payloads with the wrong schema version', () => {
    const receipt = signReceipt(baseReceipt, 'test-key');
    const invalid: Receipt = { ...receipt, version: '0.0.0' };

    const validate = ajv.compile<Receipt>(receiptSchema);
    expect(validate(invalid)).toBe(false);
    expect(validate.errors).not.toBeNull();
  });
});

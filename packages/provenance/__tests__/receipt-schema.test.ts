import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import receiptSchema from '../../../prov-ledger/schema/receipt.v0.1.json';
import {
  ProvenanceReceipt,
  RECEIPT_SCHEMA_VERSION,
  ReceiptSigningAlgorithm,
} from '../src/receipt.js';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

describe('receipt schema', () => {
  it('validates a complete signed receipt', () => {
    const receipt: ProvenanceReceipt = {
      id: 'b6a907f5-55ea-4a95-9c49-9ec1717cbe1e',
      schemaVersion: RECEIPT_SCHEMA_VERSION,
      issuer: 'kms:alias/provenance-signing',
      subject: 'artifact:ingest/1234',
      issuedAt: '2025-01-01T00:00:00.000Z',
      expiresAt: '2025-02-01T00:00:00.000Z',
      payload: {
        artifactHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        manifestUri: 'https://example.test/manifests/1234.json',
        nonce: 'abc123def456ghi7',
        metadata: {
          jobId: 'job-123',
          region: 'us-east-1',
        },
        chain: [
          {
            stepId: 'ingest',
            inputHash:
              'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            outputHash:
              'fedcbafedcbafedcbafedcbafedcbafedcbafedcbafedcbafedcbafedcba123',
            timestamp: '2025-01-01T00:00:00.000Z',
          },
        ],
      },
    signature: {
      algorithm: 'RSASSA_PSS_SHA_256' satisfies ReceiptSigningAlgorithm,
      keyId: 'arn:aws:kms:us-east-1:123456789012:key/abc123',
      value: Buffer.from('valid-signature').toString('base64'),
      messageDigest:
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    };

    const validate = ajv.compile<ProvenanceReceipt>(receiptSchema);
    expect(validate(receipt)).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it('rejects payloads with the wrong schema version', () => {
    const validate = ajv.compile<ProvenanceReceipt>(receiptSchema);
    const invalid: ProvenanceReceipt = {
      id: 'b6a907f5-55ea-4a95-9c49-9ec1717cbe1e',
      schemaVersion: '0.0' as typeof RECEIPT_SCHEMA_VERSION,
      issuer: 'kms:alias/provenance-signing',
      subject: 'artifact:ingest/1234',
      issuedAt: '2025-01-01T00:00:00.000Z',
      payload: {
        artifactHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        manifestUri: 'https://example.test/manifests/1234.json',
        nonce: 'abc123def456ghi7',
      },
      signature: {
        algorithm: 'RSASSA_PSS_SHA_256' satisfies ReceiptSigningAlgorithm,
        keyId: 'arn:aws:kms:us-east-1:123456789012:key/abc123',
        value: Buffer.from('valid-signature').toString('base64'),
        messageDigest:
          '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      },
    };

    expect(validate(invalid)).toBe(false);
    expect(validate.errors).not.toBeNull();
  });
});

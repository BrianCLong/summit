import { generateKeyPairSync } from 'crypto';
import { ExecutionReceipt, verifyReceipt } from '@intelgraph/provenance';
import { attachReceiptSigning } from '../src/pipeline';
import { KmsClient } from '../src/kmsClient';
import { ReceiptSignerService } from '../src/signerService';

const baseReceipt: ExecutionReceipt = {
  id: 'receipt-123',
  createdAt: new Date().toISOString(),
  executionId: 'exec-1',
  hashes: {
    inputs: [],
    outputs: [],
    manifest: 'manifest-hash',
  },
  signer: { keyId: 'local', algorithm: 'ed25519' },
  signature: '',
};

describe('ReceiptSignerService', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  const publicPem = publicKey.export({ format: 'pem', type: 'spki' }).toString();

  it('signs receipts via the KMS client', async () => {
    const kms = new KmsClient({ keyId: 'test-key', privateKeyPem: pem });
    const signer = new ReceiptSignerService({ kmsClient: kms });
    const signed = await signer.sign(baseReceipt);
    expect(signed.signature).toBeTruthy();
    expect(signed.signer.keyId).toBe('test-key');
    expect(verifyReceipt(signed, publicPem)).toBe(true);
  });

  it('hooks into an execution pipeline', async () => {
    const kms = new KmsClient({ keyId: 'pipe-key', privateKeyPem: pem });
    const signer = new ReceiptSignerService({ kmsClient: kms });
    const pipelineCalls: Array<(ctx: { receipt: ExecutionReceipt }) => Promise<void>> = [];
    const pipeline = {
      use: (
        _stage: 'pre-export' | 'post-execution',
        handler: (ctx: { receipt: ExecutionReceipt }) => Promise<void>,
      ) => {
        pipelineCalls.push(handler);
      },
    };

    attachReceiptSigning(pipeline, signer);
    const ctx = { receipt: { ...baseReceipt } };
    await pipelineCalls[0](ctx);
    expect(ctx.receipt.signature).toBeTruthy();
  });
});

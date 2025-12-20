import {
  SignCommand,
  VerifyCommand,
  SigningAlgorithmSpec,
} from '@aws-sdk/client-kms';

import {
  InMemoryReceiptStore,
  ReceiptSigner,
  hashReceiptPayload,
} from '../src/index';
import { ProvenanceReceipt } from '@intelgraph/provenance';

class FakeKmsClient {
  send = jest.fn();
}

describe('ReceiptSigner', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('produces stable payload hashes regardless of key order', () => {
    const left = { b: 2, a: 1 };
    const right = { a: 1, b: 2 };

    expect(hashReceiptPayload(left)).toEqual(hashReceiptPayload(right));
  });

  it('signs receipts with KMS and persists them when a store is provided', async () => {
    const kms = new FakeKmsClient();
    const store = new InMemoryReceiptStore();
    const signer = new ReceiptSigner({
      keyId: 'alias/test',
      kmsClient: kms as never,
      store,
      algorithm: SigningAlgorithmSpec.RSASSA_PSS_SHA_256,
    });

    kms.send.mockResolvedValue({
      Signature: new Uint8Array([1, 2, 3, 4]),
      KeyId: 'arn:aws:kms:region:account:key/123',
    });

    const receipt: ProvenanceReceipt = await signer.sign({
      id: 'r-123',
      payload: { subject: 'case-1', action: 'ingest' },
      metadata: { workflow: 'ingest' },
    });

    expect(receipt.signature).toBe(Buffer.from([1, 2, 3, 4]).toString('base64'));

    const signCall = kms.send.mock.calls[0][0] as SignCommand;
    expect(signCall.input.SigningAlgorithm).toBe(
      SigningAlgorithmSpec.RSASSA_PSS_SHA_256,
    );
    expect(signCall.input.MessageType).toBe('DIGEST');
    expect(await store.get('r-123')).toEqual(receipt);
  });

  it('verifies receipts by recomputing hashes and deferring to KMS verification', async () => {
    const kms = new FakeKmsClient();
    const signer = new ReceiptSigner({
      keyId: 'alias/test',
      kmsClient: kms as never,
    });

    kms.send
      .mockResolvedValueOnce({
        Signature: new Uint8Array([9, 9, 9]),
        KeyId: 'alias/test',
      })
      .mockResolvedValueOnce({ SignatureValid: true });

    const receipt: ProvenanceReceipt = await signer.sign({
      id: 'r-verified',
      payload: { task: 'sync' },
    });

    const verified = await signer.verify(receipt);

    expect(verified).toBe(true);
    const verifyCall = kms.send.mock.calls[1][0] as VerifyCommand;
    expect(verifyCall.input.Signature).toEqual(
      Buffer.from(receipt.signature, 'base64'),
    );
  });

  it('fails verification when the payload hash no longer matches', async () => {
    const kms = new FakeKmsClient();
    const signer = new ReceiptSigner({
      keyId: 'alias/test',
      kmsClient: kms as never,
    });

    kms.send.mockResolvedValue({
      Signature: new Uint8Array([1]),
      KeyId: 'alias/test',
    });

    const receipt = await signer.sign({
      id: 'r-mismatch',
      payload: { task: 'sync' },
    });

    const tampered: ProvenanceReceipt = {
      ...receipt,
      payload: { task: 'tampered' },
    };

    const verified = await signer.verify(tampered);
    expect(verified).toBe(false);
    expect(kms.send).toHaveBeenCalledTimes(1);
  });
});

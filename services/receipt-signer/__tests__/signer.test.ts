// @ts-nocheck
import {
  SignCommand,
  VerifyCommand,
  type KMSClient,
  type SignCommandInput,
  type VerifyCommandInput,
} from '@aws-sdk/client-kms';
import {
  RECEIPT_SCHEMA_VERSION,
  type UnsignedReceipt,
} from '../../../packages/provenance/src/receipt.js';

import { ReceiptSigner, canonicaliseReceipt } from '../src/signer.js';

class MockKmsClient {
  public lastSign?: SignCommandInput;
  public lastVerify?: VerifyCommandInput;
  private signature: Uint8Array;
  private verifyResult: boolean;

  constructor(options?: { signature?: Uint8Array; verifyResult?: boolean }) {
    this.signature =
      options?.signature ??
      new Uint8Array(Buffer.from('fake-signature', 'utf8'));
    this.verifyResult = options?.verifyResult ?? true;
  }

  async send(command: SignCommand | VerifyCommand) {
    if (command instanceof SignCommand) {
      this.lastSign = command.input;
      return {
        Signature: this.signature,
        SigningAlgorithm: command.input.SigningAlgorithm,
      };
    }
    if (command instanceof VerifyCommand) {
      this.lastVerify = command.input;
      return {
        SignatureValid: this.verifyResult,
      };
    }
    throw new Error('Unsupported command');
  }

  destroy(): void {
    /* noop */
  }
}

const unsignedReceipt: UnsignedReceipt = {
  id: 'a1039d40-02e9-4b8c-b9a6-5a49753f10c4',
  schemaVersion: RECEIPT_SCHEMA_VERSION,
  issuer: 'kms:alias/provenance-signing',
  subject: 'artifact:example',
  issuedAt: '2025-01-01T00:00:00.000Z',
  payload: {
    artifactHash:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    manifestUri: 'https://example.test/manifest.json',
    nonce: 'nonce-1234567890',
  },
};

describe('ReceiptSigner', () => {
  it('signs a receipt and returns the KMS signature', async () => {
    const mockKms = new MockKmsClient();
    const signer = new ReceiptSigner({
      kmsKeyId: 'alias/provenance-key',
      client: mockKms as unknown as KMSClient,
    });

    const signed = await signer.sign(unsignedReceipt);

    expect(signed.signature.value).toBe(
      Buffer.from('fake-signature').toString('base64'),
    );
    expect(signed.signature.messageDigest).toHaveLength(64);
    expect(mockKms.lastSign?.KeyId).toBe('alias/provenance-key');
    expect(mockKms.lastSign?.MessageType).toBe('DIGEST');
  });

  it('verifies a receipt using KMS verify', async () => {
    const mockKms = new MockKmsClient({ verifyResult: true });
    const signer = new ReceiptSigner({
      kmsKeyId: 'alias/provenance-key',
      client: mockKms as unknown as KMSClient,
    });

    const signed = await signer.sign(unsignedReceipt);
    const isValid = await signer.verify(signed);

    expect(isValid).toBe(true);
    expect(mockKms.lastVerify?.SigningAlgorithm).toBe(
      signed.signature.algorithm,
    );
  });

  it('produces deterministic digests for canonical payloads', () => {
    const canonicalA = canonicaliseReceipt(unsignedReceipt);
    const canonicalB = canonicaliseReceipt({
      ...unsignedReceipt,
      payload: {
        ...unsignedReceipt.payload,
        metadata: { region: 'us-east-1' },
      },
    });

    expect(canonicalA.equals(canonicalB)).toBe(false);
    expect(JSON.parse(canonicalA.toString()).id).toBe(unsignedReceipt.id);
  });
});

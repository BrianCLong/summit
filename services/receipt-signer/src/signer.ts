import { generateKeyPairSync, sign, verify } from 'crypto';

export interface SignRequest {
  payload: string;
  keyId?: string;
}

export interface SignedPayload {
  algorithm: 'ed25519';
  keyId: string;
  publicKey: string;
  value: string;
  signedAt: string;
}

export class ReceiptSigner {
  private readonly keyId: string;

  private readonly privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'];

  private readonly publicKey: string;

  constructor(keyId = 'kms-default') {
    this.keyId = keyId;
    const pair = generateKeyPairSync('ed25519');
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64');
  }

  signPayload(payload: string, requestedKeyId?: string): SignedPayload {
    const signedAt = new Date().toISOString();
    const buffer =
      /^[a-f0-9]{64}$/i.test(payload) && payload.length === 64
        ? Buffer.from(payload, 'hex')
        : Buffer.from(payload);

    const value = sign(null, buffer, this.privateKey).toString('base64');

    return {
      algorithm: 'ed25519',
      keyId: requestedKeyId ?? this.keyId,
      publicKey: this.publicKey,
      value,
      signedAt,
    };
  }

  verify(payload: string, signed: SignedPayload): boolean {
    const buffer =
      /^[a-f0-9]{64}$/i.test(payload) && payload.length === 64
        ? Buffer.from(payload, 'hex')
        : Buffer.from(payload);

    return verify(
      null,
      buffer,
      {
        key: Buffer.from(signed.publicKey, 'base64'),
        format: 'der',
        type: 'spki',
      },
      Buffer.from(signed.value, 'base64'),
    );
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}

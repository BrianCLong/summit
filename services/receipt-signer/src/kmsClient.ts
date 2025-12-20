import { createPrivateKey, sign } from 'crypto';

export interface KmsClientOptions {
  keyId: string;
  privateKeyPem: string;
}

export interface SignRequest {
  payload: Buffer;
  algorithm?: 'ed25519';
}

export interface SignResponse {
  signature: Buffer;
  keyId: string;
}

export class KmsClient {
  constructor(private readonly options: KmsClientOptions) {}

  async sign(request: SignRequest): Promise<SignResponse> {
    const key = createPrivateKey(this.options.privateKeyPem);
    const signature = sign(null, request.payload, key);
    return { signature, keyId: this.options.keyId };
  }
}

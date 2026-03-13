import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface SignedArtifact {
  hash: string;
  signature: string;
  timestamp: string;
  version: '1';
}

export type ArtifactPayload = Buffer | string | { hash: string };

export class ArtifactContract {
  public readonly contentHash: string;

  constructor(payload: ArtifactPayload, private signingKey: string) {
    if (typeof payload === 'object' && 'hash' in payload && !(payload instanceof Buffer)) {
      this.contentHash = payload.hash;
    } else {
      this.contentHash = createHash('sha256').update(payload as Buffer | string).digest('hex');
    }
  }

  sign(): SignedArtifact {
    const hmac = createHmac('sha256', this.signingKey);
    hmac.update(this.contentHash);
    const signature = hmac.digest('hex');

    return {
      hash: this.contentHash,
      signature,
      timestamp: new Date().toISOString(),
      version: '1',
    };
  }

  verify(signed: SignedArtifact): boolean {
    if (signed.version !== '1') return false;
    if (signed.hash !== this.contentHash) return false;

    const hmac = createHmac('sha256', this.signingKey);
    hmac.update(this.contentHash);
    const expectedSignature = hmac.digest('hex');

    const sigBuf = Buffer.from(signed.signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');

    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }

    return timingSafeEqual(sigBuf, expectedBuf);
  }

  serialize(): string {
    return JSON.stringify(this.sign());
  }

  toJSON(): string {
    return this.serialize();
  }

  static fromJSON(json: string, signingKey: string): ArtifactContract {
    const signed = JSON.parse(json) as SignedArtifact;
    const instance = new ArtifactContract({ hash: signed.hash }, signingKey);

    if (!instance.verify(signed)) {
      throw new Error('Invalid artifact signature');
    }

    return instance;
  }
}

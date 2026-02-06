import type { Playbook, PlaybookSignature } from './types.js';
import { createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from 'crypto';

const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export class PlaybookSigner {
  static createPayload(playbook: Playbook) {
    const { signature, ...unsigned } = playbook;
    return unsigned;
  }

  static sign(playbook: Playbook, privateKeyPem: string): PlaybookSignature {
    if (!playbook.version || !SEMVER_REGEX.test(playbook.version)) {
      throw new Error('Playbook version must be valid semver');
    }

    const payload = Buffer.from(JSON.stringify(this.createPayload(playbook)));
    const privateKey = createPrivateKey(privateKeyPem);
    const publicKey = createPublicKey(privateKey);
    const signatureBuffer: Buffer = cryptoSign(null, payload, privateKey);
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

    return {
      algorithm: 'ed25519',
      signature: Buffer.from(signatureBuffer).toString('base64'),
      publicKey: Buffer.from(publicKeyPem).toString('base64'),
      signedAt: new Date().toISOString(),
    };
  }

  static verify(playbook: Playbook, signature: PlaybookSignature): boolean {
    const payload = Buffer.from(JSON.stringify(this.createPayload(playbook)));
    const publicKeyPem = Buffer.from(signature.publicKey, 'base64').toString('utf-8');
    return cryptoVerify(
      null,
      payload,
      createPublicKey(publicKeyPem),
      Buffer.from(signature.signature, 'base64'),
    );
  }
}

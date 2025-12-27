import type { Playbook, PlaybookSignature } from '../types.js';
import { createPrivateKey, createPublicKey, sign, verify } from 'crypto';

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
    const signature = sign(null, payload, privateKey);

    return {
      algorithm: 'ed25519',
      signature: signature.toString('base64'),
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString('base64'),
      signedAt: new Date().toISOString(),
    };
  }

  static verify(playbook: Playbook, signature: PlaybookSignature): boolean {
    const payload = Buffer.from(JSON.stringify(this.createPayload(playbook)));
    const publicKeyPem = Buffer.from(signature.publicKey, 'base64').toString('utf-8');
    return verify(
      null,
      payload,
      createPublicKey(publicKeyPem),
      Buffer.from(signature.signature, 'base64'),
    );
  }
}

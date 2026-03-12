import * as crypto from 'node:crypto';
import { ResultBundlePayload, SignedResultBundle } from './sign-result';

export function verifyResultBundle(signedBundle: SignedResultBundle, publicKeyHex: string): boolean {
  const { signature, ...payload } = signedBundle;

  const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyHex, 'hex'),
    format: 'der',
    type: 'spki'
  });

  // Reconstruct identical JSON string by using a custom stringify approach if necessary.
  // Standard stringify might be flaky across language boundaries, but works within Node
  // for the exact same object provided the key order isn't mutated in a way not matching
  // the signer. We assume the signer generated JSON exactly from the structured payload.
  const dataToVerify = Buffer.from(JSON.stringify(payload));
  return crypto.verify(null, dataToVerify, publicKey, Buffer.from(signature, 'hex'));
}

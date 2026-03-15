import * as crypto from 'node:crypto';
import type { SignedResultBundle } from './sign-result.ts';
import { deterministicStringify } from './utils.ts';

/**
 * Verifies the ed25519 signature of a benchmark result bundle.
 *
 * @param bundle - The signed bundle to verify
 * @param publicKeyHex - The hex-encoded ed25519 public key
 * @returns boolean indicating if the signature is valid
 */
export function verifyResultBundle(bundle: SignedResultBundle, publicKeyHex: string): boolean {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyHex, 'hex'),
      format: 'der',
      type: 'spki'
    });

    const { signature, ...payload } = bundle;
    const dataToVerify = Buffer.from(deterministicStringify(payload));

    return crypto.verify(null, dataToVerify, publicKey, Buffer.from(signature, 'hex'));
  } catch (error) {
    return false;
  }
}

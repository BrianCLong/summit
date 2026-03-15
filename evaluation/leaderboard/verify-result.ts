import * as crypto from 'node:crypto';
import stringify from 'fast-json-stable-stringify';
import type { ResultBundlePayload, SignedResultBundle } from './sign-result';

/**
 * Verifies a benchmark result bundle using an ed25519 public key.
 *
 * @param bundle - The signed bundle to verify
 * @param publicKeyHex - The hex-encoded ed25519 public key
 * @returns true if the signature is valid, false otherwise
 */
export function verifyResultBundle(bundle: SignedResultBundle, publicKeyHex: string): boolean {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyHex, 'hex'),
      format: 'der',
      type: 'spki'
    });

    const { signature, ...payload } = bundle;
    const dataToVerify = Buffer.from(stringify(payload as ResultBundlePayload));

    return crypto.verify(
      null,
      dataToVerify,
      publicKey,
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    // If key format is invalid, verification fails
    return false;
  }
}

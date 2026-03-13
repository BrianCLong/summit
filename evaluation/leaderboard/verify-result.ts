import * as crypto from 'node:crypto';
import { SignedResultBundle } from './sign-result';

/**
 * Verifies the ed25519 signature of a signed benchmark result bundle.
 *
 * @param bundle - The signed bundle to verify
 * @param publicKeyHex - The hex-encoded ed25519 public key
 * @returns boolean indicating if the signature is valid
 */
export function verifyResultBundle(bundle: SignedResultBundle, publicKeyHex: string): boolean {
  const { signature, ...payload } = bundle;

  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyHex, 'hex'),
      format: 'der',
      type: 'spki'
    });

    const dataToVerify = Buffer.from(JSON.stringify(payload));
    const signatureBuffer = Buffer.from(signature, 'hex');

    return crypto.verify(null, dataToVerify, publicKey, signatureBuffer);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

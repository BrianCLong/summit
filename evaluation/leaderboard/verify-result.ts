import * as crypto from 'node:crypto';
import { SignedResultBundle, ResultBundlePayload } from './sign-result';

/**
 * Verifies a benchmark result bundle using an ed25519 public key.
 *
 * @param bundle - The signed bundle to verify
 * @param publicKeyHex - The hex-encoded ed25519 public key
 * @returns True if the signature is valid, false otherwise
 */
export function verifyResultBundle(bundle: SignedResultBundle, publicKeyHex: string): boolean {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyHex, 'hex'),
      format: 'der',
      type: 'spki'
    });

    const payload: ResultBundlePayload = {
      protocolVersion: bundle.protocolVersion,
      benchmarkVersion: bundle.benchmarkVersion,
      report: bundle.report,
      metrics: bundle.metrics,
      stamp: bundle.stamp
    };

    const dataToVerify = Buffer.from(JSON.stringify(payload));
    const signatureBuffer = Buffer.from(bundle.signature, 'hex');

    return crypto.verify(null, dataToVerify, publicKey, signatureBuffer);
  } catch (error) {
    return false;
  }
}

import crypto from 'crypto';
import type { PluginManifest } from '../types/plugin.js';

export type SignatureVerificationStatus = 'verified' | 'unverified' | 'invalid';

export interface SignatureVerificationInput {
  manifest: PluginManifest;
  signature?: string;
  publicKey?: string;
  algorithm?: string;
}

export interface SignatureVerificationResult {
  status: SignatureVerificationStatus;
  reason?: string;
}

/**
 * Verifies a plugin manifest signature using RSA-SHA256.
 *
 * The signed payload is the canonical JSON serialization of the manifest
 * (excluding the `signature` field itself). The signature must be base64-encoded.
 *
 * Returns:
 *   - 'verified'   – signature is cryptographically valid
 *   - 'unverified' – no signature or public key provided; cannot assess
 *   - 'invalid'    – signature present but verification failed
 */
export function verifySignature(
  input: SignatureVerificationInput
): Promise<SignatureVerificationResult> {
  const { manifest, signature, publicKey, algorithm } = input;

  if (!signature || !publicKey) {
    return Promise.resolve({
      status: 'unverified',
      reason: 'No signature or public key provided',
    });
  }

  // Only RSA-SHA256 is supported in-process; cosign requires external tooling
  if (algorithm && algorithm !== 'rsa-sha256' && algorithm !== 'RSA-SHA256') {
    return Promise.resolve({
      status: 'unverified',
      reason: `Algorithm '${algorithm}' is not supported for in-process verification`,
    });
  }

  try {
    // Canonical payload: manifest without the signature block
    const { signature: _sig, ...manifestBody } = manifest;
    const payload = JSON.stringify(manifestBody);

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(payload, 'utf8');
    verify.end();

    const valid = verify.verify(publicKey, signature, 'base64');

    if (valid) {
      return Promise.resolve({ status: 'verified' });
    }

    return Promise.resolve({
      status: 'invalid',
      reason: 'Signature does not match manifest payload',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Promise.resolve({
      status: 'invalid',
      reason: `Signature verification error: ${message}`,
    });
  }
}

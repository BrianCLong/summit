import { Buffer } from 'node:buffer';
import { SignerType } from './sign.js';

export interface VerifyOptions {
  signerType?: SignerType;
  /**
   * For ed25519, this is the public key (PEM string or KeyObject).
   */
  publicKey?: string;
}

/**
 * Verifies a manifest signature.
 *
 * @param manifest The manifest object that was supposedly signed.
 * @param signature The signature string returned by signManifest.
 * @param options Verification options.
 * @returns boolean indicating if signature is valid.
 */
export async function verifyManifest(manifest: Record<string, any>, signature: string, options: VerifyOptions = {}): Promise<boolean> {
  const { signerType = 'none', publicKey } = options;
  const payload = JSON.stringify(manifest);

  if (signerType === 'none') {
    // Re-create the expected signature
    const expected = `none:${Buffer.from(payload).toString('base64')}`;
    return signature === expected;
  }

  if (signerType === 'ed25519') {
      if (!signature.startsWith('ed25519:')) {
          return false;
      }

      if (!publicKey) {
          throw new Error('Public key is required for ed25519 verification');
      }

      const rawSignature = Buffer.from(signature.replace('ed25519:', ''), 'base64');

      try {
          const { createPublicKey, verify } = await import('node:crypto');
          const key = createPublicKey(publicKey);

          const isVerified = verify(null, Buffer.from(payload), key, rawSignature);
          return isVerified;
      } catch (err: any) {
          console.warn('Verification error:', err);
          return false;
      }
  }

  throw new Error(`Unsupported signer type: ${signerType}`);
}

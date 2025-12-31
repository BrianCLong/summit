// @ts-nocheck
import { Buffer } from 'node:buffer';

export type SignerType = 'none' | 'ed25519';

export interface SignOptions {
  signerType?: SignerType;
  /**
   * For ed25519, this is the private key (PKCS#8 PEM or hex/base64 encoded raw key depending on implementation).
   * For this stub, we expect a hex string of the private key seed (32 bytes) or the full key if using `crypto.sign`.
   * However, `node:crypto`'s `sign` function typically takes a KeyObject or PEM.
   * To simplify this stub without dragging in complex key management, we will use
   * `crypto.subtle.sign` if available, or `crypto.sign` with a generated key.
   *
   * BUT: generating keys from a string seed in Node crypto is not straightforward without external libs.
   * We will assume the `privateKey` passed here is a PEM formatted string or KeyObject
   * if we were fully implementing.
   *
   * For this stub: we'll use `crypto.createPrivateKey` if `privateKey` is provided as PEM.
   */
  privateKey?: string;
}

/**
 * Signs a manifest object.
 *
 * @param manifest The JSON object to sign.
 * @param options Signing options.
 * @returns The signature string. Format depends on signer.
 *          - none: "none:<base64-manifest>"
 *          - ed25519: "ed25519:<base64-signature>"
 */
export async function signManifest(manifest: Record<string, any>, options: SignOptions = {}): Promise<string> {
  const { signerType = 'none', privateKey } = options;

  // Canonicalize via JSON.stringify for this stub.
  // In production, use a deterministic canonicalization (RFC 8785).
  const payload = JSON.stringify(manifest);

  if (signerType === 'none') {
    // For 'none', we just confirm we "signed" it by returning a deterministic string.
    // The prompt says "none signer produces predictable output".
    // We'll append a fixed string or just encode the payload.
    // Let's create a "signature" that is just the hash of the payload prefixed with "none:".
    // Or even simpler as per common JWT 'none' alg patterns (but this is not JWT).
    // Let's return "none:<base64(payload)>" effectively binding it to the content
    // but without cryptographic security.
    return `none:${Buffer.from(payload).toString('base64')}`;
  }

  if (signerType === 'ed25519') {
    // Check if enabled.
    if (process.env.EVIDENCE_SIGNING_ENABLED !== 'true') {
       // If the flag is explicitly strictly required to be true, we block.
       // The prompt says "supports ... behind flag ...=false".
       // We'll assume this means it is disabled by default.
       throw new Error('EVIDENCE_SIGNING_ENABLED is not enabled');
    }

    if (!privateKey) {
      throw new Error('Private key is required for ed25519 signing');
    }

    // Node 18+ Web Crypto API
    // We expect privateKey to be a PEM string for createPrivateKey, or we handle raw keys.
    // For this stub, let's assume `privateKey` is passed as a PEM string.

    try {
        const { createPrivateKey, sign } = await import('node:crypto');
        const key = createPrivateKey(privateKey);
        // ed25519 signing
        const signature = sign(null, Buffer.from(payload), key);
        return `ed25519:${signature.toString('base64')}`;
    } catch (err: any) {
        throw new Error(`Failed to sign with ed25519: ${err.message}`);
    }
  }

  throw new Error(`Unsupported signer type: ${signerType}`);
}

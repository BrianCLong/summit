import * as crypto from 'crypto';
import type { ExportManifest, SignedExportPack } from './types';
import { hashDeterministic } from './proofs';

/**
 * Handles signing and verification of export packages using RSA-SHA256.
 */
export class ExportPackSigner {
  /**
   * Initializes the signer with key pair.
   * @param privateKeyPem - The private key in PEM format for signing.
   * @param publicKeyPem - The public key in PEM format for verification.
   */
  constructor(
    private readonly privateKeyPem: string,
    private readonly publicKeyPem: string,
  ) {}

  /**
   * Signs the export payload and creates a SignedExportPack.
   * @param payload - The stringified payload to sign.
   * @param manifest - The manifest associated with the export.
   * @returns The signed export pack containing signature and digest.
   */
  sign(payload: string, manifest: ExportManifest): SignedExportPack {
    const digest = crypto.createHash('sha256').update(payload).digest('hex');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(payload);
    signer.end();
    const signature = signer.sign(this.privateKeyPem, 'base64');
    return {
      manifest,
      payload,
      signature,
      digest,
    };
  }

  /**
   * Verifies the signature of a payload using the public key.
   * @param payload - The payload string.
   * @param signature - The signature string (base64).
   * @returns True if the signature is valid.
   */
  verify(payload: string, signature: string): boolean {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(payload);
    verifier.end();
    return verifier.verify(this.publicKeyPem, signature, 'base64');
  }

  /**
   * Computes a deterministic digest of the manifest.
   * @param manifest - The export manifest.
   * @returns The hex string digest.
   */
  manifestDigest(manifest: ExportManifest): string {
    return hashDeterministic(manifest);
  }
}

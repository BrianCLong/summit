import crypto from 'node:crypto';
import { BundleSignature, SyncBundle, computeChecksum } from '../types/index.js';

export interface SignerConfig {
  privateKeyPath?: string;
  publicKeyPath?: string;
  privateKey?: string;
  publicKey?: string;
  algorithm?: string;
  keyId?: string;
}

export class BundleSigner {
  private privateKey: crypto.KeyObject | null = null;
  private publicKey: crypto.KeyObject | null = null;
  private algorithm: string;
  private keyId: string;

  constructor(config: SignerConfig) {
    this.algorithm = config.algorithm || 'RSA-SHA256';
    this.keyId = config.keyId || 'default';

    if (config.privateKey) {
      this.privateKey = crypto.createPrivateKey({
        key: config.privateKey,
        format: 'pem',
      });
    }

    if (config.publicKey) {
      this.publicKey = crypto.createPublicKey({
        key: config.publicKey,
        format: 'pem',
      });
    }
  }

  /**
   * Sign a sync bundle
   */
  async signBundle(
    bundle: Omit<SyncBundle, 'signatures'>,
    signedBy: string,
  ): Promise<BundleSignature> {
    if (!this.privateKey) {
      throw new Error('Private key not configured for signing');
    }

    const dataToSign = JSON.stringify(
      {
        manifest: bundle.manifest,
        content: bundle.content,
        checksums: bundle.checksums,
      },
      Object.keys(bundle).sort(),
    );

    const sign = crypto.createSign('SHA256');
    sign.update(dataToSign);
    sign.end();

    const signature = sign.sign(this.privateKey, 'base64');

    const publicKeyPem = this.publicKey
      ? this.publicKey.export({ format: 'pem', type: 'spki' }).toString()
      : '';

    return {
      signature,
      algorithm: this.algorithm,
      publicKey: publicKeyPem,
      signedBy,
      signedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify bundle signatures
   */
  async verifyBundleSignatures(bundle: SyncBundle): Promise<{
    valid: boolean;
    validSignatures: number;
    invalidSignatures: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let validSignatures = 0;
    let invalidSignatures = 0;

    if (!bundle.signatures || bundle.signatures.length === 0) {
      errors.push('No signatures present in bundle');
      return {
        valid: false,
        validSignatures: 0,
        invalidSignatures: 0,
        errors,
      };
    }

    const dataToVerify = JSON.stringify(
      {
        manifest: bundle.manifest,
        content: bundle.content,
        checksums: bundle.checksums,
      },
      Object.keys(bundle).sort(),
    );

    for (const sig of bundle.signatures) {
      try {
        const publicKey = crypto.createPublicKey({
          key: sig.publicKey,
          format: 'pem',
        });

        const verify = crypto.createVerify('SHA256');
        verify.update(dataToVerify);
        verify.end();

        const isValid = verify.verify(publicKey, sig.signature, 'base64');

        if (isValid) {
          validSignatures++;
        } else {
          invalidSignatures++;
          errors.push(
            `Invalid signature from ${sig.signedBy} at ${sig.signedAt}`,
          );
        }
      } catch (error: any) {
        invalidSignatures++;
        errors.push(
          `Signature verification failed for ${sig.signedBy}: ${error.message}`,
        );
      }
    }

    return {
      valid: validSignatures > 0 && invalidSignatures === 0,
      validSignatures,
      invalidSignatures,
      errors,
    };
  }

  /**
   * Verify bundle checksums
   */
  async verifyBundleChecksums(bundle: SyncBundle): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Verify manifest checksum
      const manifestChecksum = computeChecksum(
        bundle.manifest,
        bundle.checksums.algorithm,
      );
      if (manifestChecksum !== bundle.checksums.manifest) {
        errors.push(
          `Manifest checksum mismatch: expected ${bundle.checksums.manifest}, got ${manifestChecksum}`,
        );
      }

      // Verify content checksum
      const contentChecksum = computeChecksum(
        bundle.content,
        bundle.checksums.algorithm,
      );
      if (contentChecksum !== bundle.checksums.content) {
        errors.push(
          `Content checksum mismatch: expected ${bundle.checksums.content}, got ${contentChecksum}`,
        );
      }

      // Verify overall checksum
      const overallChecksum = computeChecksum(
        {
          manifest: bundle.manifest,
          content: bundle.content,
        },
        bundle.checksums.algorithm,
      );
      if (overallChecksum !== bundle.checksums.overall) {
        errors.push(
          `Overall checksum mismatch: expected ${bundle.checksums.overall}, got ${overallChecksum}`,
        );
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error: any) {
      errors.push(`Checksum verification failed: ${error.message}`);
      return {
        valid: false,
        errors,
      };
    }
  }

  /**
   * Verify bundle is not expired
   */
  async verifyBundleNotExpired(bundle: SyncBundle): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (bundle.manifest.expiresAt) {
      const expiresAt = new Date(bundle.manifest.expiresAt);
      const now = new Date();

      if (now > expiresAt) {
        errors.push(
          `Bundle expired at ${bundle.manifest.expiresAt} (current time: ${now.toISOString()})`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Comprehensive bundle verification
   */
  async verifyBundle(bundle: SyncBundle): Promise<{
    valid: boolean;
    checksumValid: boolean;
    signaturesValid: boolean;
    notExpired: boolean;
    validSignatureCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Verify checksums
    const checksumResult = await this.verifyBundleChecksums(bundle);
    if (!checksumResult.valid) {
      errors.push(...checksumResult.errors);
    }

    // Verify signatures
    const signatureResult = await this.verifyBundleSignatures(bundle);
    if (!signatureResult.valid) {
      errors.push(...signatureResult.errors);
    }

    // Verify expiration
    const expirationResult = await this.verifyBundleNotExpired(bundle);
    if (!expirationResult.valid) {
      errors.push(...expirationResult.errors);
    }

    const valid =
      checksumResult.valid &&
      signatureResult.valid &&
      expirationResult.valid;

    return {
      valid,
      checksumValid: checksumResult.valid,
      signaturesValid: signatureResult.valid,
      notExpired: expirationResult.valid,
      validSignatureCount: signatureResult.validSignatures,
      errors,
    };
  }

  /**
   * Generate key pair for testing/development
   */
  static generateKeyPair(): {
    privateKey: string;
    publicKey: string;
  } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return {
      privateKey,
      publicKey,
    };
  }
}

/**
 * STIX Bundle Signing Service
 *
 * Provides cryptographic signing and verification for STIX bundles
 * to enable secure sharing in air-gapped environments.
 *
 * Supports:
 * - HMAC-SHA256 for symmetric key signing
 * - Ed25519 for asymmetric key signing (future)
 * - Detached signatures for large bundles
 * - Signature chaining for provenance
 */

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { StixBundle, BundleExportResult } from './types.js';
import logger from '../../config/logger.js';

const signingLogger = logger.child({ module: 'stix-signing' });

// ============================================================================
// Types
// ============================================================================

export type SignatureAlgorithm = 'HMAC-SHA256' | 'HMAC-SHA384' | 'HMAC-SHA512' | 'Ed25519';

export interface SignatureMetadata {
  algorithm: SignatureAlgorithm;
  keyId: string;
  timestamp: string;
  bundleId: string;
  bundleChecksum: string;
  producerIdentity?: string;
  chainPrevious?: string;
}

export interface DetachedSignature {
  signature: string;
  metadata: SignatureMetadata;
  encodedMetadata: string;
}

export interface SignedBundle {
  bundle: StixBundle;
  signature: DetachedSignature;
}

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  metadata?: SignatureMetadata;
  verifiedAt: string;
}

export interface AirGapPackage {
  version: '1.0';
  format: 'stix-bundle-signed';
  created: string;
  bundles: SignedBundle[];
  manifest: {
    totalBundles: number;
    totalObjects: number;
    checksums: string[];
  };
}

// ============================================================================
// Signing Service
// ============================================================================

export class StixSigningService {
  private readonly signingKey: string;
  private readonly keyId: string;
  private readonly algorithm: SignatureAlgorithm;

  constructor(options: {
    signingKey: string;
    keyId?: string;
    algorithm?: SignatureAlgorithm;
  }) {
    this.signingKey = options.signingKey;
    this.keyId = options.keyId || this.deriveKeyId(options.signingKey);
    this.algorithm = options.algorithm || 'HMAC-SHA256';
  }

  /**
   * Derive a key ID from the signing key (first 8 bytes of SHA-256 hash)
   */
  private deriveKeyId(key: string): string {
    return createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  /**
   * Sign a STIX bundle and return a detached signature
   */
  signBundle(
    bundle: StixBundle,
    options: {
      producerIdentity?: string;
      chainPrevious?: string;
    } = {},
  ): DetachedSignature {
    const timestamp = new Date().toISOString();
    const bundleChecksum = this.calculateChecksum(bundle);

    const metadata: SignatureMetadata = {
      algorithm: this.algorithm,
      keyId: this.keyId,
      timestamp,
      bundleId: bundle.id,
      bundleChecksum,
      producerIdentity: options.producerIdentity,
      chainPrevious: options.chainPrevious,
    };

    // Encode metadata
    const encodedMetadata = Buffer.from(JSON.stringify(metadata)).toString('base64url');

    // Create signing input: metadata + bundle content
    const signingInput = this.createSigningInput(encodedMetadata, bundle);

    // Generate signature
    const signature = this.sign(signingInput);

    signingLogger.info({
      bundleId: bundle.id,
      keyId: this.keyId,
      algorithm: this.algorithm,
      objectCount: bundle.objects.length,
    }, 'Bundle signed successfully');

    return {
      signature,
      metadata,
      encodedMetadata,
    };
  }

  /**
   * Verify a detached signature against a bundle
   */
  verifySignature(
    bundle: StixBundle,
    signature: DetachedSignature,
  ): VerificationResult {
    const errors: string[] = [];
    const verifiedAt = new Date().toISOString();

    try {
      // Verify key ID matches
      if (signature.metadata.keyId !== this.keyId) {
        errors.push(`Key ID mismatch: expected ${this.keyId}, got ${signature.metadata.keyId}`);
      }

      // Verify algorithm matches
      if (signature.metadata.algorithm !== this.algorithm) {
        errors.push(`Algorithm mismatch: expected ${this.algorithm}, got ${signature.metadata.algorithm}`);
      }

      // Verify bundle ID
      if (signature.metadata.bundleId !== bundle.id) {
        errors.push(`Bundle ID mismatch: expected ${bundle.id}, got ${signature.metadata.bundleId}`);
      }

      // Verify checksum
      const calculatedChecksum = this.calculateChecksum(bundle);
      if (signature.metadata.bundleChecksum !== calculatedChecksum) {
        errors.push('Bundle checksum mismatch - bundle may have been modified');
      }

      // Recreate signing input and verify signature
      const signingInput = this.createSigningInput(signature.encodedMetadata, bundle);
      const expectedSignature = this.sign(signingInput);

      if (!this.constantTimeCompare(signature.signature, expectedSignature)) {
        errors.push('Signature verification failed');
      }

      const valid = errors.length === 0;

      signingLogger.info({
        bundleId: bundle.id,
        valid,
        errorCount: errors.length,
      }, 'Signature verification completed');

      return {
        valid,
        errors,
        metadata: valid ? signature.metadata : undefined,
        verifiedAt,
      };
    } catch (error) {
      errors.push(`Verification error: ${(error as Error).message}`);
      return {
        valid: false,
        errors,
        verifiedAt,
      };
    }
  }

  /**
   * Create a signed bundle
   */
  createSignedBundle(
    bundle: StixBundle,
    options: {
      producerIdentity?: string;
      chainPrevious?: string;
    } = {},
  ): SignedBundle {
    const signature = this.signBundle(bundle, options);
    return { bundle, signature };
  }

  /**
   * Verify a signed bundle
   */
  verifySignedBundle(signedBundle: SignedBundle): VerificationResult {
    return this.verifySignature(signedBundle.bundle, signedBundle.signature);
  }

  /**
   * Create an air-gap package containing multiple signed bundles
   */
  createAirGapPackage(bundles: StixBundle[]): AirGapPackage {
    const signedBundles: SignedBundle[] = [];
    const checksums: string[] = [];
    let totalObjects = 0;
    let previousSignature: string | undefined;

    for (const bundle of bundles) {
      const signedBundle = this.createSignedBundle(bundle, {
        chainPrevious: previousSignature,
      });
      signedBundles.push(signedBundle);
      checksums.push(signedBundle.signature.metadata.bundleChecksum);
      totalObjects += bundle.objects.length;
      previousSignature = signedBundle.signature.signature;
    }

    return {
      version: '1.0',
      format: 'stix-bundle-signed',
      created: new Date().toISOString(),
      bundles: signedBundles,
      manifest: {
        totalBundles: bundles.length,
        totalObjects,
        checksums,
      },
    };
  }

  /**
   * Verify an air-gap package
   */
  verifyAirGapPackage(pkg: AirGapPackage): {
    valid: boolean;
    bundleResults: VerificationResult[];
    manifestValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const bundleResults: VerificationResult[] = [];
    let previousSignature: string | undefined;
    let manifestValid = true;

    // Verify manifest counts
    if (pkg.manifest.totalBundles !== pkg.bundles.length) {
      errors.push(`Bundle count mismatch: manifest says ${pkg.manifest.totalBundles}, actual is ${pkg.bundles.length}`);
      manifestValid = false;
    }

    let actualTotalObjects = 0;
    const actualChecksums: string[] = [];

    for (let i = 0; i < pkg.bundles.length; i++) {
      const signedBundle = pkg.bundles[i];

      // Verify signature chain
      if (signedBundle.signature.metadata.chainPrevious !== previousSignature) {
        errors.push(`Bundle ${i}: signature chain broken`);
      }

      // Verify individual bundle
      const result = this.verifySignedBundle(signedBundle);
      bundleResults.push(result);

      if (!result.valid) {
        errors.push(`Bundle ${i}: ${result.errors.join(', ')}`);
      }

      actualTotalObjects += signedBundle.bundle.objects.length;
      actualChecksums.push(signedBundle.signature.metadata.bundleChecksum);
      previousSignature = signedBundle.signature.signature;
    }

    // Verify total objects
    if (pkg.manifest.totalObjects !== actualTotalObjects) {
      errors.push(`Object count mismatch: manifest says ${pkg.manifest.totalObjects}, actual is ${actualTotalObjects}`);
      manifestValid = false;
    }

    // Verify checksums
    if (JSON.stringify(pkg.manifest.checksums) !== JSON.stringify(actualChecksums)) {
      errors.push('Checksums in manifest do not match bundle checksums');
      manifestValid = false;
    }

    const valid = errors.length === 0 && bundleResults.every(r => r.valid);

    return {
      valid,
      bundleResults,
      manifestValid,
      errors,
    };
  }

  /**
   * Calculate SHA-256 checksum of a bundle
   */
  private calculateChecksum(bundle: StixBundle): string {
    const content = JSON.stringify(bundle, Object.keys(bundle).sort());
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create the signing input from metadata and bundle
   */
  private createSigningInput(encodedMetadata: string, bundle: StixBundle): string {
    const bundleContent = JSON.stringify(bundle, Object.keys(bundle).sort());
    return `${encodedMetadata}.${bundleContent}`;
  }

  /**
   * Sign content using configured algorithm
   */
  private sign(content: string): string {
    switch (this.algorithm) {
      case 'HMAC-SHA256':
        return createHmac('sha256', this.signingKey).update(content).digest('base64url');
      case 'HMAC-SHA384':
        return createHmac('sha384', this.signingKey).update(content).digest('base64url');
      case 'HMAC-SHA512':
        return createHmac('sha512', this.signingKey).update(content).digest('base64url');
      default:
        throw new Error(`Unsupported algorithm: ${this.algorithm}`);
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a secure random signing key
 */
export function generateSigningKey(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Serialize an air-gap package to JSON
 */
export function serializeAirGapPackage(pkg: AirGapPackage): string {
  return JSON.stringify(pkg, null, 2);
}

/**
 * Parse an air-gap package from JSON
 */
export function parseAirGapPackage(json: string): AirGapPackage {
  const parsed = JSON.parse(json);

  if (parsed.version !== '1.0') {
    throw new Error(`Unsupported package version: ${parsed.version}`);
  }

  if (parsed.format !== 'stix-bundle-signed') {
    throw new Error(`Unsupported package format: ${parsed.format}`);
  }

  return parsed as AirGapPackage;
}

/**
 * Calculate integrity hash for a package
 */
export function calculatePackageIntegrity(pkg: AirGapPackage): string {
  const content = JSON.stringify({
    version: pkg.version,
    format: pkg.format,
    manifest: pkg.manifest,
    bundleIds: pkg.bundles.map(b => b.bundle.id),
    signatures: pkg.bundles.map(b => b.signature.signature),
  });
  return createHash('sha256').update(content).digest('hex');
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a signing service with environment configuration
 */
export function createSigningService(
  signingKey?: string,
): StixSigningService | null {
  const key = signingKey || process.env.STIX_SIGNING_KEY;

  if (!key) {
    signingLogger.warn('No signing key configured - bundle signing disabled');
    return null;
  }

  return new StixSigningService({
    signingKey: key,
    keyId: process.env.STIX_SIGNING_KEY_ID,
    algorithm: (process.env.STIX_SIGNING_ALGORITHM as SignatureAlgorithm) || 'HMAC-SHA256',
  });
}

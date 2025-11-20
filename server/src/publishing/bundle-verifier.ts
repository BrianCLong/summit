/**
 * Bundle Verifier
 *
 * Offline verification of proof-carrying bundles:
 * - Hash tree integrity
 * - Cryptographic signatures
 * - Citation completeness
 * - License validity
 * - Revocation status
 * - Expiration checks
 */

import { createVerify } from 'crypto';
import { promises as fs } from 'fs';
import type {
  ProofCarryingManifest,
  EvidenceWallet,
  VerificationResult,
  HashTree,
  Citation,
} from './proof-carrying-types';
import { HashTreeBuilder } from './hash-tree-builder';
import { RevocationRegistry, DistributedRevocationChecker } from './revocation-registry';

export interface VerifierConfig {
  checkRevocation?: boolean;
  revocationRegistries?: RevocationRegistry[];
  revocationListPaths?: string[]; // Offline revocation lists
  strictMode?: boolean; // Fail on warnings
  skipExpiration?: boolean; // For testing
}

export class BundleVerifier {
  private config: VerifierConfig;
  private revocationChecker?: DistributedRevocationChecker;

  constructor(config: VerifierConfig = {}) {
    this.config = {
      checkRevocation: true,
      strictMode: false,
      skipExpiration: false,
      ...config,
    };

    // Initialize revocation checker
    if (this.config.checkRevocation && this.config.revocationRegistries) {
      this.revocationChecker = new DistributedRevocationChecker(
        this.config.revocationRegistries
      );
    }
  }

  /**
   * Verify a complete bundle
   */
  async verifyBundle(
    manifest: ProofCarryingManifest,
    artifactsPath?: string
  ): Promise<VerificationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    const checks = {
      hashTreeValid: false,
      signatureValid: false,
      citationsComplete: false,
      licensesValid: false,
      notRevoked: false,
      notExpired: false,
    };

    // 1. Verify hash tree
    try {
      const hashTreeResult = this.verifyHashTree(manifest.hashTree);
      checks.hashTreeValid = hashTreeResult.valid;
      errors.push(...hashTreeResult.errors);
    } catch (error) {
      errors.push(`Hash tree verification failed: ${error}`);
    }

    // 2. Verify signature
    try {
      checks.signatureValid = this.verifySignature(manifest);
      if (!checks.signatureValid) {
        errors.push('Manifest signature is invalid');
      }
    } catch (error) {
      errors.push(`Signature verification failed: ${error}`);
    }

    // 3. Verify citations
    try {
      const citationResult = this.verifyCitations(manifest.citations);
      checks.citationsComplete = citationResult.complete;
      errors.push(...citationResult.errors);
      warnings.push(...citationResult.warnings);
    } catch (error) {
      errors.push(`Citation verification failed: ${error}`);
    }

    // 4. Verify licenses
    try {
      const licenseResult = this.verifyLicenses(manifest.licenses);
      checks.licensesValid = licenseResult.valid;
      errors.push(...licenseResult.errors);
      warnings.push(...licenseResult.warnings);
    } catch (error) {
      errors.push(`License verification failed: ${error}`);
    }

    // 5. Check revocation
    if (this.config.checkRevocation) {
      try {
        const revocationResult = await this.checkRevocation(manifest.bundleId);
        checks.notRevoked = !revocationResult.revoked;
        if (revocationResult.revoked) {
          errors.push(
            `Bundle is revoked: ${revocationResult.reason || 'No reason provided'}`
          );
        }
      } catch (error) {
        warnings.push(`Revocation check failed: ${error}`);
        // Don't fail verification if revocation check fails
        checks.notRevoked = true;
      }
    } else {
      checks.notRevoked = true;
    }

    // 6. Check expiration
    if (!this.config.skipExpiration) {
      try {
        checks.notExpired = this.checkExpiration(manifest);
        if (!checks.notExpired) {
          errors.push('Bundle has expired');
        }
      } catch (error) {
        errors.push(`Expiration check failed: ${error}`);
      }
    } else {
      checks.notExpired = true;
    }

    // 7. Verify artifacts if path provided
    if (artifactsPath) {
      try {
        const artifactResult = await this.verifyArtifacts(
          manifest.hashTree,
          artifactsPath
        );
        if (!artifactResult.valid) {
          errors.push(...artifactResult.errors);
        }
      } catch (error) {
        warnings.push(`Artifact verification failed: ${error}`);
      }
    }

    // Determine overall validity
    const valid =
      checks.hashTreeValid &&
      checks.signatureValid &&
      checks.citationsComplete &&
      checks.licensesValid &&
      checks.notRevoked &&
      checks.notExpired &&
      (!this.config.strictMode || warnings.length === 0);

    return {
      valid,
      timestamp: new Date().toISOString(),
      checks,
      errors,
      warnings,
      verifiedOffline: true,
      verificationDuration: Date.now() - startTime,
    };
  }

  /**
   * Verify hash tree integrity
   */
  private verifyHashTree(tree: HashTree): { valid: boolean; errors: string[] } {
    const builder = new HashTreeBuilder(tree.algorithm);
    return builder.verifyHashTree(tree);
  }

  /**
   * Verify manifest signature
   */
  private verifySignature(manifest: ProofCarryingManifest): boolean {
    try {
      // Create a copy without signature for verification
      const manifestCopy = { ...manifest };
      const signature = manifestCopy.signature;
      delete (manifestCopy as any).signature;

      const data = JSON.stringify(manifestCopy, null, 2);

      const verify = createVerify('SHA256');
      verify.update(data);
      verify.end();

      return verify.verify(manifest.publicKey, signature, 'hex');
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify citations
   */
  private verifyCitations(citations: Citation[]): {
    complete: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required citations
    const requiredCitations = citations.filter(c => c.required);
    const missingRequired = requiredCitations.filter(c => !c.verified);

    if (missingRequired.length > 0) {
      errors.push(
        `Missing ${missingRequired.length} required citations: ${missingRequired
          .map(c => c.title)
          .join(', ')}`
      );
    }

    // Check for unverified optional citations
    const optionalUnverified = citations.filter(
      c => !c.required && !c.verified
    );
    if (optionalUnverified.length > 0) {
      warnings.push(
        `${optionalUnverified.length} optional citations are unverified`
      );
    }

    // Validate citation structure
    for (const citation of citations) {
      if (!citation.title) {
        errors.push(`Citation ${citation.id} missing title`);
      }
      if (!citation.license) {
        errors.push(`Citation ${citation.id} missing license information`);
      }
      if (citation.required && !citation.verifiedAt) {
        errors.push(`Required citation ${citation.title} not verified`);
      }
    }

    return {
      complete: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Verify licenses
   */
  private verifyLicenses(licenses: any[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (licenses.length === 0) {
      warnings.push('No license information provided');
    }

    for (const license of licenses) {
      // Validate SPDX identifier
      if (!license.spdxId) {
        errors.push('License missing SPDX identifier');
      }

      // Check for license text or URL
      if (!license.text && !license.url) {
        warnings.push(`License ${license.spdxId} missing text or URL`);
      }

      // Validate required fields
      if (license.requiresAttribution === undefined) {
        warnings.push(
          `License ${license.spdxId} missing attribution requirement`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check revocation status
   */
  private async checkRevocation(bundleId: string): Promise<{
    revoked: boolean;
    reason?: string;
  }> {
    // Load offline revocation lists if provided
    if (this.config.revocationListPaths) {
      for (const path of this.config.revocationListPaths) {
        try {
          const content = await fs.readFile(path, 'utf8');
          const list = JSON.parse(content);

          if (list.revokedBundles && list.revokedBundles.includes(bundleId)) {
            const record = list.revocations.find(
              (r: any) => r.bundleId === bundleId
            );
            return {
              revoked: true,
              reason: record?.reason || 'Unknown',
            };
          }
        } catch (error) {
          console.warn(`Failed to load revocation list ${path}:`, error);
        }
      }
    }

    // Check in-memory registries
    if (this.revocationChecker) {
      const isRevoked = this.revocationChecker.isBundleRevoked(bundleId);
      if (isRevoked) {
        const records = this.revocationChecker.getBundleRevocations(bundleId);
        const reason = records[0]?.reason || 'Unknown';
        return { revoked: true, reason };
      }
    }

    return { revoked: false };
  }

  /**
   * Check if manifest has expired
   */
  private checkExpiration(manifest: ProofCarryingManifest): boolean {
    if (!manifest.expiresAt) {
      return true; // No expiration set
    }

    const expiryDate = new Date(manifest.expiresAt);
    return expiryDate > new Date();
  }

  /**
   * Verify actual artifacts against hash tree
   */
  private async verifyArtifacts(
    tree: HashTree,
    artifactsPath: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const builder = new HashTreeBuilder(tree.algorithm);

    for (const leaf of tree.leaves) {
      try {
        const filePath = `${artifactsPath}/${leaf.path}`;
        const isValid = await builder.verifyFile(filePath, tree);

        if (!isValid) {
          errors.push(`Artifact ${leaf.path} hash mismatch`);
        }
      } catch (error) {
        errors.push(`Failed to verify artifact ${leaf.path}: ${error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verify evidence wallet
   */
  async verifyWallet(wallet: EvidenceWallet): Promise<VerificationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify wallet signature
    let signatureValid = false;
    try {
      const manifestJson = JSON.stringify(wallet.manifest, null, 2);
      const verify = createVerify('SHA256');
      verify.update(manifestJson);
      verify.end();
      signatureValid = verify.verify(wallet.publicKey, wallet.signature, 'hex');

      if (!signatureValid) {
        errors.push('Wallet signature is invalid');
      }
    } catch (error) {
      errors.push(`Wallet signature verification failed: ${error}`);
    }

    // Check wallet expiration
    let notExpired = true;
    if (!this.config.skipExpiration && wallet.expiresAt) {
      const expiryDate = new Date(wallet.expiresAt);
      notExpired = expiryDate > new Date();
      if (!notExpired) {
        errors.push('Wallet has expired');
      }
    }

    // Check revocation
    let notRevoked = true;
    if (this.config.checkRevocation) {
      const revocationResult = await this.checkRevocation(wallet.bundleId);
      notRevoked = !revocationResult.revoked;
      if (revocationResult.revoked) {
        errors.push(`Wallet is revoked: ${revocationResult.reason}`);
      }
    }

    // Verify underlying manifest
    const manifestResult = await this.verifyBundle(wallet.manifest);
    errors.push(...manifestResult.errors);
    warnings.push(...manifestResult.warnings);

    const valid =
      signatureValid &&
      notExpired &&
      notRevoked &&
      manifestResult.valid &&
      (!this.config.strictMode || warnings.length === 0);

    return {
      valid,
      timestamp: new Date().toISOString(),
      checks: {
        ...manifestResult.checks,
        signatureValid,
        notExpired,
        notRevoked,
      },
      errors,
      warnings,
      verifiedOffline: true,
      verificationDuration: Date.now() - startTime,
    };
  }

  /**
   * Generate verification report
   */
  generateReport(result: VerificationResult): string {
    const lines: string[] = [];

    lines.push('=== Bundle Verification Report ===');
    lines.push(`Timestamp: ${result.timestamp}`);
    lines.push(`Duration: ${result.verificationDuration}ms`);
    lines.push(`Verified Offline: ${result.verifiedOffline ? 'Yes' : 'No'}`);
    lines.push('');

    lines.push('Overall Status: ' + (result.valid ? '✓ VALID' : '✗ INVALID'));
    lines.push('');

    lines.push('Checks:');
    for (const [check, status] of Object.entries(result.checks)) {
      lines.push(`  ${status ? '✓' : '✗'} ${check}`);
    }
    lines.push('');

    if (result.errors.length > 0) {
      lines.push('Errors:');
      for (const error of result.errors) {
        lines.push(`  ✗ ${error}`);
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      for (const warning of result.warnings) {
        lines.push(`  ⚠ ${warning}`);
      }
      lines.push('');
    }

    if (result.valid) {
      lines.push('Bundle integrity verified. Safe to use.');
    } else {
      lines.push('Bundle integrity check FAILED. Do not use.');
    }

    return lines.join('\n');
  }
}

/**
 * Quick verification helper
 */
export async function quickVerify(
  manifestPath: string,
  options: VerifierConfig = {}
): Promise<VerificationResult> {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const verifier = new BundleVerifier(options);
  return verifier.verifyBundle(manifest);
}

/**
 * Verify wallet from file
 */
export async function verifyWalletFile(
  walletPath: string,
  options: VerifierConfig = {}
): Promise<VerificationResult> {
  const wallet = JSON.parse(await fs.readFile(walletPath, 'utf8'));
  const verifier = new BundleVerifier(options);
  return verifier.verifyWallet(wallet);
}

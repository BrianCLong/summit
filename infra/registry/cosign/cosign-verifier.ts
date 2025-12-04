/**
 * Cosign Signature Verification Service
 *
 * Provides container image signature verification using Sigstore cosign.
 * Supports both keyless (Fulcio/Rekor) and key-based verification.
 *
 * @module cosign-verifier
 * @security Critical - All images must pass verification before deployment
 */

import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CosignVerificationResult {
  verified: boolean;
  imageRef: string;
  digest: string;
  signatures: SignatureInfo[];
  attestations: AttestationInfo[];
  timestamp: Date;
  verificationDuration: number;
  errors: VerificationError[];
}

export interface SignatureInfo {
  keyId: string;
  issuer?: string;
  subject?: string;
  signedAt: Date;
  payload: Record<string, unknown>;
  certificateChain?: string[];
}

export interface AttestationInfo {
  predicateType: string;
  predicate: Record<string, unknown>;
  verified: boolean;
}

export interface VerificationError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface VerificationPolicy {
  requireSignature: boolean;
  requireKeyless: boolean;
  trustedIssuers: string[];
  trustedSubjects: string[];
  trustedKeyRefs: string[];
  requireAttestation: boolean;
  attestationPredicateTypes: string[];
  rekorUrl?: string;
  fulcioUrl?: string;
  ctLogUrl?: string;
}

export interface CosignConfig {
  cosignBinaryPath: string;
  cacheDir: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  offline: boolean;
  tufRoot?: string;
  rekorUrl: string;
  fulcioUrl: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CosignConfig = {
  cosignBinaryPath: '/usr/local/bin/cosign',
  cacheDir: '/var/cache/cosign',
  timeout: 60000, // 60 seconds
  retryAttempts: 3,
  retryDelay: 1000,
  offline: false,
  rekorUrl: 'https://rekor.sigstore.dev',
  fulcioUrl: 'https://fulcio.sigstore.dev',
};

const DEFAULT_POLICY: VerificationPolicy = {
  requireSignature: true,
  requireKeyless: false,
  trustedIssuers: [
    'https://accounts.google.com',
    'https://token.actions.githubusercontent.com',
  ],
  trustedSubjects: [],
  trustedKeyRefs: [],
  requireAttestation: false,
  attestationPredicateTypes: [
    'https://slsa.dev/provenance/v0.2',
    'https://slsa.dev/provenance/v1',
  ],
};

// ============================================================================
// Cosign Verifier Class
// ============================================================================

export class CosignVerifier {
  private config: CosignConfig;
  private policy: VerificationPolicy;
  private verificationCache: Map<string, CosignVerificationResult>;

  constructor(
    config: Partial<CosignConfig> = {},
    policy: Partial<VerificationPolicy> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.verificationCache = new Map();

    this.validateConfig();
  }

  /**
   * Verify an image signature and attestations
   */
  async verifyImage(imageRef: string): Promise<CosignVerificationResult> {
    const startTime = Date.now();
    const errors: VerificationError[] = [];
    const signatures: SignatureInfo[] = [];
    const attestations: AttestationInfo[] = [];

    // Check cache first
    const cacheKey = this.getCacheKey(imageRef);
    const cached = this.verificationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Resolve image digest
    const digest = await this.resolveDigest(imageRef);
    if (!digest) {
      return this.createFailedResult(imageRef, '', startTime, [
        {
          code: 'DIGEST_RESOLUTION_FAILED',
          message: `Failed to resolve digest for image: ${imageRef}`,
          recoverable: true,
        },
      ]);
    }

    // Verify signatures
    if (this.policy.requireSignature) {
      const sigResult = await this.verifySignatures(imageRef, digest);
      signatures.push(...sigResult.signatures);
      errors.push(...sigResult.errors);
    }

    // Verify attestations
    if (this.policy.requireAttestation) {
      const attResult = await this.verifyAttestations(imageRef, digest);
      attestations.push(...attResult.attestations);
      errors.push(...attResult.errors);
    }

    // Build result
    const verified =
      errors.filter((e) => !e.recoverable).length === 0 &&
      (!this.policy.requireSignature || signatures.length > 0) &&
      (!this.policy.requireAttestation || attestations.some((a) => a.verified));

    const result: CosignVerificationResult = {
      verified,
      imageRef,
      digest,
      signatures,
      attestations,
      timestamp: new Date(),
      verificationDuration: Date.now() - startTime,
      errors,
    };

    // Cache successful results
    if (verified) {
      this.verificationCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Verify image signatures using cosign
   */
  private async verifySignatures(
    imageRef: string,
    digest: string
  ): Promise<{ signatures: SignatureInfo[]; errors: VerificationError[] }> {
    const signatures: SignatureInfo[] = [];
    const errors: VerificationError[] = [];

    try {
      // Try keyless verification first
      if (this.policy.trustedIssuers.length > 0) {
        for (const issuer of this.policy.trustedIssuers) {
          const result = await this.runCosignVerify(imageRef, {
            keyless: true,
            issuer,
          });

          if (result.success && result.signatures) {
            signatures.push(...result.signatures);
          }
        }
      }

      // Try key-based verification
      for (const keyRef of this.policy.trustedKeyRefs) {
        const result = await this.runCosignVerify(imageRef, {
          keyless: false,
          keyRef,
        });

        if (result.success && result.signatures) {
          signatures.push(...result.signatures);
        }
      }

      if (signatures.length === 0) {
        errors.push({
          code: 'NO_VALID_SIGNATURES',
          message: `No valid signatures found for image: ${imageRef}`,
          recoverable: false,
        });
      }
    } catch (err) {
      errors.push({
        code: 'SIGNATURE_VERIFICATION_ERROR',
        message: `Signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
        recoverable: true,
      });
    }

    return { signatures, errors };
  }

  /**
   * Verify image attestations
   */
  private async verifyAttestations(
    imageRef: string,
    _digest: string
  ): Promise<{ attestations: AttestationInfo[]; errors: VerificationError[] }> {
    const attestations: AttestationInfo[] = [];
    const errors: VerificationError[] = [];

    try {
      for (const predicateType of this.policy.attestationPredicateTypes) {
        const result = await this.runCosignVerifyAttestation(
          imageRef,
          predicateType
        );

        if (result.success && result.attestation) {
          attestations.push({
            predicateType,
            predicate: result.attestation.predicate,
            verified: true,
          });
        }
      }

      if (attestations.length === 0) {
        errors.push({
          code: 'NO_VALID_ATTESTATIONS',
          message: `No valid attestations found for image: ${imageRef}`,
          recoverable: false,
        });
      }
    } catch (err) {
      errors.push({
        code: 'ATTESTATION_VERIFICATION_ERROR',
        message: `Attestation verification failed: ${err instanceof Error ? err.message : String(err)}`,
        recoverable: true,
      });
    }

    return { attestations, errors };
  }

  /**
   * Run cosign verify command
   */
  private async runCosignVerify(
    imageRef: string,
    options: {
      keyless: boolean;
      keyRef?: string;
      issuer?: string;
    }
  ): Promise<{ success: boolean; signatures?: SignatureInfo[] }> {
    const args = ['verify', '--output=json'];

    if (options.keyless) {
      args.push('--certificate-identity-regexp=.*');
      if (options.issuer) {
        args.push(`--certificate-oidc-issuer=${options.issuer}`);
      }
    } else if (options.keyRef) {
      args.push(`--key=${options.keyRef}`);
    }

    if (this.config.offline) {
      args.push('--offline');
    }

    if (this.config.rekorUrl !== DEFAULT_CONFIG.rekorUrl) {
      args.push(`--rekor-url=${this.config.rekorUrl}`);
    }

    args.push(imageRef);

    return new Promise((resolve) => {
      const process = spawn(this.config.cosignBinaryPath, args, {
        timeout: this.config.timeout,
        env: {
          ...globalThis.process.env,
          COSIGN_EXPERIMENTAL: '1',
          TUF_ROOT: this.config.tufRoot || '',
        },
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const output = JSON.parse(stdout);
            const signatures = this.parseSignatures(output);
            resolve({ success: true, signatures });
          } catch {
            resolve({ success: true, signatures: [] });
          }
        } else {
          console.error(`Cosign verification failed: ${stderr}`);
          resolve({ success: false });
        }
      });

      process.on('error', (err) => {
        console.error(`Cosign process error: ${err.message}`);
        resolve({ success: false });
      });
    });
  }

  /**
   * Run cosign verify-attestation command
   */
  private async runCosignVerifyAttestation(
    imageRef: string,
    predicateType: string
  ): Promise<{
    success: boolean;
    attestation?: { predicate: Record<string, unknown> };
  }> {
    const args = [
      'verify-attestation',
      '--output=json',
      `--type=${predicateType}`,
      '--certificate-identity-regexp=.*',
      '--certificate-oidc-issuer-regexp=.*',
    ];

    if (this.config.offline) {
      args.push('--offline');
    }

    args.push(imageRef);

    return new Promise((resolve) => {
      const process = spawn(this.config.cosignBinaryPath, args, {
        timeout: this.config.timeout,
        env: {
          ...globalThis.process.env,
          COSIGN_EXPERIMENTAL: '1',
        },
      });

      let stdout = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const output = JSON.parse(stdout);
            resolve({
              success: true,
              attestation: { predicate: output.predicate || output },
            });
          } catch {
            resolve({ success: false });
          }
        } else {
          resolve({ success: false });
        }
      });

      process.on('error', () => {
        resolve({ success: false });
      });
    });
  }

  /**
   * Resolve image reference to digest
   */
  private async resolveDigest(imageRef: string): Promise<string | null> {
    // If already a digest reference, extract it
    if (imageRef.includes('@sha256:')) {
      return imageRef.split('@')[1];
    }

    // Use crane or skopeo to resolve digest
    return new Promise((resolve) => {
      const process = spawn(
        'crane',
        ['digest', imageRef, '--platform=linux/amd64'],
        {
          timeout: this.config.timeout,
        }
      );

      let stdout = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          resolve(null);
        }
      });

      process.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Parse signature information from cosign output
   */
  private parseSignatures(output: unknown): SignatureInfo[] {
    const signatures: SignatureInfo[] = [];

    if (Array.isArray(output)) {
      for (const entry of output) {
        if (entry.critical?.identity?.['docker-reference']) {
          signatures.push({
            keyId: entry.critical?.identity?.['docker-reference'] || 'unknown',
            issuer: entry.optional?.Issuer,
            subject: entry.optional?.Subject,
            signedAt: new Date(entry.optional?.['Bundle']?.SignedEntryTimestamp || Date.now()),
            payload: entry,
          });
        }
      }
    }

    return signatures;
  }

  /**
   * Generate cache key for image
   */
  private getCacheKey(imageRef: string): string {
    return createHash('sha256').update(imageRef).digest('hex');
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(result: CosignVerificationResult): boolean {
    const cacheMaxAge = 3600000; // 1 hour
    return Date.now() - result.timestamp.getTime() < cacheMaxAge;
  }

  /**
   * Create a failed verification result
   */
  private createFailedResult(
    imageRef: string,
    digest: string,
    startTime: number,
    errors: VerificationError[]
  ): CosignVerificationResult {
    return {
      verified: false,
      imageRef,
      digest,
      signatures: [],
      attestations: [],
      timestamp: new Date(),
      verificationDuration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!existsSync(this.config.cosignBinaryPath)) {
      console.warn(
        `Cosign binary not found at ${this.config.cosignBinaryPath}. ` +
          'Verification will fail until cosign is installed.'
      );
    }
  }

  /**
   * Export verification report
   */
  async exportReport(results: CosignVerificationResult[]): Promise<string> {
    const report = {
      generatedAt: new Date().toISOString(),
      totalImages: results.length,
      verified: results.filter((r) => r.verified).length,
      failed: results.filter((r) => !r.verified).length,
      results: results.map((r) => ({
        imageRef: r.imageRef,
        digest: r.digest,
        verified: r.verified,
        signatures: r.signatures.length,
        attestations: r.attestations.length,
        errors: r.errors,
      })),
    };

    const reportPath = join(
      this.config.cacheDir,
      `verification-report-${Date.now()}.json`
    );
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return reportPath;
  }
}

// ============================================================================
// Admission Controller Integration
// ============================================================================

export interface AdmissionRequest {
  uid: string;
  kind: { group: string; version: string; kind: string };
  resource: { group: string; version: string; resource: string };
  name: string;
  namespace: string;
  operation: string;
  object: {
    spec?: {
      containers?: Array<{ image: string }>;
      initContainers?: Array<{ image: string }>;
    };
  };
}

export interface AdmissionResponse {
  uid: string;
  allowed: boolean;
  status?: {
    code: number;
    message: string;
  };
  warnings?: string[];
}

/**
 * Kubernetes Admission Controller for image verification
 */
export class CosignAdmissionController {
  private verifier: CosignVerifier;
  private exemptNamespaces: Set<string>;

  constructor(verifier: CosignVerifier, exemptNamespaces: string[] = []) {
    this.verifier = verifier;
    this.exemptNamespaces = new Set(exemptNamespaces);
  }

  /**
   * Process admission request
   */
  async review(request: AdmissionRequest): Promise<AdmissionResponse> {
    // Skip exempt namespaces
    if (this.exemptNamespaces.has(request.namespace)) {
      return {
        uid: request.uid,
        allowed: true,
        warnings: [`Namespace ${request.namespace} is exempt from verification`],
      };
    }

    // Extract images from pod spec
    const images = this.extractImages(request);
    if (images.length === 0) {
      return { uid: request.uid, allowed: true };
    }

    // Verify all images
    const results = await Promise.all(
      images.map((img) => this.verifier.verifyImage(img))
    );

    const failedImages = results.filter((r) => !r.verified);
    if (failedImages.length > 0) {
      const errorMessages = failedImages
        .map(
          (r) =>
            `${r.imageRef}: ${r.errors.map((e) => e.message).join(', ')}`
        )
        .join('; ');

      return {
        uid: request.uid,
        allowed: false,
        status: {
          code: 403,
          message: `Image verification failed: ${errorMessages}`,
        },
      };
    }

    return {
      uid: request.uid,
      allowed: true,
      warnings: results
        .filter((r) => r.errors.length > 0)
        .map((r) => `${r.imageRef}: ${r.errors.map((e) => e.message).join(', ')}`),
    };
  }

  /**
   * Extract container images from admission request
   */
  private extractImages(request: AdmissionRequest): string[] {
    const images: string[] = [];
    const spec = request.object?.spec;

    if (spec?.containers) {
      images.push(...spec.containers.map((c) => c.image));
    }
    if (spec?.initContainers) {
      images.push(...spec.initContainers.map((c) => c.image));
    }

    return [...new Set(images)];
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const verifier = new CosignVerifier();

  switch (command) {
    case 'verify': {
      const imageRef = args[1];
      if (!imageRef) {
        console.error('Usage: cosign-verifier verify <image-ref>');
        process.exit(1);
      }

      const result = await verifier.verifyImage(imageRef);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.verified ? 0 : 1);
      break;
    }

    case 'batch-verify': {
      const imagesFile = args[1];
      if (!imagesFile || !existsSync(imagesFile)) {
        console.error('Usage: cosign-verifier batch-verify <images-file>');
        process.exit(1);
      }

      const images = readFileSync(imagesFile, 'utf-8')
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'));

      const results = await Promise.all(
        images.map((img) => verifier.verifyImage(img))
      );

      const reportPath = await verifier.exportReport(results);
      console.log(`Report saved to: ${reportPath}`);

      const failed = results.filter((r) => !r.verified);
      if (failed.length > 0) {
        console.error(`${failed.length} images failed verification`);
        process.exit(1);
      }

      console.log(`All ${results.length} images verified successfully`);
      break;
    }

    default:
      console.error('Unknown command. Available: verify, batch-verify');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

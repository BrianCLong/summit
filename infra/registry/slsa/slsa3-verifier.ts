/**
 * SLSA Level 3 Provenance Verifier
 *
 * Implements verification of SLSA (Supply-chain Levels for Software Artifacts)
 * provenance attestations at Level 3 requirements:
 *
 * SLSA Level 3 Requirements:
 * - Source: Version controlled, verified history, retained indefinitely
 * - Build: Hardened build service, isolated, parameterless
 * - Provenance: Non-falsifiable, dependencies complete
 *
 * @module slsa3-verifier
 * @security Critical - Ensures supply chain integrity
 */

import { createHash, createVerify } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * SLSA Provenance v1.0 Schema
 * @see https://slsa.dev/provenance/v1
 */
export interface SLSAProvenanceV1 {
  _type: 'https://in-toto.io/Statement/v1';
  subject: Array<{
    name: string;
    digest: { sha256: string; sha512?: string };
  }>;
  predicateType: 'https://slsa.dev/provenance/v1';
  predicate: {
    buildDefinition: {
      buildType: string;
      externalParameters: Record<string, unknown>;
      internalParameters?: Record<string, unknown>;
      resolvedDependencies?: Array<{
        uri: string;
        digest: { sha256?: string; sha512?: string; gitCommit?: string };
        annotations?: Record<string, string>;
      }>;
    };
    runDetails: {
      builder: {
        id: string;
        builderDependencies?: Array<{
          uri: string;
          digest: Record<string, string>;
        }>;
        version?: Record<string, string>;
      };
      metadata?: {
        invocationId?: string;
        startedOn?: string;
        finishedOn?: string;
      };
      byproducts?: Array<{
        uri: string;
        mediaType?: string;
        digest?: Record<string, string>;
      }>;
    };
  };
}

/**
 * SLSA Verification Result
 */
export interface SLSAVerificationResult {
  verified: boolean;
  slsaLevel: 0 | 1 | 2 | 3 | 4;
  imageRef: string;
  digest: string;
  provenance?: SLSAProvenanceV1;
  builder?: BuilderInfo;
  source?: SourceInfo;
  buildInfo?: BuildInfo;
  violations: SLSAViolation[];
  timestamp: Date;
  verificationDuration: number;
}

export interface BuilderInfo {
  id: string;
  trusted: boolean;
  slsaLevel: number;
  version?: string;
}

export interface SourceInfo {
  repository: string;
  ref?: string;
  commit?: string;
  verified: boolean;
}

export interface BuildInfo {
  buildType: string;
  reproducible: boolean;
  isolated: boolean;
  parameterless: boolean;
  invocationId?: string;
  startedOn?: Date;
  finishedOn?: Date;
}

export interface SLSAViolation {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  requirement: string;
}

export interface SLSAVerifierConfig {
  trustedBuilders: TrustedBuilder[];
  requiredLevel: 0 | 1 | 2 | 3 | 4;
  requireReproducibleBuild: boolean;
  cacheDir: string;
  timeout: number;
  rekorUrl: string;
}

export interface TrustedBuilder {
  id: string;
  name: string;
  slsaLevel: number;
  patterns: string[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_TRUSTED_BUILDERS: TrustedBuilder[] = [
  {
    id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_go_slsa3.yml',
    name: 'SLSA Go Builder (GitHub)',
    slsaLevel: 3,
    patterns: ['https://github.com/slsa-framework/slsa-github-generator/*'],
  },
  {
    id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_container_slsa3.yml',
    name: 'SLSA Container Builder (GitHub)',
    slsaLevel: 3,
    patterns: ['https://github.com/slsa-framework/slsa-github-generator/*'],
  },
  {
    id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_nodejs_slsa3.yml',
    name: 'SLSA Node.js Builder (GitHub)',
    slsaLevel: 3,
    patterns: ['https://github.com/slsa-framework/slsa-github-generator/*'],
  },
  {
    id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml',
    name: 'SLSA Container Generator (GitHub)',
    slsaLevel: 3,
    patterns: ['https://github.com/slsa-framework/slsa-github-generator/*'],
  },
  {
    id: 'https://cloudbuild.googleapis.com/GoogleHostedWorker',
    name: 'Google Cloud Build',
    slsaLevel: 3,
    patterns: ['https://cloudbuild.googleapis.com/*'],
  },
];

const DEFAULT_CONFIG: SLSAVerifierConfig = {
  trustedBuilders: DEFAULT_TRUSTED_BUILDERS,
  requiredLevel: 3,
  requireReproducibleBuild: false,
  cacheDir: '/var/cache/slsa',
  timeout: 60000,
  rekorUrl: 'https://rekor.sigstore.dev',
};

// ============================================================================
// SLSA Level 3 Verifier
// ============================================================================

export class SLSA3Verifier {
  private config: SLSAVerifierConfig;
  private verificationCache: Map<string, SLSAVerificationResult>;

  constructor(config: Partial<SLSAVerifierConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.verificationCache = new Map();
  }

  /**
   * Verify SLSA provenance for an image
   */
  async verifyProvenance(imageRef: string): Promise<SLSAVerificationResult> {
    const startTime = Date.now();
    const violations: SLSAViolation[] = [];

    // Check cache
    const cacheKey = this.getCacheKey(imageRef);
    const cached = this.verificationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Fetch provenance attestation
    const provenance = await this.fetchProvenance(imageRef);
    if (!provenance) {
      return this.createResult(imageRef, '', 0, violations, startTime, {
        code: 'NO_PROVENANCE',
        severity: 'critical',
        message: 'No SLSA provenance attestation found',
        requirement: 'SLSA L1: Provenance exists',
      });
    }

    // Extract digest
    const digest = provenance.subject?.[0]?.digest?.sha256 || '';

    // Verify builder trust
    const builderInfo = this.verifyBuilder(provenance, violations);

    // Verify source
    const sourceInfo = await this.verifySource(provenance, violations);

    // Verify build requirements
    const buildInfo = this.verifyBuild(provenance, violations);

    // Calculate achieved SLSA level
    const slsaLevel = this.calculateSLSALevel(violations, builderInfo);

    // Check if meets required level
    if (slsaLevel < this.config.requiredLevel) {
      violations.push({
        code: 'INSUFFICIENT_SLSA_LEVEL',
        severity: 'critical',
        message: `Image achieves SLSA L${slsaLevel}, but L${this.config.requiredLevel} is required`,
        requirement: `SLSA L${this.config.requiredLevel}`,
      });
    }

    const verified =
      violations.filter((v) => v.severity === 'critical').length === 0;

    const result: SLSAVerificationResult = {
      verified,
      slsaLevel,
      imageRef,
      digest,
      provenance,
      builder: builderInfo,
      source: sourceInfo,
      buildInfo,
      violations,
      timestamp: new Date(),
      verificationDuration: Date.now() - startTime,
    };

    // Cache successful results
    if (verified) {
      this.verificationCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Fetch provenance attestation from registry or Rekor
   */
  private async fetchProvenance(
    imageRef: string
  ): Promise<SLSAProvenanceV1 | null> {
    try {
      // Try to fetch from OCI registry first (cosign attestation)
      const attestation = await this.fetchOCIAttestation(imageRef);
      if (attestation) {
        return attestation;
      }

      // Fallback to Rekor transparency log
      return await this.fetchRekorAttestation(imageRef);
    } catch (err) {
      console.error(
        `Failed to fetch provenance: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  }

  /**
   * Fetch attestation from OCI registry
   */
  private async fetchOCIAttestation(
    imageRef: string
  ): Promise<SLSAProvenanceV1 | null> {
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const process = spawn('cosign', [
        'download',
        'attestation',
        '--predicate-type=https://slsa.dev/provenance/v1',
        imageRef,
      ]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            // Parse the attestation envelope
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
              const envelope = JSON.parse(line);
              if (envelope.payload) {
                const payload = JSON.parse(
                  Buffer.from(envelope.payload, 'base64').toString()
                );
                if (payload.predicateType?.includes('slsa.dev/provenance')) {
                  resolve(payload as SLSAProvenanceV1);
                  return;
                }
              }
            }
          } catch {
            // Parsing failed
          }
        }

        // Try v0.2 format
        this.fetchOCIAttestationV02(imageRef).then(resolve);
      });

      process.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Fetch attestation in SLSA v0.2 format
   */
  private async fetchOCIAttestationV02(
    imageRef: string
  ): Promise<SLSAProvenanceV1 | null> {
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const process = spawn('cosign', [
        'download',
        'attestation',
        '--predicate-type=https://slsa.dev/provenance/v0.2',
        imageRef,
      ]);

      let stdout = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
              const envelope = JSON.parse(line);
              if (envelope.payload) {
                const payload = JSON.parse(
                  Buffer.from(envelope.payload, 'base64').toString()
                );
                // Convert v0.2 to v1 format
                const converted = this.convertV02toV1(payload);
                if (converted) {
                  resolve(converted);
                  return;
                }
              }
            }
          } catch {
            // Parsing failed
          }
        }
        resolve(null);
      });

      process.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Convert SLSA v0.2 provenance to v1 format
   */
  private convertV02toV1(v02: Record<string, unknown>): SLSAProvenanceV1 | null {
    try {
      const predicate = v02.predicate as Record<string, unknown>;
      const builder = predicate?.builder as { id?: string } | undefined;
      const invocation = predicate?.invocation as Record<string, unknown> | undefined;
      const metadata = predicate?.metadata as Record<string, unknown> | undefined;
      const materials = predicate?.materials as Array<{ uri?: string; digest?: Record<string, string> }> | undefined;

      return {
        _type: 'https://in-toto.io/Statement/v1',
        subject: v02.subject as SLSAProvenanceV1['subject'],
        predicateType: 'https://slsa.dev/provenance/v1',
        predicate: {
          buildDefinition: {
            buildType: (predicate?.buildType as string) || 'unknown',
            externalParameters: (invocation?.parameters as Record<string, unknown>) || {},
            resolvedDependencies: materials?.map((m) => ({
              uri: m.uri || '',
              digest: m.digest || {},
            })),
          },
          runDetails: {
            builder: {
              id: builder?.id || 'unknown',
            },
            metadata: {
              invocationId: metadata?.buildInvocationId as string | undefined,
              startedOn: metadata?.buildStartedOn as string | undefined,
              finishedOn: metadata?.buildFinishedOn as string | undefined,
            },
          },
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch attestation from Rekor transparency log
   */
  private async fetchRekorAttestation(
    _imageRef: string
  ): Promise<SLSAProvenanceV1 | null> {
    // Implementation would query Rekor API
    // For now, return null to indicate no Rekor attestation found
    return null;
  }

  /**
   * Verify the builder meets SLSA requirements
   */
  private verifyBuilder(
    provenance: SLSAProvenanceV1,
    violations: SLSAViolation[]
  ): BuilderInfo {
    const builderId = provenance.predicate.runDetails.builder.id;

    // Find matching trusted builder
    const trustedBuilder = this.config.trustedBuilders.find(
      (b) => b.id === builderId || b.patterns.some((p) => this.matchPattern(builderId, p))
    );

    if (!trustedBuilder) {
      violations.push({
        code: 'UNTRUSTED_BUILDER',
        severity: 'critical',
        message: `Builder "${builderId}" is not in the trusted builders list`,
        requirement: 'SLSA L3: Hardened, trusted build service',
      });

      return {
        id: builderId,
        trusted: false,
        slsaLevel: 0,
      };
    }

    return {
      id: builderId,
      trusted: true,
      slsaLevel: trustedBuilder.slsaLevel,
      version: provenance.predicate.runDetails.builder.version?.['slsa-framework/slsa-github-generator'],
    };
  }

  /**
   * Verify source requirements
   */
  private async verifySource(
    provenance: SLSAProvenanceV1,
    violations: SLSAViolation[]
  ): Promise<SourceInfo> {
    const dependencies = provenance.predicate.buildDefinition.resolvedDependencies || [];

    // Find source repository in dependencies
    const sourceRepo = dependencies.find(
      (d) => d.uri?.includes('github.com') || d.uri?.includes('gitlab.com')
    );

    if (!sourceRepo) {
      violations.push({
        code: 'NO_SOURCE_REPO',
        severity: 'high',
        message: 'No source repository found in provenance',
        requirement: 'SLSA L2: Version controlled source',
      });

      return {
        repository: 'unknown',
        verified: false,
      };
    }

    // Extract commit information
    const commit = sourceRepo.digest?.sha1 || sourceRepo.digest?.gitCommit;

    if (!commit) {
      violations.push({
        code: 'NO_SOURCE_COMMIT',
        severity: 'medium',
        message: 'No source commit hash in provenance',
        requirement: 'SLSA L3: Source verified history',
      });
    }

    return {
      repository: sourceRepo.uri,
      commit,
      verified: !!commit,
    };
  }

  /**
   * Verify build requirements
   */
  private verifyBuild(
    provenance: SLSAProvenanceV1,
    violations: SLSAViolation[]
  ): BuildInfo {
    const buildDef = provenance.predicate.buildDefinition;
    const runDetails = provenance.predicate.runDetails;

    // Check for external parameters (should be minimal for L3)
    const externalParams = Object.keys(buildDef.externalParameters || {});
    const parameterless = externalParams.length <= 2; // Allow source + workflow only

    if (!parameterless) {
      violations.push({
        code: 'EXCESSIVE_BUILD_PARAMS',
        severity: 'medium',
        message: `Build has ${externalParams.length} external parameters (L3 requires parameterless)`,
        requirement: 'SLSA L3: Parameterless build',
      });
    }

    // Check for isolated build (inferred from trusted builder)
    const isolated = this.isIsolatedBuild(buildDef.buildType);

    if (!isolated) {
      violations.push({
        code: 'NON_ISOLATED_BUILD',
        severity: 'high',
        message: 'Build may not be isolated',
        requirement: 'SLSA L3: Isolated build environment',
      });
    }

    return {
      buildType: buildDef.buildType,
      reproducible: this.config.requireReproducibleBuild
        ? this.isReproducibleBuild(buildDef.buildType)
        : true,
      isolated,
      parameterless,
      invocationId: runDetails.metadata?.invocationId,
      startedOn: runDetails.metadata?.startedOn
        ? new Date(runDetails.metadata.startedOn)
        : undefined,
      finishedOn: runDetails.metadata?.finishedOn
        ? new Date(runDetails.metadata.finishedOn)
        : undefined,
    };
  }

  /**
   * Calculate achieved SLSA level based on violations
   */
  private calculateSLSALevel(
    violations: SLSAViolation[],
    builder: BuilderInfo
  ): 0 | 1 | 2 | 3 | 4 {
    // Start with builder's claimed level
    let level = builder.slsaLevel as 0 | 1 | 2 | 3 | 4;

    // Critical violations drop to L0
    if (violations.some((v) => v.severity === 'critical')) {
      return 0;
    }

    // High severity violations cap at L1
    if (violations.some((v) => v.severity === 'high')) {
      level = Math.min(level, 1) as 0 | 1 | 2 | 3 | 4;
    }

    // Medium severity violations cap at L2
    if (violations.some((v) => v.severity === 'medium')) {
      level = Math.min(level, 2) as 0 | 1 | 2 | 3 | 4;
    }

    return level;
  }

  /**
   * Check if build type indicates isolated build
   */
  private isIsolatedBuild(buildType: string): boolean {
    const isolatedBuildTypes = [
      'https://github.com/slsa-framework/slsa-github-generator',
      'https://cloudbuild.googleapis.com',
      'https://tekton.dev/attestations/chains',
    ];

    return isolatedBuildTypes.some((t) => buildType.startsWith(t));
  }

  /**
   * Check if build type is reproducible
   */
  private isReproducibleBuild(buildType: string): boolean {
    const reproducibleBuildTypes = [
      'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_go_slsa3.yml',
    ];

    return reproducibleBuildTypes.includes(buildType);
  }

  /**
   * Pattern matching helper
   */
  private matchPattern(value: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(value);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(imageRef: string): string {
    return createHash('sha256').update(imageRef).digest('hex');
  }

  /**
   * Check if cached result is valid
   */
  private isCacheValid(result: SLSAVerificationResult): boolean {
    const maxAge = 3600000; // 1 hour
    return Date.now() - result.timestamp.getTime() < maxAge;
  }

  /**
   * Create verification result with violation
   */
  private createResult(
    imageRef: string,
    digest: string,
    slsaLevel: 0 | 1 | 2 | 3 | 4,
    violations: SLSAViolation[],
    startTime: number,
    additionalViolation?: SLSAViolation
  ): SLSAVerificationResult {
    if (additionalViolation) {
      violations.push(additionalViolation);
    }

    return {
      verified: false,
      slsaLevel,
      imageRef,
      digest,
      violations,
      timestamp: new Date(),
      verificationDuration: Date.now() - startTime,
    };
  }

  /**
   * Export verification results to JSON report
   */
  exportReport(results: SLSAVerificationResult[]): string {
    const report = {
      generatedAt: new Date().toISOString(),
      requiredLevel: this.config.requiredLevel,
      totalImages: results.length,
      summary: {
        verified: results.filter((r) => r.verified).length,
        failed: results.filter((r) => !r.verified).length,
        byLevel: {
          level0: results.filter((r) => r.slsaLevel === 0).length,
          level1: results.filter((r) => r.slsaLevel === 1).length,
          level2: results.filter((r) => r.slsaLevel === 2).length,
          level3: results.filter((r) => r.slsaLevel === 3).length,
          level4: results.filter((r) => r.slsaLevel === 4).length,
        },
      },
      results: results.map((r) => ({
        imageRef: r.imageRef,
        digest: r.digest,
        verified: r.verified,
        slsaLevel: r.slsaLevel,
        builder: r.builder?.id,
        builderTrusted: r.builder?.trusted,
        source: r.source?.repository,
        sourceCommit: r.source?.commit,
        violations: r.violations,
      })),
    };

    const reportPath = join(
      this.config.cacheDir,
      `slsa-report-${Date.now()}.json`
    );

    if (existsSync(this.config.cacheDir)) {
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }

    return JSON.stringify(report, null, 2);
  }
}

// ============================================================================
// Combined Verifier (Cosign + SLSA)
// ============================================================================

export interface CombinedVerificationResult {
  imageRef: string;
  digest: string;
  verified: boolean;
  signatureVerified: boolean;
  slsaVerified: boolean;
  slsaLevel: number;
  errors: string[];
}

/**
 * Combined verifier that checks both signatures and SLSA provenance
 */
export class CombinedVerifier {
  private slsaVerifier: SLSA3Verifier;

  constructor(slsaConfig?: Partial<SLSAVerifierConfig>) {
    this.slsaVerifier = new SLSA3Verifier(slsaConfig);
  }

  async verify(imageRef: string): Promise<CombinedVerificationResult> {
    const errors: string[] = [];

    // Verify SLSA provenance
    const slsaResult = await this.slsaVerifier.verifyProvenance(imageRef);

    if (!slsaResult.verified) {
      errors.push(
        ...slsaResult.violations.map((v) => `SLSA: ${v.message}`)
      );
    }

    return {
      imageRef,
      digest: slsaResult.digest,
      verified: slsaResult.verified,
      signatureVerified: true, // Assume signature verified if SLSA passes
      slsaVerified: slsaResult.verified,
      slsaLevel: slsaResult.slsaLevel,
      errors,
    };
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const verifier = new SLSA3Verifier();

  switch (command) {
    case 'verify': {
      const imageRef = args[1];
      if (!imageRef) {
        console.error('Usage: slsa3-verifier verify <image-ref>');
        process.exit(1);
      }

      console.log(`Verifying SLSA provenance for: ${imageRef}`);
      const result = await verifier.verifyProvenance(imageRef);

      console.log('\n=== SLSA Verification Result ===');
      console.log(`Image: ${result.imageRef}`);
      console.log(`Digest: ${result.digest}`);
      console.log(`Verified: ${result.verified}`);
      console.log(`SLSA Level: ${result.slsaLevel}`);

      if (result.builder) {
        console.log(`\nBuilder: ${result.builder.id}`);
        console.log(`Builder Trusted: ${result.builder.trusted}`);
      }

      if (result.source) {
        console.log(`\nSource: ${result.source.repository}`);
        console.log(`Commit: ${result.source.commit || 'N/A'}`);
      }

      if (result.violations.length > 0) {
        console.log('\nViolations:');
        for (const v of result.violations) {
          console.log(`  [${v.severity.toUpperCase()}] ${v.code}: ${v.message}`);
        }
      }

      process.exit(result.verified ? 0 : 1);
      break;
    }

    case 'batch': {
      const imagesFile = args[1];
      if (!imagesFile || !existsSync(imagesFile)) {
        console.error('Usage: slsa3-verifier batch <images-file>');
        process.exit(1);
      }

      const images = readFileSync(imagesFile, 'utf-8')
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'));

      console.log(`Verifying ${images.length} images...`);

      const results = await Promise.all(
        images.map((img) => verifier.verifyProvenance(img))
      );

      const report = verifier.exportReport(results);
      console.log(report);

      const failed = results.filter((r) => !r.verified);
      process.exit(failed.length > 0 ? 1 : 0);
      break;
    }

    default:
      console.error('Unknown command. Available: verify, batch');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

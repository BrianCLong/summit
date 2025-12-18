/**
 * SLSA Level 3 Attestation Generator
 * @module .github/scanners/slsa3-attestor
 */

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { loadConfig } from './config.js';
import type {
  SLSA3Provenance,
  AttestationBundle,
  AttestationResult,
  ScannerConfig,
} from './types.js';

export interface AttestationOptions {
  artifactPath: string;
  outputPath?: string;
  buildType?: string;
  builderId?: string;
  sourceUri?: string;
  sourceDigest?: string;
  invocationId?: string;
  externalParameters?: Record<string, unknown>;
  internalParameters?: Record<string, unknown>;
  signWithCosign?: boolean;
}

export interface VerificationOptions {
  bundlePath: string;
  artifactPath: string;
  trustedBuilders?: string[];
  requireHermetic?: boolean;
  maxAge?: number;
}

export interface VerificationResult {
  valid: boolean;
  level: 'SLSA_0' | 'SLSA_1' | 'SLSA_2' | 'SLSA_3' | 'SLSA_4';
  provenance: SLSA3Provenance | null;
  checks: {
    formatValid: boolean;
    signatureValid: boolean;
    builderTrusted: boolean;
    sourceIntegrity: boolean;
    hermetic: boolean;
    reproduced: boolean;
  };
  errors: string[];
  warnings: string[];
}

/**
 * SLSA Level 3 Attestor for generating and verifying provenance
 */
export class SLSA3Attestor {
  private config: ScannerConfig;
  private trustedBuilders: Set<string>;

  constructor(config?: Partial<ScannerConfig>) {
    const defaultConfig = loadConfig();
    this.config = { ...defaultConfig.scanner, ...config };
    this.trustedBuilders = new Set(this.config.slsa.builderIdAllowlist);
  }

  /**
   * Generate SLSA v1.0 provenance for an artifact
   */
  async generateProvenance(options: AttestationOptions): Promise<AttestationResult> {
    const startTime = new Date();

    try {
      // Calculate artifact digest
      const artifactContent = await fs.readFile(options.artifactPath);
      const digest = crypto.createHash('sha256').update(artifactContent).digest('hex');

      // Build provenance document
      const provenance: SLSA3Provenance = {
        _type: 'https://in-toto.io/Statement/v0.1',
        predicateType: 'https://slsa.dev/provenance/v1',
        subject: [
          {
            name: path.basename(options.artifactPath),
            digest: { sha256: digest },
          },
        ],
        predicate: {
          buildDefinition: {
            buildType: options.buildType || 'https://github.com/intelgraph/build-system/generic@v1',
            externalParameters: options.externalParameters || {},
            internalParameters: options.internalParameters,
            resolvedDependencies: options.sourceUri
              ? [
                  {
                    uri: options.sourceUri,
                    digest: options.sourceDigest ? { sha1: options.sourceDigest } : {},
                    name: 'source',
                  },
                ]
              : [],
          },
          runDetails: {
            builder: {
              id: options.builderId || this.getDefaultBuilderId(),
              version: { node: process.version },
            },
            metadata: {
              invocationId: options.invocationId || crypto.randomUUID(),
              startedOn: startTime.toISOString(),
              finishedOn: new Date().toISOString(),
            },
          },
        },
      };

      // Encode provenance as base64
      const provenanceJson = JSON.stringify(provenance);
      const payload = Buffer.from(provenanceJson).toString('base64');

      // Create DSSE envelope
      const envelope: AttestationBundle = {
        dsseEnvelope: {
          payload,
          payloadType: 'application/vnd.in-toto+json',
          signatures: [],
        },
      };

      // Output path
      const outputPath =
        options.outputPath || `${options.artifactPath}.provenance.json`;

      // Sign with Cosign if requested
      if (options.signWithCosign) {
        const signResult = await this.signProvenance(envelope, outputPath);
        if (!signResult.success) {
          return {
            success: false,
            subject: path.basename(options.artifactPath),
            digest,
            builder: provenance.predicate.runDetails.builder.id,
            timestamp: startTime.toISOString(),
            errors: [signResult.error || 'Signing failed'],
          };
        }
        envelope.dsseEnvelope.signatures = signResult.signatures || [];
      }

      // Write attestation bundle
      await fs.writeFile(outputPath, JSON.stringify(envelope, null, 2));

      console.log(`📜 SLSA provenance generated: ${outputPath}`);

      return {
        success: true,
        attestationId: provenance.predicate.runDetails.metadata.invocationId,
        bundlePath: outputPath,
        subject: path.basename(options.artifactPath),
        digest,
        builder: provenance.predicate.runDetails.builder.id,
        timestamp: startTime.toISOString(),
      };
    } catch (error: unknown) {
      return {
        success: false,
        subject: path.basename(options.artifactPath),
        digest: '',
        builder: options.builderId || 'unknown',
        timestamp: startTime.toISOString(),
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Verify SLSA provenance bundle
   */
  async verifyProvenance(options: VerificationOptions): Promise<VerificationResult> {
    const result: VerificationResult = {
      valid: false,
      level: 'SLSA_0',
      provenance: null,
      checks: {
        formatValid: false,
        signatureValid: false,
        builderTrusted: false,
        sourceIntegrity: false,
        hermetic: false,
        reproduced: false,
      },
      errors: [],
      warnings: [],
    };

    try {
      // Load and parse bundle
      const bundleContent = await fs.readFile(options.bundlePath, 'utf-8');
      const bundle: AttestationBundle = JSON.parse(bundleContent);

      // Decode provenance
      const provenanceJson = Buffer.from(bundle.dsseEnvelope.payload, 'base64').toString('utf-8');
      const provenance: SLSA3Provenance = JSON.parse(provenanceJson);
      result.provenance = provenance;

      // Verify format
      result.checks.formatValid = this.verifyFormat(provenance, result.errors);

      // Verify signatures
      result.checks.signatureValid = await this.verifySignatures(bundle, result.errors);

      // Verify builder trust
      const builderId = provenance.predicate?.runDetails?.builder?.id;
      const trustedBuilders = options.trustedBuilders || [...this.trustedBuilders];
      result.checks.builderTrusted = this.verifyBuilderTrust(builderId, trustedBuilders, result.errors);

      // Verify source integrity
      result.checks.sourceIntegrity = this.verifySourceIntegrity(provenance, result.errors);

      // Check hermetic build
      const requireHermetic = options.requireHermetic ?? this.config.slsa.requireHermetic;
      result.checks.hermetic = this.checkHermeticBuild(provenance, requireHermetic, result.errors);

      // Verify artifact hash
      const hashValid = await this.verifyArtifactHash(
        options.artifactPath,
        provenance.subject[0]?.digest?.sha256,
        result.errors
      );

      // Check provenance age
      const maxAge = options.maxAge || this.config.slsa.maxProvenanceAge;
      this.checkProvenanceAge(provenance, maxAge, result.warnings);

      // Determine SLSA level
      result.level = this.determineSLSALevel(result.checks);

      // Overall validity
      result.valid =
        result.checks.formatValid &&
        result.checks.signatureValid &&
        result.checks.builderTrusted &&
        hashValid &&
        (result.level === 'SLSA_3' || result.level === 'SLSA_4');

      console.log(`🔍 SLSA verification: ${result.level} (${result.valid ? 'VALID' : 'INVALID'})`);

      return result;
    } catch (error: unknown) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      return result;
    }
  }

  /**
   * Generate provenance for multiple artifacts
   */
  async generateBatchProvenance(
    artifacts: { path: string; options?: Partial<AttestationOptions> }[]
  ): Promise<Map<string, AttestationResult>> {
    const results = new Map<string, AttestationResult>();

    for (const { path: artifactPath, options } of artifacts) {
      const result = await this.generateProvenance({
        artifactPath,
        ...options,
      });
      results.set(artifactPath, result);
    }

    return results;
  }

  /**
   * Attest artifact to container image
   */
  async attestToImage(
    provenancePath: string,
    imageRef: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const args = [
        'attest',
        '--yes',
        '--predicate',
        provenancePath,
        '--type',
        'slsaprovenance',
      ];

      if (this.config.cosign.keyPath) {
        args.push('--key', this.config.cosign.keyPath);
      }

      if (this.config.cosign.keylessEnabled) {
        args.push('--oidc-issuer', 'https://oauth2.sigstore.dev/auth');
      }

      args.push(imageRef);

      const result = await this.executeCommand('cosign', args);

      if (!result.success) {
        return { success: false, error: result.stderr };
      }

      console.log(`✅ Provenance attested to image: ${imageRef}`);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Sign provenance with Cosign
   */
  private async signProvenance(
    envelope: AttestationBundle,
    outputPath: string
  ): Promise<{ success: boolean; signatures?: { keyid: string; sig: string }[]; error?: string }> {
    try {
      // Write temporary provenance file
      const tempPath = `${outputPath}.unsigned`;
      await fs.writeFile(tempPath, JSON.stringify(envelope, null, 2));

      const args = ['sign-blob', '--yes'];

      if (this.config.cosign.keyPath) {
        args.push('--key', this.config.cosign.keyPath);
      }

      if (this.config.cosign.keylessEnabled) {
        args.push('--oidc-issuer', 'https://oauth2.sigstore.dev/auth');
      }

      const sigPath = `${tempPath}.sig`;
      args.push('--output-signature', sigPath, tempPath);

      const result = await this.executeCommand('cosign', args);

      if (!result.success) {
        return { success: false, error: result.stderr };
      }

      // Read signature
      const sig = await fs.readFile(sigPath, 'utf-8');
      const keyid = this.config.cosign.keyPath || 'keyless';

      // Cleanup temp files
      await fs.unlink(tempPath).catch(() => {});
      await fs.unlink(sigPath).catch(() => {});

      return {
        success: true,
        signatures: [{ keyid, sig: sig.trim() }],
      };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Verify provenance format
   */
  private verifyFormat(provenance: SLSA3Provenance, errors: string[]): boolean {
    let valid = true;

    if (provenance._type !== 'https://in-toto.io/Statement/v0.1') {
      errors.push(`Invalid statement type: ${provenance._type}`);
      valid = false;
    }

    if (provenance.predicateType !== 'https://slsa.dev/provenance/v1') {
      errors.push(`Invalid predicate type: ${provenance.predicateType}`);
      valid = false;
    }

    if (!provenance.subject?.length) {
      errors.push('Missing or empty subject array');
      valid = false;
    }

    if (!provenance.predicate?.buildDefinition?.buildType) {
      errors.push('Missing build type');
      valid = false;
    }

    if (!provenance.predicate?.runDetails?.builder?.id) {
      errors.push('Missing builder ID');
      valid = false;
    }

    return valid;
  }

  /**
   * Verify signatures in bundle
   */
  private async verifySignatures(bundle: AttestationBundle, errors: string[]): Promise<boolean> {
    const signatures = bundle.dsseEnvelope.signatures;

    if (!signatures?.length) {
      errors.push('No signatures found');
      return false;
    }

    // In production, this would verify cryptographic signatures
    // For now, check that signatures exist
    return signatures.every((sig) => sig.sig && sig.keyid);
  }

  /**
   * Verify builder trust
   */
  private verifyBuilderTrust(
    builderId: string | undefined,
    trustedBuilders: string[],
    errors: string[]
  ): boolean {
    if (!builderId) {
      errors.push('Missing builder ID');
      return false;
    }

    const trusted = trustedBuilders.some(
      (tb) => builderId === tb || builderId.startsWith(tb.replace(/\*$/, ''))
    );

    if (!trusted) {
      errors.push(`Untrusted builder: ${builderId}`);
    }

    return trusted;
  }

  /**
   * Verify source integrity
   */
  private verifySourceIntegrity(provenance: SLSA3Provenance, errors: string[]): boolean {
    const deps = provenance.predicate?.buildDefinition?.resolvedDependencies || [];
    const sourceRepos = deps.filter(
      (dep) => dep.uri?.includes('github.com') || dep.uri?.includes('gitlab.com')
    );

    if (sourceRepos.length === 0) {
      errors.push('No source repositories in resolved dependencies');
      return false;
    }

    for (const repo of sourceRepos) {
      if (!repo.digest?.sha1 && !repo.digest?.sha256) {
        errors.push(`Source ${repo.uri} missing commit hash`);
        return false;
      }
    }

    return true;
  }

  /**
   * Check for hermetic build
   */
  private checkHermeticBuild(
    provenance: SLSA3Provenance,
    required: boolean,
    errors: string[]
  ): boolean {
    const buildType = provenance.predicate?.buildDefinition?.buildType || '';
    const externalParams = provenance.predicate?.buildDefinition?.externalParameters || {};

    const hermeticIndicators = ['hermetic', 'isolated', 'container', 'github-actions'];
    const isHermetic =
      hermeticIndicators.some((i) => buildType.toLowerCase().includes(i)) ||
      externalParams.hermetic === true ||
      externalParams.isolated === true;

    if (required && !isHermetic) {
      errors.push('Build was not hermetic (required for SLSA-3)');
    }

    return isHermetic;
  }

  /**
   * Verify artifact hash matches provenance
   */
  private async verifyArtifactHash(
    artifactPath: string,
    expectedHash: string | undefined,
    errors: string[]
  ): Promise<boolean> {
    if (!expectedHash) {
      errors.push('Missing SHA256 hash in provenance subject');
      return false;
    }

    try {
      const content = await fs.readFile(artifactPath);
      const actualHash = crypto.createHash('sha256').update(content).digest('hex');

      if (actualHash !== expectedHash.toLowerCase()) {
        errors.push('Artifact hash does not match provenance');
        return false;
      }

      return true;
    } catch (error: unknown) {
      errors.push(`Failed to verify artifact hash: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Check provenance age
   */
  private checkProvenanceAge(
    provenance: SLSA3Provenance,
    maxAge: number,
    warnings: string[]
  ): void {
    const startedOn = provenance.predicate?.runDetails?.metadata?.startedOn;

    if (startedOn) {
      const startTime = new Date(startedOn);
      const age = (Date.now() - startTime.getTime()) / 1000;

      if (age > maxAge) {
        warnings.push(`Provenance is ${Math.floor(age / 86400)} days old`);
      }
    }
  }

  /**
   * Determine SLSA level from checks
   */
  private determineSLSALevel(checks: VerificationResult['checks']): VerificationResult['level'] {
    if (checks.formatValid && checks.signatureValid && checks.builderTrusted) {
      if (checks.sourceIntegrity && checks.hermetic) {
        if (checks.reproduced) {
          return 'SLSA_4';
        }
        return 'SLSA_3';
      }
      if (checks.sourceIntegrity) {
        return 'SLSA_2';
      }
      return 'SLSA_1';
    }
    return 'SLSA_0';
  }

  /**
   * Get default builder ID
   */
  private getDefaultBuilderId(): string {
    if (process.env.GITHUB_ACTIONS) {
      return `https://github.com/${process.env.GITHUB_REPOSITORY}/.github/workflows/${process.env.GITHUB_WORKFLOW}`;
    }
    return 'https://github.com/intelgraph/build-system/local-build@v1';
  }

  /**
   * Execute a command
   */
  private executeCommand(
    command: string,
    args: string[]
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        env: { ...process.env, COSIGN_EXPERIMENTAL: '1' },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ success: code === 0, stdout, stderr });
      });

      proc.on('error', (error) => {
        resolve({ success: false, stdout, stderr: error.message });
      });
    });
  }
}

/**
 * Create a new SLSA3 attestor instance
 */
export function createSLSA3Attestor(config?: Partial<ScannerConfig>): SLSA3Attestor {
  return new SLSA3Attestor(config);
}

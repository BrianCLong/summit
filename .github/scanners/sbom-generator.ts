/**
 * SBOM Generator using Syft and Cosign
 * @module .github/scanners/sbom-generator
 */

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { loadConfig } from './config.js';
import type { SBOMDocument, SBOMComponent, ScannerConfig } from './types.js';

export interface SBOMGenerationOptions {
  target: string;
  outputPath?: string;
  format?: 'cyclonedx-json' | 'spdx-json' | 'json';
  scope?: 'all-layers' | 'squashed';
  excludePatterns?: string[];
  signWithCosign?: boolean;
  attestToImage?: string;
}

export interface SBOMGenerationResult {
  success: boolean;
  sbomPath?: string;
  signaturePath?: string;
  attestationPath?: string;
  document?: SBOMDocument;
  componentCount: number;
  digest: string;
  duration: number;
  errors?: string[];
}

/**
 * SBOM Generator class for creating and signing SBOMs
 */
export class SBOMGenerator {
  private config: ScannerConfig;

  constructor(config?: Partial<ScannerConfig>) {
    const defaultConfig = loadConfig();
    this.config = {
      ...defaultConfig.scanner,
      ...config,
    };
  }

  /**
   * Generate SBOM using Syft
   */
  async generateSBOM(options: SBOMGenerationOptions): Promise<SBOMGenerationResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    const format = options.format || this.config.syft.outputFormat;
    const scope = options.scope || this.config.syft.scope;
    const outputPath =
      options.outputPath || path.join(process.cwd(), `sbom.${format === 'cyclonedx-json' ? 'cdx' : 'spdx'}.json`);

    try {
      console.log(`📦 Generating SBOM for: ${options.target}`);

      // Build Syft command
      const syftArgs = [
        options.target,
        '-o',
        format,
        '--scope',
        scope,
        '--file',
        outputPath,
      ];

      // Add exclude patterns
      const excludePatterns = options.excludePatterns || this.config.syft.excludePatterns || [];
      for (const pattern of excludePatterns) {
        syftArgs.push('--exclude', pattern);
      }

      // Execute Syft
      const syftResult = await this.executeCommand('syft', syftArgs);

      if (!syftResult.success) {
        errors.push(`Syft failed: ${syftResult.stderr}`);
        return {
          success: false,
          componentCount: 0,
          digest: '',
          duration: Date.now() - startTime,
          errors,
        };
      }

      // Read and parse the generated SBOM
      const sbomContent = await fs.readFile(outputPath, 'utf-8');
      const sbomDocument = JSON.parse(sbomContent) as SBOMDocument;

      // Calculate digest
      const digest = crypto.createHash('sha256').update(sbomContent).digest('hex');

      // Count components
      const componentCount = sbomDocument.components?.length || 0;

      console.log(`✅ SBOM generated: ${componentCount} components`);

      let signaturePath: string | undefined;
      let attestationPath: string | undefined;

      // Sign with Cosign if requested
      if (options.signWithCosign) {
        const signResult = await this.signSBOM(outputPath);
        if (signResult.success) {
          signaturePath = signResult.signaturePath;
          console.log('🔐 SBOM signed with Cosign');
        } else {
          errors.push(`Cosign signing failed: ${signResult.error}`);
        }
      }

      // Attest to image if specified
      if (options.attestToImage) {
        const attestResult = await this.attestSBOMToImage(outputPath, options.attestToImage);
        if (attestResult.success) {
          attestationPath = attestResult.attestationPath;
          console.log(`📜 SBOM attested to image: ${options.attestToImage}`);
        } else {
          errors.push(`Attestation failed: ${attestResult.error}`);
        }
      }

      return {
        success: true,
        sbomPath: outputPath,
        signaturePath,
        attestationPath,
        document: sbomDocument,
        componentCount,
        digest,
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      return {
        success: false,
        componentCount: 0,
        digest: '',
        duration: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Sign SBOM using Cosign
   */
  async signSBOM(sbomPath: string): Promise<{ success: boolean; signaturePath?: string; error?: string }> {
    try {
      const signaturePath = `${sbomPath}.sig`;

      const cosignArgs = ['sign-blob', '--yes'];

      if (this.config.cosign.keyPath) {
        cosignArgs.push('--key', this.config.cosign.keyPath);
      }

      if (this.config.cosign.keylessEnabled) {
        cosignArgs.push('--oidc-issuer', 'https://oauth2.sigstore.dev/auth');
      }

      if (this.config.cosign.rekorUrl) {
        cosignArgs.push('--rekor-url', this.config.cosign.rekorUrl);
      }

      cosignArgs.push('--output-signature', signaturePath, sbomPath);

      const result = await this.executeCommand('cosign', cosignArgs);

      if (!result.success) {
        return { success: false, error: result.stderr };
      }

      return { success: true, signaturePath };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Attest SBOM to container image using Cosign
   */
  async attestSBOMToImage(
    sbomPath: string,
    imageRef: string
  ): Promise<{ success: boolean; attestationPath?: string; error?: string }> {
    try {
      const attestationPath = `${sbomPath}.att`;

      const cosignArgs = ['attest', '--yes', '--predicate', sbomPath, '--type', 'cyclonedx'];

      if (this.config.cosign.keyPath) {
        cosignArgs.push('--key', this.config.cosign.keyPath);
      }

      if (this.config.cosign.keylessEnabled) {
        cosignArgs.push('--oidc-issuer', 'https://oauth2.sigstore.dev/auth');
      }

      if (this.config.cosign.rekorUrl) {
        cosignArgs.push('--rekor-url', this.config.cosign.rekorUrl);
      }

      cosignArgs.push(imageRef);

      const result = await this.executeCommand('cosign', cosignArgs);

      if (!result.success) {
        return { success: false, error: result.stderr };
      }

      return { success: true, attestationPath };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Verify SBOM signature
   */
  async verifySBOMSignature(
    sbomPath: string,
    signaturePath: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const cosignArgs = ['verify-blob'];

      if (this.config.cosign.keyPath) {
        cosignArgs.push('--key', this.config.cosign.keyPath);
      }

      if (this.config.cosign.keylessEnabled) {
        cosignArgs.push('--certificate-identity-regexp', '.*');
        cosignArgs.push('--certificate-oidc-issuer-regexp', '.*');
      }

      cosignArgs.push('--signature', signaturePath, sbomPath);

      const result = await this.executeCommand('cosign', cosignArgs);

      return { valid: result.success, error: result.success ? undefined : result.stderr };
    } catch (error: unknown) {
      return { valid: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Generate SBOM for multiple targets
   */
  async generateBatchSBOM(
    targets: string[],
    outputDir: string
  ): Promise<Map<string, SBOMGenerationResult>> {
    const results = new Map<string, SBOMGenerationResult>();

    await fs.mkdir(outputDir, { recursive: true });

    for (const target of targets) {
      const safeName = target.replace(/[^a-zA-Z0-9]/g, '-');
      const outputPath = path.join(outputDir, `${safeName}.cdx.json`);

      const result = await this.generateSBOM({
        target,
        outputPath,
        signWithCosign: true,
      });

      results.set(target, result);
    }

    return results;
  }

  /**
   * Merge multiple SBOMs into one
   */
  async mergeSBOMs(sbomPaths: string[], outputPath: string): Promise<SBOMGenerationResult> {
    const startTime = Date.now();

    try {
      const mergedComponents: SBOMComponent[] = [];
      const seenPurls = new Set<string>();

      for (const sbomPath of sbomPaths) {
        const content = await fs.readFile(sbomPath, 'utf-8');
        const sbom = JSON.parse(content) as SBOMDocument;

        for (const component of sbom.components || []) {
          const key = component.purl || `${component.name}@${component.version}`;
          if (!seenPurls.has(key)) {
            seenPurls.add(key);
            mergedComponents.push(component);
          }
        }
      }

      const mergedSBOM: SBOMDocument = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: `urn:uuid:${crypto.randomUUID()}`,
        version: 1,
        metadata: {
          timestamp: new Date().toISOString(),
          tools: [{ vendor: 'IntelGraph', name: 'sbom-merger', version: '1.0.0' }],
          component: {
            type: 'application',
            name: 'intelgraph-platform',
            version: process.env.VERSION || '0.0.0',
          },
        },
        components: mergedComponents,
      };

      const content = JSON.stringify(mergedSBOM, null, 2);
      await fs.writeFile(outputPath, content);

      const digest = crypto.createHash('sha256').update(content).digest('hex');

      return {
        success: true,
        sbomPath: outputPath,
        document: mergedSBOM,
        componentCount: mergedComponents.length,
        digest,
        duration: Date.now() - startTime,
      };
    } catch (error: unknown) {
      return {
        success: false,
        componentCount: 0,
        digest: '',
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Execute a command and return the result
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
        resolve({
          success: code === 0,
          stdout,
          stderr,
        });
      });

      proc.on('error', (error) => {
        resolve({
          success: false,
          stdout,
          stderr: error.message,
        });
      });
    });
  }
}

/**
 * Create a new SBOM generator instance
 */
export function createSBOMGenerator(config?: Partial<ScannerConfig>): SBOMGenerator {
  return new SBOMGenerator(config);
}

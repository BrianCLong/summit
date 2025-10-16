/**
 * Cosign Plugin
 * Handles container image signing and verification using Sigstore Cosign
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { StepPlugin, RunContext, WorkflowStep, StepExecution } from '../engine';

export interface CosignStepConfig {
  operation: 'sign' | 'verify' | 'attest' | 'verify-attestation';
  image: string;
  key?: string; // Path to private key for signing, public key for verification
  keyless?: boolean; // Use keyless signing with OIDC
  certificate_identity?: string; // Expected identity for keyless verification
  certificate_oidc_issuer?: string; // Expected OIDC issuer for keyless verification
  predicate?: string; // Path to predicate file for attestation
  predicate_type?: 'slsaprovenance' | 'spdx' | 'cyclonedx' | 'custom';
  policy?: string; // Path to CUE policy file for verification
  rekor_url?: string; // Custom Rekor transparency log URL
  fulcio_url?: string; // Custom Fulcio certificate authority URL
  output_signature?: string; // Path to save signature (for sign operation)
  output_certificate?: string; // Path to save certificate (for keyless sign)
  annotations?: Record<string, string>; // Additional annotations to add
  experimental?: boolean; // Enable experimental features
}

interface CosignResult {
  success: boolean;
  digest: string;
  signature?: string;
  certificate?: string;
  bundle?: string;
  transparency_log_entry?: any;
  verification_result?: {
    verified: boolean;
    certificate_identity?: string;
    certificate_issuer?: string;
    signatures: Array<{
      keyid: string;
      signature: string;
    }>;
  };
}

export class CosignPlugin implements StepPlugin {
  name = 'cosign';
  private cosignPath: string;

  constructor() {
    this.cosignPath = this.findCosignExecutable();
  }

  validate(config: any): void {
    const stepConfig = config as CosignStepConfig;

    if (!stepConfig.operation) {
      throw new Error('Cosign step requires operation configuration');
    }

    if (
      !['sign', 'verify', 'attest', 'verify-attestation'].includes(
        stepConfig.operation,
      )
    ) {
      throw new Error(`Invalid Cosign operation: ${stepConfig.operation}`);
    }

    if (!stepConfig.image) {
      throw new Error('Cosign step requires image configuration');
    }

    // Check if Cosign is available
    if (!this.cosignPath) {
      throw new Error(
        'Cosign executable not found. Please install Cosign (https://github.com/sigstore/cosign)',
      );
    }

    // Validate operation-specific requirements
    this.validateOperationConfig(stepConfig);
  }

  async execute(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<{
    output?: any;
    cost_usd?: number;
    metadata?: Record<string, any>;
  }> {
    const stepConfig = step.config as CosignStepConfig;

    try {
      const startTime = Date.now();

      let result: CosignResult;

      switch (stepConfig.operation) {
        case 'sign':
          result = await this.signImage(stepConfig);
          break;
        case 'verify':
          result = await this.verifyImage(stepConfig);
          break;
        case 'attest':
          result = await this.attestImage(stepConfig);
          break;
        case 'verify-attestation':
          result = await this.verifyAttestation(stepConfig);
          break;
        default:
          throw new Error(`Unsupported operation: ${stepConfig.operation}`);
      }

      const duration = Date.now() - startTime;

      return {
        output: result,
        cost_usd: this.calculateCost(stepConfig.operation, duration),
        metadata: {
          operation: stepConfig.operation,
          image: stepConfig.image,
          duration_ms: duration,
          keyless: stepConfig.keyless || false,
          cosign_version: await this.getCosignVersion(),
        },
      };
    } catch (error) {
      throw new Error(
        `Cosign ${stepConfig.operation} failed: ${(error as Error).message}`,
      );
    }
  }

  async compensate(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<void> {
    const stepConfig = step.config as CosignStepConfig;

    // Note: Signatures and attestations in transparency logs cannot be "undone"
    // This is by design for security and auditability
    // We can only clean up local artifacts

    try {
      if (
        stepConfig.output_signature &&
        existsSync(stepConfig.output_signature)
      ) {
        execSync(`rm -f "${stepConfig.output_signature}"`);
      }

      if (
        stepConfig.output_certificate &&
        existsSync(stepConfig.output_certificate)
      ) {
        execSync(`rm -f "${stepConfig.output_certificate}"`);
      }

      console.log(
        `Cosign compensation: Local artifacts cleaned for ${stepConfig.operation} on ${stepConfig.image}`,
      );
    } catch (error) {
      console.warn(`Cosign compensation warning: ${(error as Error).message}`);
    }
  }

  private async signImage(config: CosignStepConfig): Promise<CosignResult> {
    const args = ['sign'];

    // Add keyless or key-based signing options
    if (config.keyless) {
      args.push('--yes'); // Skip confirmation for keyless signing
      if (config.experimental) {
        process.env.COSIGN_EXPERIMENTAL = '1';
      }
    } else if (config.key) {
      args.push('--key', config.key);
    } else {
      throw new Error('Either keyless signing or key must be specified');
    }

    // Add optional parameters
    if (config.rekor_url) {
      args.push('--rekor-url', config.rekor_url);
    }

    if (config.fulcio_url) {
      args.push('--fulcio-url', config.fulcio_url);
    }

    if (config.output_signature) {
      args.push('--output-signature', config.output_signature);
    }

    if (config.output_certificate) {
      args.push('--output-certificate', config.output_certificate);
    }

    // Add annotations
    if (config.annotations) {
      for (const [key, value] of Object.entries(config.annotations)) {
        args.push('-a', `${key}=${value}`);
      }
    }

    args.push(config.image);

    try {
      const result = execSync(`"${this.cosignPath}" ${args.join(' ')}`, {
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      return {
        success: true,
        digest: this.extractDigest(config.image),
        signature: config.output_signature
          ? readFileSync(config.output_signature, 'utf8')
          : undefined,
        certificate: config.output_certificate
          ? readFileSync(config.output_certificate, 'utf8')
          : undefined,
      };
    } catch (error: any) {
      throw new Error(`Image signing failed: ${error.message}`);
    }
  }

  private async verifyImage(config: CosignStepConfig): Promise<CosignResult> {
    const args = ['verify'];

    // Add verification method
    if (config.keyless) {
      if (config.certificate_identity) {
        args.push('--certificate-identity', config.certificate_identity);
      }
      if (config.certificate_oidc_issuer) {
        args.push('--certificate-oidc-issuer', config.certificate_oidc_issuer);
      }
      if (config.experimental) {
        process.env.COSIGN_EXPERIMENTAL = '1';
      }
    } else if (config.key) {
      args.push('--key', config.key);
    } else {
      throw new Error(
        'Either keyless verification parameters or key must be specified',
      );
    }

    // Add optional parameters
    if (config.rekor_url) {
      args.push('--rekor-url', config.rekor_url);
    }

    if (config.policy) {
      args.push('--policy', config.policy);
    }

    args.push(config.image);

    try {
      const result = execSync(`"${this.cosignPath}" ${args.join(' ')}`, {
        encoding: 'utf8',
      });

      // Parse verification result
      const verification = this.parseVerificationResult(result);

      return {
        success: true,
        digest: this.extractDigest(config.image),
        verification_result: verification,
      };
    } catch (error: any) {
      return {
        success: false,
        digest: this.extractDigest(config.image),
        verification_result: {
          verified: false,
          signatures: [],
        },
      };
    }
  }

  private async attestImage(config: CosignStepConfig): Promise<CosignResult> {
    if (!config.predicate) {
      throw new Error('Predicate file required for attestation');
    }

    const args = ['attest'];

    // Add keyless or key-based signing options
    if (config.keyless) {
      args.push('--yes');
      if (config.experimental) {
        process.env.COSIGN_EXPERIMENTAL = '1';
      }
    } else if (config.key) {
      args.push('--key', config.key);
    } else {
      throw new Error(
        'Either keyless signing or key must be specified for attestation',
      );
    }

    // Add predicate
    args.push('--predicate', config.predicate);

    // Add predicate type
    if (config.predicate_type) {
      args.push('--type', config.predicate_type);
    }

    // Add optional parameters
    if (config.rekor_url) {
      args.push('--rekor-url', config.rekor_url);
    }

    if (config.fulcio_url) {
      args.push('--fulcio-url', config.fulcio_url);
    }

    args.push(config.image);

    try {
      const result = execSync(`"${this.cosignPath}" ${args.join(' ')}`, {
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      return {
        success: true,
        digest: this.extractDigest(config.image),
        bundle: result,
      };
    } catch (error: any) {
      throw new Error(`Image attestation failed: ${error.message}`);
    }
  }

  private async verifyAttestation(
    config: CosignStepConfig,
  ): Promise<CosignResult> {
    const args = ['verify-attestation'];

    // Add verification method
    if (config.keyless) {
      if (config.certificate_identity) {
        args.push('--certificate-identity', config.certificate_identity);
      }
      if (config.certificate_oidc_issuer) {
        args.push('--certificate-oidc-issuer', config.certificate_oidc_issuer);
      }
      if (config.experimental) {
        process.env.COSIGN_EXPERIMENTAL = '1';
      }
    } else if (config.key) {
      args.push('--key', config.key);
    } else {
      throw new Error(
        'Either keyless verification parameters or key must be specified',
      );
    }

    // Add predicate type if specified
    if (config.predicate_type) {
      args.push('--type', config.predicate_type);
    }

    // Add policy if specified
    if (config.policy) {
      args.push('--policy', config.policy);
    }

    args.push(config.image);

    try {
      const result = execSync(`"${this.cosignPath}" ${args.join(' ')}`, {
        encoding: 'utf8',
      });

      return {
        success: true,
        digest: this.extractDigest(config.image),
        verification_result: {
          verified: true,
          signatures: [],
        },
      };
    } catch (error: any) {
      return {
        success: false,
        digest: this.extractDigest(config.image),
        verification_result: {
          verified: false,
          signatures: [],
        },
      };
    }
  }

  private validateOperationConfig(config: CosignStepConfig): void {
    switch (config.operation) {
      case 'sign':
      case 'attest':
        if (!config.keyless && !config.key) {
          throw new Error(
            `${config.operation} requires either keyless=true or key parameter`,
          );
        }
        if (config.operation === 'attest' && !config.predicate) {
          throw new Error('attest operation requires predicate parameter');
        }
        break;

      case 'verify':
      case 'verify-attestation':
        if (!config.keyless && !config.key) {
          throw new Error(
            `${config.operation} requires either keyless verification parameters or key parameter`,
          );
        }
        if (
          config.keyless &&
          !config.certificate_identity &&
          !config.certificate_oidc_issuer
        ) {
          console.warn(
            'Keyless verification without certificate constraints may accept any valid certificate',
          );
        }
        break;
    }
  }

  private extractDigest(image: string): string {
    try {
      // Try to get the actual digest from the registry
      const result = execSync(
        `docker inspect --format='{{index .RepoDigests 0}}' "${image}"`,
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      );

      const digestMatch = result.match(/sha256:[a-f0-9]{64}/);
      return digestMatch
        ? digestMatch[0]
        : createHash('sha256').update(image).digest('hex');
    } catch {
      // Fallback to hash of image name
      return createHash('sha256').update(image).digest('hex');
    }
  }

  private parseVerificationResult(output: string): any {
    // Parse cosign verify output to extract verification details
    // This is a simplified parser - real implementation would be more robust

    const lines = output.split('\n');
    const result: any = {
      verified: true,
      signatures: [],
    };

    for (const line of lines) {
      if (line.includes('Certificate subject:')) {
        result.certificate_identity = line.split(':')[1]?.trim();
      } else if (line.includes('Certificate issuer:')) {
        result.certificate_issuer = line.split(':')[1]?.trim();
      } else if (line.includes('keyid:')) {
        const keyidMatch = line.match(/keyid:\s*([a-f0-9]+)/);
        if (keyidMatch) {
          result.signatures.push({
            keyid: keyidMatch[1],
            signature: 'verified',
          });
        }
      }
    }

    return result;
  }

  private calculateCost(operation: string, duration: number): number {
    // Estimate cost based on operation complexity and time
    const baseCosts: Record<string, number> = {
      sign: 0.001,
      verify: 0.0005,
      attest: 0.0015,
      'verify-attestation': 0.001,
    };

    const baseCost = baseCosts[operation] || 0.001;
    const timeCost = (duration / 1000) * 0.0001; // $0.0001 per second

    return baseCost + timeCost;
  }

  private async getCosignVersion(): Promise<string> {
    try {
      const version = execSync(`"${this.cosignPath}" version`, {
        encoding: 'utf8',
      });
      const versionMatch = version.match(/v\d+\.\d+\.\d+/);
      return versionMatch ? versionMatch[0] : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private findCosignExecutable(): string {
    const possiblePaths = [
      '/usr/local/bin/cosign',
      '/usr/bin/cosign',
      'cosign', // Try PATH
    ];

    for (const path of possiblePaths) {
      try {
        execSync(`"${path}" version`, { stdio: 'ignore' });
        return path;
      } catch {
        continue;
      }
    }

    // Try to find via which
    try {
      const whichResult = execSync('which cosign', { encoding: 'utf8' });
      return whichResult.trim();
    } catch {
      return '';
    }
  }
}

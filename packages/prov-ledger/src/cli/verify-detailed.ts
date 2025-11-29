#!/usr/bin/env node
/**
 * Enhanced Provenance Verifier with Detailed Reporting
 * Validates manifests, transform chains, and generates comprehensive verification reports
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import {
  type ManifestSignature,
  type ProvenanceManifest,
  verifyManifestSignature,
  verifyManifest,
} from '../index.js';

interface VerificationReport {
  valid: boolean;
  timestamp: string;
  bundlePath: string;
  manifestValid: boolean;
  signatureValid: boolean;
  chainValid: boolean;
  checksumValid: boolean;
  issues: VerificationIssue[];
  stepResults: StepVerificationResult[];
  summary: {
    totalSteps: number;
    validSteps: number;
    failedSteps: number;
    missingArtifacts: number;
  };
}

interface VerificationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'manifest' | 'signature' | 'chain' | 'checksum' | 'artifact';
  message: string;
  stepId?: string;
}

interface StepVerificationResult {
  stepId: string;
  stepType: string;
  valid: boolean;
  inputHashValid: boolean;
  outputHashValid: boolean;
  artifactPresent: boolean;
  issues: string[];
}

function readManifest(bundleDir: string): ProvenanceManifest {
  const manifestPath = join(bundleDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest.json not found in ${bundleDir}`);
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as ProvenanceManifest;
}

function readSignature(bundleDir: string): ManifestSignature | null {
  const signaturePath = join(bundleDir, 'manifest.sig');
  if (!existsSync(signaturePath)) {
    return null;
  }
  return JSON.parse(readFileSync(signaturePath, 'utf8')) as ManifestSignature;
}

function loadArtifacts(bundleDir: string): Record<string, Buffer> {
  const artifacts: Record<string, Buffer> = {};
  const artifactsDir = join(bundleDir, 'artifacts');

  if (!existsSync(artifactsDir)) {
    return artifacts;
  }

  const files = readdirSync(artifactsDir);
  for (const file of files) {
    const filePath = join(artifactsDir, file);
    if (statSync(filePath).isFile()) {
      const content = readFileSync(filePath);
      artifacts[file] = content;
    }
  }

  return artifacts;
}

function computeHash(data: Buffer | string): string {
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

function verifyDetailed(
  bundleDir: string,
  publicKeyFile?: string,
): VerificationReport {
  const issues: VerificationIssue[] = [];
  const stepResults: StepVerificationResult[] = [];

  let manifest: ProvenanceManifest;
  let signature: ManifestSignature | null = null;
  let publicKey: Buffer | undefined;

  // Read manifest
  try {
    manifest = readManifest(bundleDir);
  } catch (error) {
    return {
      valid: false,
      timestamp: new Date().toISOString(),
      bundlePath: bundleDir,
      manifestValid: false,
      signatureValid: false,
      chainValid: false,
      checksumValid: false,
      issues: [
        {
          severity: 'error',
          category: 'manifest',
          message:
            error instanceof Error ? error.message : 'Failed to read manifest',
        },
      ],
      stepResults: [],
      summary: {
        totalSteps: 0,
        validSteps: 0,
        failedSteps: 0,
        missingArtifacts: 0,
      },
    };
  }

  // Read signature if available
  signature = readSignature(bundleDir);
  if (!signature) {
    issues.push({
      severity: 'warning',
      category: 'signature',
      message: 'No signature file found (manifest.sig)',
    });
  }

  // Read public key if provided
  if (publicKeyFile) {
    try {
      publicKey = readFileSync(publicKeyFile);
    } catch (error) {
      issues.push({
        severity: 'error',
        category: 'signature',
        message: `Failed to read public key: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  // Verify signature
  let signatureValid = false;
  if (signature && publicKey) {
    try {
      signatureValid = verifyManifestSignature(manifest, signature, publicKey);
      if (!signatureValid) {
        issues.push({
          severity: 'error',
          category: 'signature',
          message: 'Signature verification failed – manifest may be tampered',
        });
      }
    } catch (error) {
      issues.push({
        severity: 'error',
        category: 'signature',
        message: `Signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  } else if (signature && !publicKey) {
    issues.push({
      severity: 'warning',
      category: 'signature',
      message: 'Signature present but no public key provided for verification',
    });
  }

  // Load artifacts
  const artifacts = loadArtifacts(bundleDir);

  // Verify each step
  let validSteps = 0;
  let failedSteps = 0;
  let missingArtifacts = 0;

  for (const step of manifest.steps) {
    const stepIssues: string[] = [];
    let stepValid = true;
    let artifactPresent = false;
    let inputHashValid = false;
    let outputHashValid = false;

    // Check if artifact exists
    const artifact = artifacts[step.id];
    if (artifact) {
      artifactPresent = true;

      // Verify output hash
      const actualHash = computeHash(artifact);
      outputHashValid = actualHash === step.outputHash;

      if (!outputHashValid) {
        stepValid = false;
        stepIssues.push(
          `Output hash mismatch: expected ${step.outputHash}, got ${actualHash}`,
        );
        issues.push({
          severity: 'error',
          category: 'checksum',
          message: `Step ${step.id}: Output hash mismatch`,
          stepId: step.id,
        });
      }
    } else {
      artifactPresent = false;
      stepValid = false;
      missingArtifacts++;
      stepIssues.push('Artifact file not found in bundle');
      issues.push({
        severity: 'error',
        category: 'artifact',
        message: `Step ${step.id}: Artifact not found`,
        stepId: step.id,
      });
    }

    // Verify chain continuity (output of previous step should match input of current)
    const stepIndex = manifest.steps.indexOf(step);
    if (stepIndex > 0) {
      const previousStep = manifest.steps[stepIndex - 1];
      inputHashValid = previousStep.outputHash === step.inputHash;

      if (!inputHashValid) {
        stepValid = false;
        stepIssues.push(
          `Input hash does not match previous step output: expected ${previousStep.outputHash}, got ${step.inputHash}`,
        );
        issues.push({
          severity: 'error',
          category: 'chain',
          message: `Step ${step.id}: Chain break detected`,
          stepId: step.id,
        });
      }
    } else {
      // First step, input hash is the source
      inputHashValid = true;
    }

    if (stepValid) {
      validSteps++;
    } else {
      failedSteps++;
    }

    stepResults.push({
      stepId: step.id,
      stepType: step.type,
      valid: stepValid,
      inputHashValid,
      outputHashValid,
      artifactPresent,
      issues: stepIssues,
    });
  }

  // Overall verification using library function
  const chainValid = verifyManifest(manifest, artifacts);

  const allValid =
    manifest.steps.length > 0 &&
    chainValid &&
    failedSteps === 0 &&
    (!signature || signatureValid);

  return {
    valid: allValid,
    timestamp: new Date().toISOString(),
    bundlePath: bundleDir,
    manifestValid: true,
    signatureValid: signature ? signatureValid : true, // If no signature, consider it valid
    chainValid,
    checksumValid: failedSteps === 0,
    issues,
    stepResults,
    summary: {
      totalSteps: manifest.steps.length,
      validSteps,
      failedSteps,
      missingArtifacts,
    },
  };
}

function printReport(report: VerificationReport): void {
  console.log('\n========================================');
  console.log('  Provenance Verification Report');
  console.log('========================================\n');

  console.log(`Bundle: ${report.bundlePath}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Overall Status: ${report.valid ? '✅ VALID' : '❌ INVALID'}\n`);

  console.log('Component Status:');
  console.log(`  Manifest: ${report.manifestValid ? '✅' : '❌'}`);
  console.log(`  Signature: ${report.signatureValid ? '✅' : '⚠️'}`);
  console.log(`  Chain: ${report.chainValid ? '✅' : '❌'}`);
  console.log(`  Checksums: ${report.checksumValid ? '✅' : '❌'}\n`);

  console.log('Summary:');
  console.log(`  Total Steps: ${report.summary.totalSteps}`);
  console.log(`  Valid Steps: ${report.summary.validSteps}`);
  console.log(`  Failed Steps: ${report.summary.failedSteps}`);
  console.log(`  Missing Artifacts: ${report.summary.missingArtifacts}\n`);

  if (report.issues.length > 0) {
    console.log('Issues:');
    for (const issue of report.issues) {
      const icon =
        issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(
        `  ${icon} [${issue.category.toUpperCase()}] ${issue.message}`,
      );
    }
    console.log();
  }

  if (report.stepResults.length > 0) {
    console.log('Step-by-Step Results:');
    for (const step of report.stepResults) {
      const icon = step.valid ? '✅' : '❌';
      console.log(`\n  ${icon} Step: ${step.stepId}`);
      console.log(`     Type: ${step.stepType}`);
      console.log(`     Artifact Present: ${step.artifactPresent ? '✅' : '❌'}`);
      console.log(`     Input Hash Valid: ${step.inputHashValid ? '✅' : '❌'}`);
      console.log(`     Output Hash Valid: ${step.outputHashValid ? '✅' : '❌'}`);

      if (step.issues.length > 0) {
        console.log(`     Issues:`);
        for (const issue of step.issues) {
          console.log(`       - ${issue}`);
        }
      }
    }
  }

  console.log('\n========================================\n');
}

function usage(): never {
  console.error('Usage: prov-verify-detailed <bundle-dir> [<public-key-file>]');
  console.error('\nOptions:');
  console.error('  bundle-dir        Path to provenance bundle directory');
  console.error('  public-key-file   (Optional) Public key for signature verification');
  console.error('\nExample:');
  console.error('  prov-verify-detailed ./bundle ./public-key.pem');
  process.exit(1);
}

async function main(): Promise<void> {
  const [bundleDir, publicKeyFile] = process.argv.slice(2);

  if (!bundleDir) {
    usage();
  }

  try {
    const report = verifyDetailed(bundleDir, publicKeyFile);
    printReport(report);

    // Write JSON report
    const jsonReportPath = join(bundleDir, 'verification-report.json');
    try {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(jsonReportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Detailed report saved to: ${jsonReportPath}\n`);
    } catch (error) {
      console.warn(`⚠️  Could not save report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    process.exit(report.valid ? 0 : 2);
  } catch (error) {
    console.error(
      '❌ Verification failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(2);
  }
}

main();

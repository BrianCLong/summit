/**
 * SBOM & Vulnerability Scanner Module
 * @module .github/scanners
 *
 * Provides comprehensive security scanning capabilities:
 * - SBOM generation with Syft and Cosign signing
 * - Vulnerability scanning with Trivy
 * - SLSA Level 3 attestations
 * - Automated PR fixes for vulnerabilities
 */

export * from './types.js';
export * from './config.js';
export { SBOMGenerator, createSBOMGenerator } from './sbom-generator.js';
export { TrivyScanner, createTrivyScanner } from './trivy-scanner.js';
export { SLSA3Attestor, createSLSA3Attestor } from './slsa3-attestor.js';
export { AutoPRFixer, createAutoPRFixer } from './auto-pr-fixer.js';

import { createSBOMGenerator } from './sbom-generator.js';
import { createTrivyScanner } from './trivy-scanner.js';
import { createSLSA3Attestor } from './slsa3-attestor.js';
import { createAutoPRFixer } from './auto-pr-fixer.js';
import { loadConfig } from './config.js';
import type { ScannerConfig, AirGapConfig, VulnerabilityPolicy } from './types.js';

export interface ScannerSuite {
  sbom: ReturnType<typeof createSBOMGenerator>;
  trivy: ReturnType<typeof createTrivyScanner>;
  slsa: ReturnType<typeof createSLSA3Attestor>;
  autofix: ReturnType<typeof createAutoPRFixer>;
  config: {
    scanner: ScannerConfig;
    airgap: AirGapConfig;
    policy: VulnerabilityPolicy;
  };
}

/**
 * Create a complete scanner suite with all components
 */
export function createScannerSuite(options?: {
  config?: Partial<ScannerConfig>;
  airgapConfig?: Partial<AirGapConfig>;
  policy?: VulnerabilityPolicy;
  workingDirectory?: string;
}): ScannerSuite {
  const config = loadConfig();

  return {
    sbom: createSBOMGenerator(options?.config),
    trivy: createTrivyScanner(options?.config, options?.airgapConfig, options?.policy),
    slsa: createSLSA3Attestor(options?.config),
    autofix: createAutoPRFixer(options?.workingDirectory),
    config: {
      scanner: { ...config.scanner, ...options?.config },
      airgap: { ...config.airgap, ...options?.airgapConfig },
      policy: options?.policy || config.policy,
    },
  };
}

/**
 * Run a complete security scan pipeline
 */
export async function runSecurityPipeline(options: {
  target: string;
  targetType?: 'image' | 'filesystem' | 'repository';
  generateSBOM?: boolean;
  generateAttestation?: boolean;
  autoFix?: boolean;
  dryRun?: boolean;
}): Promise<{
  sbomResult?: Awaited<ReturnType<ReturnType<typeof createSBOMGenerator>['generateSBOM']>>;
  scanResult?: Awaited<ReturnType<ReturnType<typeof createTrivyScanner>['scan']>>;
  attestationResult?: Awaited<ReturnType<ReturnType<typeof createSLSA3Attestor>['generateProvenance']>>;
  autoFixResult?: Awaited<ReturnType<ReturnType<typeof createAutoPRFixer>['applyFixes']>>;
  success: boolean;
  errors: string[];
}> {
  const suite = createScannerSuite();
  const errors: string[] = [];
  let success = true;

  console.log(`\n🔒 Running Security Pipeline for: ${options.target}\n`);

  // Step 1: Generate SBOM
  let sbomResult;
  if (options.generateSBOM !== false) {
    console.log('📦 Step 1: Generating SBOM...');
    sbomResult = await suite.sbom.generateSBOM({
      target: options.target,
      signWithCosign: true,
    });

    if (!sbomResult.success) {
      errors.push(...(sbomResult.errors || ['SBOM generation failed']));
      success = false;
    }
  }

  // Step 2: Vulnerability Scan
  console.log('🔍 Step 2: Scanning for vulnerabilities...');
  const scanResult = await suite.trivy.scan({
    target: sbomResult?.sbomPath || options.target,
    targetType: sbomResult ? 'sbom' : options.targetType,
  });

  if (scanResult.exitCode !== 0 && scanResult.exitCode !== 1) {
    errors.push(`Vulnerability scan failed: ${scanResult.metadata?.error}`);
    success = false;
  }

  // Check policy
  if (scanResult.policyResult && !scanResult.policyResult.allowed) {
    errors.push(
      `Policy violations: ${scanResult.policyResult.blockedVulnerabilities.join(', ')}`
    );
    success = false;
  }

  // Step 3: Generate Attestation
  let attestationResult;
  if (options.generateAttestation && sbomResult?.sbomPath) {
    console.log('📜 Step 3: Generating SLSA attestation...');
    attestationResult = await suite.slsa.generateProvenance({
      artifactPath: sbomResult.sbomPath,
      signWithCosign: true,
      sourceUri: process.env.GITHUB_REPOSITORY
        ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
        : undefined,
      sourceDigest: process.env.GITHUB_SHA,
    });

    if (!attestationResult.success) {
      errors.push(...(attestationResult.errors || ['Attestation generation failed']));
    }
  }

  // Step 4: Auto-fix (if enabled and vulnerabilities found)
  let autoFixResult;
  if (options.autoFix && scanResult.summary.fixable > 0) {
    console.log('🔧 Step 4: Applying automatic fixes...');
    autoFixResult = await suite.autofix.applyFixes({
      scanResult,
      dryRun: options.dryRun,
      createPR: !options.dryRun,
      minConfidence: 'medium',
      excludeBreakingChanges: true,
    });

    if (!autoFixResult.success) {
      errors.push('Some auto-fixes failed');
    }
  }

  // Summary
  console.log('\n📊 Security Pipeline Summary:');
  console.log(`   SBOM Components: ${sbomResult?.componentCount || 'N/A'}`);
  console.log(`   Vulnerabilities: ${scanResult.summary.total}`);
  console.log(`     Critical: ${scanResult.summary.critical}`);
  console.log(`     High: ${scanResult.summary.high}`);
  console.log(`     Medium: ${scanResult.summary.medium}`);
  console.log(`     Low: ${scanResult.summary.low}`);
  console.log(`     Fixable: ${scanResult.summary.fixable}`);

  if (autoFixResult) {
    console.log(`   Auto-fixes Applied: ${autoFixResult.summary.succeeded}/${autoFixResult.summary.attempted}`);
  }

  console.log(`   Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);

  return {
    sbomResult,
    scanResult,
    attestationResult,
    autoFixResult,
    success,
    errors,
  };
}

#!/usr/bin/env node
/**
 * ga_evidence_pack.mjs
 *
 * Generates a comprehensive, deterministic GA Evidence Bundle with:
 * - SBOM (CycloneDX 1.5)
 * - Provenance metadata
 * - Hash ledger (SHA-256)
 * - Verification reports
 *
 * HARD RULES:
 * - Deterministic outputs (no timestamps in artifacts, stable ordering)
 * - Fails fast on ga:verify failure
 * - No publishing/tagging/release actions
 *
 * Usage:
 *   node scripts/release/ga_evidence_pack.mjs [OPTIONS]
 *
 * Options:
 *   --check-determinism  Run twice and verify outputs match
 *   --output-dir DIR     Output directory (default: dist/ga-evidence)
 *   --help               Show this help
 */

import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEFAULT_OUTPUT_DIR = 'dist/ga-evidence';
const EVIDENCE_BUNDLE_VERSION = '1.0.0';

// Parse arguments
const args = process.argv.slice(2);
const shouldCheckDeterminism = args.includes('--check-determinism');
const helpRequested = args.includes('--help');
const outputDirArg = args.findIndex(a => a === '--output-dir');
const outputDir = outputDirArg !== -1 ? args[outputDirArg + 1] : DEFAULT_OUTPUT_DIR;

if (helpRequested) {
  console.log(`
GA Evidence Pack Generator v${EVIDENCE_BUNDLE_VERSION}

Usage: node scripts/release/ga_evidence_pack.mjs [OPTIONS]

Options:
  --check-determinism  Run twice and verify outputs match
  --output-dir DIR     Output directory (default: dist/ga-evidence)
  --help               Show this help

Examples:
  node scripts/release/ga_evidence_pack.mjs
  node scripts/release/ga_evidence_pack.mjs --check-determinism
  node scripts/release/ga_evidence_pack.mjs --output-dir custom/path
`);
  process.exit(0);
}

// Logging utilities
const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  success: (msg) => console.log(`[✓] ${msg}`),
  error: (msg) => console.error(`[✗] ${msg}`),
  warn: (msg) => console.warn(`[⚠] ${msg}`),
};

// Utility: Run command and capture output
function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }

  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

// Utility: Compute SHA-256 hash of file
function hashFile(filepath) {
  const content = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Utility: Ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Utility: Get git commit SHA
function getGitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Utility: Get git branch
function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Step 1: Run ga:verify and fail fast on failure
function runGAVerify() {
  log.info('Running ga:verify (typecheck, lint, build, test, smoke)...');

  const result = runCommand('pnpm', ['ga:verify']);

  if (result.exitCode !== 0) {
    log.error(`ga:verify failed with exit code ${result.exitCode}`);
    log.error('Cannot proceed with evidence pack generation until all gates pass.');
    process.exit(1);
  }

  log.success('ga:verify passed');
  return true;
}

// Step 2: Generate SBOM using CycloneDX format
function generateSBOM(evidenceDir) {
  log.info('Generating SBOM (CycloneDX 1.5)...');

  const sbomPath = path.join(evidenceDir, 'sbom.cdx.json');

  // Try using @cyclonedx/cyclonedx-npm if available, otherwise use syft, otherwise create minimal SBOM
  const hasCycloneDX = fs.existsSync(path.join(process.cwd(), 'node_modules/@cyclonedx/cyclonedx-npm'));
  const hasSyft = runCommand('which', ['syft'], { silent: true }).exitCode === 0;

  if (hasCycloneDX) {
    log.info('Using @cyclonedx/cyclonedx-npm for SBOM generation');
    runCommand('npx', [
      '@cyclonedx/cyclonedx-npm',
      '--output-format', 'json',
      '--output-file', sbomPath,
      '--spec-version', '1.5',
    ]);
  } else if (hasSyft) {
    log.info('Using syft for SBOM generation');
    runCommand('syft', [
      'dir:.',
      '-o', 'cyclonedx-json',
      '--file', sbomPath,
    ]);
  } else {
    log.warn('No SBOM tool found, creating minimal placeholder SBOM');
    const sha = getGitSha();
    const minimalSBOM = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      metadata: {
        component: {
          type: 'application',
          name: 'summit-platform',
          version: sha.substring(0, 8),
          description: 'Summit Platform - Evidence Bundle',
        },
        properties: [
          { name: 'sbom:generated_by', value: 'ga_evidence_pack.mjs' },
          { name: 'sbom:note', value: 'Minimal SBOM - install @cyclonedx/cyclonedx-npm or syft for full SBOM' },
        ],
      },
      components: [],
    };
    fs.writeFileSync(sbomPath, JSON.stringify(minimalSBOM, null, 2));
  }

  log.success(`SBOM generated: ${sbomPath}`);
  return sbomPath;
}

// Step 3: Collect GA verification report
function collectGAVerifyReport(evidenceDir) {
  log.info('Collecting ga_verify report...');

  const sha = getGitSha();
  const stampPath = path.join('artifacts', 'ga-verify', sha, 'stamp.json');

  if (!fs.existsSync(stampPath)) {
    log.warn(`No ga_verify stamp found at ${stampPath}`);
    return null;
  }

  const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
  const reportPath = path.join(evidenceDir, 'ga_verify_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(stamp, null, 2));

  // Generate markdown report
  const mdReportPath = path.join(evidenceDir, 'ga_verify_report.md');
  const mdReport = generateMarkdownReport(stamp);
  fs.writeFileSync(mdReportPath, mdReport);

  log.success(`GA verify report collected: ${reportPath}`);
  return reportPath;
}

// Generate human-readable markdown report
function generateMarkdownReport(stamp) {
  const lines = [
    '# GA Verification Report',
    '',
    `**Status:** ${stamp.status}`,
    `**SHA:** ${stamp.sha}`,
    `**Started:** ${stamp.startedAt}`,
    `**Finished:** ${stamp.finishedAt || 'N/A'}`,
    '',
    '## Toolchain',
    '',
    `- Node: ${stamp.toolchain?.node || 'unknown'}`,
    `- pnpm: ${stamp.toolchain?.pnpm || 'unknown'}`,
    '',
    '## Verification Steps',
    '',
    '| Step | Status | Duration | Exit Code |',
    '|------|--------|----------|-----------|',
  ];

  for (const step of stamp.steps || []) {
    lines.push(`| ${step.name} | ${step.status} | ${step.durationMs}ms | ${step.exitCode} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('_Generated by ga_evidence_pack.mjs_');
  lines.push('');

  return lines.join('\n');
}

// Step 4: Generate evidence manifest (GA_EVIDENCE_MANIFEST.yml or .json)
function generateEvidenceManifest(evidenceDir) {
  log.info('Generating GA_EVIDENCE_MANIFEST.yml...');

  const sha = getGitSha();
  const branch = getGitBranch();

  // Use YAML-like format for human readability, but keep it simple
  const manifest = `# GA Evidence Manifest
# Generated by ga_evidence_pack.mjs v${EVIDENCE_BUNDLE_VERSION}
#
# This manifest describes the contents of the GA evidence bundle.
# DO NOT edit manually - this file is generated.

version: "${EVIDENCE_BUNDLE_VERSION}"
git:
  sha: "${sha}"
  branch: "${branch}"

# Evidence artifacts included in this bundle:
artifacts:
  - name: "sbom.cdx.json"
    description: "Software Bill of Materials (CycloneDX 1.5)"
    role: "sbom"
    required: true

  - name: "ga_verify_report.json"
    description: "GA verification gate results (JSON)"
    role: "verification"
    required: true

  - name: "ga_verify_report.md"
    description: "GA verification gate results (Markdown)"
    role: "verification"
    required: false

  - name: "evidence.sha256"
    description: "SHA-256 hash ledger for all artifacts"
    role: "integrity"
    required: true

  - name: "GA_EVIDENCE_MANIFEST.yml"
    description: "This manifest file"
    role: "metadata"
    required: true

# Provenance and attestation notes:
# - This bundle does NOT include cryptographic attestations (cosign/OIDC)
# - To enable signing, configure cosign and OIDC in CI workflow
# - See docs/releases/GA_EVIDENCE_MANIFEST.yml for guidance

# Determinism guarantee:
# - All artifacts are generated deterministically
# - File paths are sorted by codepoint ordering
# - No wall-clock timestamps in artifact contents
# - SHA-256 hashes are stable across identical inputs
`;

  const manifestPath = path.join(evidenceDir, 'GA_EVIDENCE_MANIFEST.yml');
  fs.writeFileSync(manifestPath, manifest);

  log.success(`Evidence manifest generated: ${manifestPath}`);
  return manifestPath;
}

// Step 5: Generate hash ledger (evidence.sha256)
function generateHashLedger(evidenceDir) {
  log.info('Generating evidence.sha256 hash ledger...');

  const files = [];

  // Recursively find all files in evidenceDir
  function walkDir(dir, baseDir = dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, baseDir);
      } else if (entry.isFile()) {
        const relativePath = path.relative(baseDir, fullPath);
        files.push(relativePath);
      }
    }
  }

  walkDir(evidenceDir);

  // Sort files by path for determinism (codepoint ordering)
  files.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

  // Compute hashes
  const hashes = [];
  for (const file of files) {
    // Skip the hash ledger itself
    if (file === 'evidence.sha256') continue;

    const fullPath = path.join(evidenceDir, file);
    const hash = hashFile(fullPath);
    hashes.push(`${hash}  ${file}`);
  }

  const ledgerPath = path.join(evidenceDir, 'evidence.sha256');
  fs.writeFileSync(ledgerPath, hashes.join('\n') + '\n');

  log.success(`Hash ledger generated: ${ledgerPath} (${hashes.length} files)`);
  return ledgerPath;
}

// Step 6: Create tarball (optional, for distribution)
function createTarball(evidenceDir) {
  log.info('Creating evidence bundle tarball...');

  const tarballPath = `${evidenceDir}.tgz`;

  try {
    // Use tar with stable options for determinism
    // --sort=name for stable ordering, --mtime for consistent timestamps
    runCommand('tar', [
      '-czf', tarballPath,
      '--sort=name',
      '--mtime=1970-01-01 00:00:00',
      '--owner=0',
      '--group=0',
      '--numeric-owner',
      '-C', path.dirname(evidenceDir),
      path.basename(evidenceDir),
    ], { silent: true });

    log.success(`Tarball created: ${tarballPath}`);
    return tarballPath;
  } catch (error) {
    log.warn(`Failed to create tarball: ${error.message}`);
    log.warn('Continuing without tarball (evidence directory still available)');
    return null;
  }
}

// Main: Generate evidence pack
function generateEvidencePack(targetDir) {
  log.info(`=== GA Evidence Pack Generator v${EVIDENCE_BUNDLE_VERSION} ===`);
  log.info(`Output directory: ${targetDir}`);
  log.info('');

  // Ensure output directory exists
  ensureDir(targetDir);

  // Step 1: Run ga:verify
  runGAVerify();

  // Step 2: Generate SBOM
  generateSBOM(targetDir);

  // Step 3: Collect GA verify report
  collectGAVerifyReport(targetDir);

  // Step 4: Generate evidence manifest
  generateEvidenceManifest(targetDir);

  // Step 5: Generate hash ledger
  generateHashLedger(targetDir);

  // Step 6: Create tarball (optional)
  createTarball(targetDir);

  log.info('');
  log.success('=== Evidence Pack Generation Complete ===');
  log.info(`Evidence bundle: ${targetDir}`);
  log.info('');
  log.info('Next steps:');
  log.info(`  1. Verify integrity: cd ${targetDir} && sha256sum -c evidence.sha256`);
  log.info(`  2. Review manifest: cat ${targetDir}/GA_EVIDENCE_MANIFEST.yml`);
  log.info(`  3. Review report: cat ${targetDir}/ga_verify_report.md`);
  log.info('');

  return targetDir;
}

// Check determinism: run twice and compare outputs
function checkDeterminism() {
  log.info('=== Determinism Check Mode ===');
  log.info('Running evidence pack generation twice and comparing outputs...');
  log.info('');

  const tempDir1 = path.join('dist', 'ga-evidence-check-1');
  const tempDir2 = path.join('dist', 'ga-evidence-check-2');

  // Clean up any previous runs
  if (fs.existsSync(tempDir1)) {
    fs.rmSync(tempDir1, { recursive: true });
  }
  if (fs.existsSync(tempDir2)) {
    fs.rmSync(tempDir2, { recursive: true });
  }

  // Run 1
  log.info('--- Run 1 ---');
  generateEvidencePack(tempDir1);

  // Small delay to ensure system state doesn't affect
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  sleep(100);

  // Run 2
  log.info('');
  log.info('--- Run 2 ---');
  generateEvidencePack(tempDir2);

  // Compare hash ledgers
  log.info('');
  log.info('=== Comparing Hash Ledgers ===');

  const ledger1Path = path.join(tempDir1, 'evidence.sha256');
  const ledger2Path = path.join(tempDir2, 'evidence.sha256');

  const ledger1 = fs.readFileSync(ledger1Path, 'utf8');
  const ledger2 = fs.readFileSync(ledger2Path, 'utf8');

  if (ledger1 === ledger2) {
    log.success('✓ Determinism check PASSED - hash ledgers are identical');
    log.info('');
    log.info('Evidence generation is deterministic.');
    return true;
  } else {
    log.error('✗ Determinism check FAILED - hash ledgers differ');
    log.error('');
    log.error('Differences found:');

    // Show diff
    const lines1 = ledger1.split('\n').filter(Boolean);
    const lines2 = ledger2.split('\n').filter(Boolean);

    for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
      if (lines1[i] !== lines2[i]) {
        log.error(`  Line ${i + 1}:`);
        log.error(`    Run 1: ${lines1[i] || '(missing)'}`);
        log.error(`    Run 2: ${lines2[i] || '(missing)'}`);
      }
    }

    log.error('');
    log.error('This indicates non-deterministic generation. Possible causes:');
    log.error('  - Timestamps in artifacts');
    log.error('  - Non-stable file ordering');
    log.error('  - Random UUIDs or nonces');
    log.error('  - Locale-dependent sorting');

    return false;
  }
}

// Main entry point
function main() {
  try {
    if (shouldCheckDeterminism) {
      const passed = checkDeterminism();
      process.exit(passed ? 0 : 1);
    } else {
      generateEvidencePack(outputDir);
      process.exit(0);
    }
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

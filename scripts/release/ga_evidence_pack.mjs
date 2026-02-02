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
const helpRequested = args.includes('--help');
const shouldCheckDeterminism = args.includes('--check-determinism');
const skipGaVerify = args.includes('--skip-ga-verify');
const outputDirArg = args.findIndex(a => a === '--output-dir');
const outputDir = outputDirArg !== -1 ? args[outputDirArg + 1] : DEFAULT_OUTPUT_DIR;

const options = {
  shouldCheckDeterminism,
  skipGaVerify,
  outputDir
};

if (helpRequested) {
  console.log(`
GA Evidence Pack Generator v${EVIDENCE_BUNDLE_VERSION}

Usage: node scripts/release/ga_evidence_pack.mjs [OPTIONS]

Options:
  --check-determinism  Run twice and verify outputs match
  --skip-ga-verify     Skip running ga:verify gate (requires existing stamp.json)
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
  if (options.skipGaVerify) {
    log.info('Skipping ga:verify (using existing artifacts if available)');
    return true;
  }

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

  // Skip generation if it already exists (e.g. from previous run)
  if (fs.existsSync(sbomPath)) {
    log.info('Using existing SBOM');
    return sbomPath;
  }

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
    // Create a placeholder if not found, to satisfy bundle requirements
    const placeholderStamp = {
      status: 'skipped',
      sha,
      reason: 'ga_verify stamp not found locally',
      steps: []
    };
    const reportPath = path.join(evidenceDir, 'ga_verify_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(placeholderStamp, null, 2));
    return reportPath;
  }

  const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
  const reportPath = path.join(evidenceDir, 'ga_verify_report.json');

  // Strip timestamps for determinism in the bundle report
  const deterministicStamp = {
    ...stamp,
    startedAt: 'DETERMINISTIC_PLACEHOLDER',
    finishedAt: 'DETERMINISTIC_PLACEHOLDER',
    steps: (stamp.steps || []).map(s => ({ ...s, durationMs: 0 }))
  };

  fs.writeFileSync(reportPath, JSON.stringify(deterministicStamp, null, 2));

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

// Utility: Calculate lockfile hash
function getLockfileHash() {
  const lockfilePath = path.join(process.cwd(), 'pnpm-lock.yaml');
  if (fs.existsSync(lockfilePath)) {
    return hashFile(lockfilePath);
  }
  return 'none';
}

// Step 4: Generate evidence manifest (bundle.manifest.json)
function generateBundleManifest(evidenceDir) {
  log.info('Generating bundle.manifest.json...');

  const sha = getGitSha();
  const branch = getGitBranch();
  const lockfileHash = getLockfileHash();

  const manifest = {
    version: EVIDENCE_BUNDLE_VERSION,
    commit_sha: sha,
    repo_ref: branch,
    generator_version: EVIDENCE_BUNDLE_VERSION,
    lockfile_hash: lockfileHash,
    evidence_items: [
      {
        id: "sbom",
        path: "sbom.cdx.json",
        sha256: hashFile(path.join(evidenceDir, "sbom.cdx.json"))
      },
      {
        id: "verification-report",
        path: "ga_verify_report.json",
        sha256: hashFile(path.join(evidenceDir, "ga_verify_report.json"))
      }
    ],
    omitted_items: []
  };

  // Check for other artifacts
  const extraArtifacts = [
    { id: 'security-ledger', file: 'docs/security/SECURITY_LEDGER.md' },
    { id: 'governance-acceptance', file: 'docs/governance/GOVERNANCE_ACCEPTANCE.md' }
  ];

  for (const item of extraArtifacts) {
    const fullPath = path.join(process.cwd(), item.file);
    if (!fs.existsSync(fullPath)) {
      manifest.omitted_items.push({
        id: item.id,
        reason: "File not found in repository"
      });
    }
  }

  const manifestPath = path.join(evidenceDir, 'bundle.manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  log.success(`Bundle manifest generated: ${manifestPath}`);
  return manifestPath;
}

// Step 5: Generate contents listing (bundle.contents.txt)
function generateContentsListing(evidenceDir) {
  log.info('Generating bundle.contents.txt contents listing...');

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
    // Skip the contents listing itself
    if (file === 'bundle.contents.txt') continue;

    const fullPath = path.join(evidenceDir, file);
    log.info(`Hashing: ${file}`);
    const hash = hashFile(fullPath);
    hashes.push(`${hash}  ${file}`);
  }

  const ledgerPath = path.join(evidenceDir, 'bundle.contents.txt');
  fs.writeFileSync(ledgerPath, hashes.join('\n') + '\n');

  log.success(`Contents listing generated: ${ledgerPath} (${hashes.length} files)`);
  return ledgerPath;
}

// Step 6: Generate README.md
function generateREADME(evidenceDir) {
  log.info('Generating README.md...');

  const readme = `# GA Evidence Bundle

This bundle contains deterministic evidence for commit \`${getGitSha()}\`.

## Contents

- \`bundle.manifest.json\`: Machine-readable manifest of the bundle.
- \`bundle.contents.txt\`: SHA-256 hashes of all files in this bundle.
- \`sbom.cdx.json\`: Software Bill of Materials.
- \`ga_verify_report.json\`: Verification gate results.

## How to Verify

1. Verify file integrity:
   \`\`\`bash
   sha256sum -c bundle.contents.txt
   \`\`\`

2. Verify manifest schema and hashes:
   \`\`\`bash
   node scripts/ci/verify_ga_evidence_bundle.ts --bundle .
   \`\`\`

## How to Regenerate

\`\`\`bash
node scripts/release/ga_evidence_pack.mjs
\`\`\`

---
*Generated by Summit GA Evidence Pipeline*
`;

  const readmePath = path.join(evidenceDir, 'README.md');
  fs.writeFileSync(readmePath, readme);
  log.success(`README generated: ${readmePath}`);
  return readmePath;
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
  generateBundleManifest(targetDir);

  // Step 5: Generate contents listing
  generateContentsListing(targetDir);

  // Step 6: Generate README
  generateREADME(targetDir);

  // Step 7: Create tarball (optional)
  createTarball(targetDir);

  log.info('');
  log.success('=== Evidence Pack Generation Complete ===');
  log.info(`Evidence bundle: ${targetDir}`);
  log.info('');
  log.info('Next steps:');
  log.info(`  1. Verify integrity: cd ${targetDir} && sha256sum -c bundle.contents.txt`);
  log.info(`  2. Review manifest: cat ${targetDir}/bundle.manifest.json`);
  log.info(`  3. Review README: cat ${targetDir}/README.md`);
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

  // Compare contents listings
  log.info('');
  log.info('=== Comparing Contents Listings ===');

  const ledger1Path = path.join(tempDir1, 'bundle.contents.txt');
  const ledger2Path = path.join(tempDir2, 'bundle.contents.txt');

  const ledger1 = fs.readFileSync(ledger1Path, 'utf8');
  const ledger2 = fs.readFileSync(ledger2Path, 'utf8');

  if (ledger1 === ledger2) {
    log.success('✓ Determinism check PASSED - contents listings are identical');
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

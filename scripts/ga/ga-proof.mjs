#!/usr/bin/env node
/**
 * GA Proof Generator - Release-Train Hardening
 *
 * Single canonical command that deterministically proves GA readiness.
 * Produces content-addressed artifacts that are:
 * - Reproducible (same SHA = byte-identical output)
 * - Environment-independent (no timestamps, no hostnames)
 * - Auditable (checksums, hashes, evidence IDs)
 *
 * Usage: pnpm ga:verify
 *        node scripts/ga/ga-proof.mjs
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getGitContext,
  getToolchainFingerprint,
  validateDeterminism,
  writeDeterministicJSON,
  generateChecksums,
  hashString,
} from '../release/lib/determinism.mjs';

// GA proof steps - order matters for determinism
const PROOF_STEPS = [
  { name: 'typecheck', command: 'pnpm', args: ['typecheck'], critical: true },
  { name: 'lint', command: 'pnpm', args: ['lint'], critical: true },
  { name: 'build', command: 'pnpm', args: ['build'], critical: true },
  {
    name: 'server:test:unit',
    command: 'pnpm',
    args: ['--filter', 'intelgraph-server', 'test:unit'],
    env: { GA_VERIFY_MODE: 'true' },
    critical: true,
  },
  { name: 'ga:smoke', command: 'pnpm', args: ['ga:smoke'], critical: false },
];

const gitContext = getGitContext();
const toolchain = getToolchainFingerprint();

// Deterministic artifact directory: artifacts/ga-proof/<git-sha>
const ARTIFACT_BASE = 'artifacts/ga-proof';
const ARTIFACT_DIR = path.join(ARTIFACT_BASE, gitContext.sha);
const LOGS_DIR = path.join(ARTIFACT_DIR, 'logs');

// Main proof artifact
const STAMP_PATH = path.join(ARTIFACT_DIR, 'stamp.json');
const REPORT_PATH = path.join(ARTIFACT_DIR, 'report.json');
const CHECKSUMS_PATH = path.join(ARTIFACT_DIR, 'checksums.txt');

let proof = {
  version: '1.0.0',
  schema: 'ga-proof-v1',
  git: gitContext,
  toolchain,
  steps: [],
  status: 'running',
};

/**
 * Run a single proof step
 */
async function runStep(step) {
  const logPath = path.join(LOGS_DIR, `${step.name}.log`);
  await fs.mkdir(LOGS_DIR, { recursive: true });

  console.log(`[ga-proof] Running ${step.name}: ${step.command} ${step.args.join(' ')}`);

  const startMs = Date.now();
  const result = spawnSync(step.command, step.args, {
    env: { ...process.env, ...(step.env ?? {}) },
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
    shell: false,
  });
  const durationMs = Date.now() - startMs;

  const output = [result.stdout, result.stderr].filter(Boolean).join('');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  // Write full log
  await fs.writeFile(logPath, output, 'utf8');

  // Create deterministic step entry (NO TIMESTAMPS)
  const stepEntry = {
    name: step.name,
    command: `${step.command} ${step.args.join(' ')}`,
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status,
    durationMs,
    critical: step.critical,
    logHash: hashString(output),
    logPath: path.relative(process.cwd(), logPath),
  };

  proof.steps.push(stepEntry);

  // Save intermediate proof
  await writeDeterministicJSON(STAMP_PATH, proof);

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    if (step.critical) {
      const error = new Error(`Critical step ${step.name} failed (exit ${result.status})`);
      error.step = step.name;
      throw error;
    } else {
      console.warn(`[ga-proof] Non-critical step ${step.name} failed (exit ${result.status})`);
    }
  }
}

/**
 * Generate final report with evidence summary
 */
async function generateReport() {
  const allPassed = proof.steps.filter(s => s.critical).every(s => s.status === 'passed');

  const report = {
    schema: 'ga-report-v1',
    version: '1.0.0',
    git: gitContext,
    toolchain,
    summary: {
      status: allPassed ? 'PASSED' : 'FAILED',
      totalSteps: proof.steps.length,
      passed: proof.steps.filter(s => s.status === 'passed').length,
      failed: proof.steps.filter(s => s.status === 'failed').length,
      criticalPassed: proof.steps.filter(s => s.critical && s.status === 'passed').length,
      criticalFailed: proof.steps.filter(s => s.critical && s.status === 'failed').length,
    },
    steps: proof.steps,
    determinismCheck: {
      violations: validateDeterminism(proof),
      passed: validateDeterminism(proof).length === 0,
    },
  };

  await writeDeterministicJSON(REPORT_PATH, report);
  return report;
}

/**
 * Generate checksums for all artifacts
 */
async function generateChecksumsFile() {
  const checksums = await generateChecksums(ARTIFACT_DIR);

  // Write checksums in stable text format
  const lines = checksums
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(c => `${c.sha256}  ${c.file}`)
    .join('\n');

  await fs.writeFile(CHECKSUMS_PATH, lines + '\n', 'utf8');
  console.log(`[ga-proof] Generated checksums: ${checksums.length} files`);
}

/**
 * Validate determinism of all artifacts
 */
async function validateArtifactDeterminism() {
  console.log('[ga-proof] Validating artifact determinism...');

  const stamp = JSON.parse(await fs.readFile(STAMP_PATH, 'utf8'));
  const stampViolations = validateDeterminism(stamp);

  const report = JSON.parse(await fs.readFile(REPORT_PATH, 'utf8'));
  const reportViolations = validateDeterminism(report);

  const allViolations = [...stampViolations, ...reportViolations];

  if (allViolations.length > 0) {
    console.error('[ga-proof] DETERMINISM VIOLATIONS DETECTED:');
    allViolations.forEach(v => {
      console.error(`  - ${v.path}: ${v.message} (${v.type})`);
    });
    throw new Error('Determinism violations found in artifacts');
  }

  console.log('[ga-proof] ✓ All artifacts are deterministic');
}

/**
 * Main entry point
 */
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   GA PROOF GENERATOR - RELEASE TRAIN READY   ');
  console.log('═══════════════════════════════════════════════');
  console.log(`Git SHA: ${gitContext.sha}`);
  console.log(`Branch:  ${gitContext.branch}`);
  console.log(`Dirty:   ${gitContext.isDirty ? 'YES (uncommitted changes)' : 'NO'}`);
  console.log(`Output:  ${ARTIFACT_DIR}`);
  console.log('═══════════════════════════════════════════════\n');

  if (gitContext.isDirty) {
    console.warn('⚠️  WARNING: Working directory is dirty. Proof will not be reproducible.\n');
  }

  let currentStep = null;
  try {
    // Run all proof steps
    for (const step of PROOF_STEPS) {
      currentStep = step.name;
      await runStep(step);
    }

    // Mark proof as passed
    proof.status = 'passed';
    await writeDeterministicJSON(STAMP_PATH, proof);

    // Generate final report
    const report = await generateReport();

    // Generate checksums
    await generateChecksumsFile();

    // Validate determinism
    await validateArtifactDeterminism();

    console.log('\n═══════════════════════════════════════════════');
    console.log('   ✅ GA PROOF COMPLETE   ');
    console.log('═══════════════════════════════════════════════');
    console.log(`Status:         ${report.summary.status}`);
    console.log(`Steps Passed:   ${report.summary.passed}/${report.summary.totalSteps}`);
    console.log(`Critical Steps: ${report.summary.criticalPassed}/${report.summary.criticalPassed + report.summary.criticalFailed}`);
    console.log(`Artifacts:      ${ARTIFACT_DIR}`);
    console.log('═══════════════════════════════════════════════\n');

    console.log('Proof artifacts:');
    console.log(`  - ${STAMP_PATH}`);
    console.log(`  - ${REPORT_PATH}`);
    console.log(`  - ${CHECKSUMS_PATH}`);
    console.log(`  - ${LOGS_DIR}/`);

    return 0;
  } catch (error) {
    proof.status = 'failed';
    proof.failureSummary = {
      step: currentStep,
      message: error?.message ?? 'Unknown failure',
    };
    await writeDeterministicJSON(STAMP_PATH, proof);

    const report = await generateReport();
    await generateChecksumsFile();

    console.error('\n═══════════════════════════════════════════════');
    console.error('   ❌ GA PROOF FAILED   ');
    console.error('═══════════════════════════════════════════════');
    console.error(`Failed Step:    ${currentStep}`);
    console.error(`Error:          ${error.message}`);
    console.error(`Artifacts:      ${ARTIFACT_DIR}`);
    console.error('═══════════════════════════════════════════════\n');

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

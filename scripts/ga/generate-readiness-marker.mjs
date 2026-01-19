#!/usr/bin/env node
/**
 * Generate GA Readiness Marker
 *
 * Creates a machine-readable GA_READY.json marker that cloud deploy pipelines can consume.
 * This marker is content-addressed and proves that GA verification passed.
 *
 * Must be run AFTER ga-proof.mjs completes successfully.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getGitContext,
  getToolchainFingerprint,
  hashFile,
  writeDeterministicJSON,
} from '../release/lib/determinism.mjs';

async function main() {
  const gitContext = getGitContext();
  const artifactDir = path.join('artifacts/ga-proof', gitContext.sha);
  const stampPath = path.join(artifactDir, 'stamp.json');
  const reportPath = path.join(artifactDir, 'report.json');
  const checksumsPath = path.join(artifactDir, 'checksums.txt');

  // Verify required artifacts exist
  try {
    await fs.access(stampPath);
    await fs.access(reportPath);
    await fs.access(checksumsPath);
  } catch (error) {
    console.error('ERROR: GA proof artifacts not found. Run pnpm ga:verify first.');
    console.error(`Expected artifacts in: ${artifactDir}`);
    process.exit(1);
  }

  // Read and verify report
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));

  if (report.summary.status !== 'PASSED') {
    console.error('ERROR: GA proof did not pass. Cannot generate readiness marker.');
    console.error(`Status: ${report.summary.status}`);
    process.exit(1);
  }

  if (!report.determinismCheck.passed) {
    console.error('ERROR: Determinism check failed. Cannot generate readiness marker.');
    console.error('Violations:', report.determinismCheck.violations);
    process.exit(1);
  }

  // Compute artifact hashes for attestation
  const stampHash = hashFile(stampPath);
  const reportHash = hashFile(reportPath);
  const checksumsHash = hashFile(checksumsPath);

  // Generate readiness marker
  const readinessMarker = {
    schema: 'ga-readiness-marker-v1',
    version: '1.0.0',
    git: gitContext,
    toolchain: getToolchainFingerprint(),
    gaProof: {
      status: 'PASSED',
      artifactDir: path.relative(process.cwd(), artifactDir),
      attestation: {
        stampHash,
        reportHash,
        checksumsHash,
      },
      summary: report.summary,
    },
    releaseTrainReady: true,
    cloudDeployReady: true,
    verifiedAt: {
      // NOTE: This is the only timestamp allowed, and it's OPTIONAL for markers
      // It does NOT affect the proof artifacts themselves
      step: 'post-verification-marker-generation',
      note: 'Marker generation timestamp - not part of proof determinism',
    },
  };

  // Write marker to artifact directory AND root for easy cloud consumption
  const markerPathInArtifacts = path.join(artifactDir, 'GA_READY.json');
  const markerPathInRoot = 'GA_READY.json';

  await writeDeterministicJSON(markerPathInArtifacts, readinessMarker);
  await writeDeterministicJSON(markerPathInRoot, readinessMarker);

  console.log('✅ GA Readiness Marker generated successfully');
  console.log(`   Status:       PASSED`);
  console.log(`   Git SHA:      ${gitContext.sha}`);
  console.log(`   Artifacts:    ${artifactDir}`);
  console.log(`   Marker:       ${markerPathInRoot}`);
  console.log('');
  console.log('Cloud deploy pipelines can now consume GA_READY.json');
}

main().catch((error) => {
  console.error('FATAL:', error.message);
  process.exit(1);
});

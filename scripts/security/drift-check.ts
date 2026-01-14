import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createCommand, logger, handleExit } from '../_lib/cli.js';
import { ArtifactManager } from '../_lib/artifacts.js';

// ============================================================================
// Configuration
// ============================================================================

const EVIDENCE_ROOT = 'evidence/security'; // Legacy location for reading
const ARTIFACTS_ROOT = 'artifacts/evidence'; // New standard location if we want to migrate, but drift check reads OLD output

// ============================================================================
// Helpers
// ============================================================================

function computeSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

interface EvidenceIndex {
  meta: any;
  artifacts: { path: string; sha256: string }[];
}

// ============================================================================
// Main Logic
// ============================================================================

async function checkDrift(options: any) {
  const { mode, outDir, json } = options;
  const artifactManager = new ArtifactManager(outDir);

  logger.section('Security Drift Check');

  // Locate Evidence Pack
  // We check both the legacy location and the new standardized artifacts location
  let packsDir = '';

  if (fs.existsSync(ARTIFACTS_ROOT)) {
      packsDir = ARTIFACTS_ROOT;
  } else if (fs.existsSync(EVIDENCE_ROOT)) {
      packsDir = EVIDENCE_ROOT;
  } else {
    logger.error('No evidence packs found.');
    logger.info('Please run \'pnpm security:evidence-pack\' (or generate:evidence) to create a baseline.');
    process.exit(1);
  }

  const packs = fs.readdirSync(packsDir).filter(f => fs.statSync(path.join(packsDir, f)).isDirectory());
  if (packs.length === 0) {
    logger.error(`No evidence packs found in ${packsDir}.`);
    process.exit(1);
  }

  // Sort by name (timestamp) descending
  packs.sort().reverse();
  const latestPack = packs[0];
  const latestPackPath = path.join(packsDir, latestPack);

  // Try manifest.json (new) or index.json (old)
  let indexPath = path.join(latestPackPath, 'manifest.json');
  if (!fs.existsSync(indexPath)) {
      indexPath = path.join(latestPackPath, 'index.json');
  }

  if (!fs.existsSync(indexPath)) {
    logger.error(`Latest pack ${latestPack} is missing manifest.json/index.json. Corrupt pack?`);
    process.exit(1);
  }

  logger.info(`Comparing against latest evidence pack: ${latestPack}`);

  const content = fs.readFileSync(indexPath, 'utf-8');
  const index = JSON.parse(content);

  // Normalize index format (handle both old index.artifacts and new manifest.files)
  const artifacts: { path: string; sha256: string }[] = index.files || index.artifacts || [];

  let driftFound = false;
  const driftDetails: string[] = [];

  for (const artifact of artifacts) {
    const currentPath = artifact.path;

    if (!fs.existsSync(currentPath)) {
      logger.warn(`[WARNING] Artifact deleted since last pack: ${currentPath}`);
      driftDetails.push(`DELETED: ${currentPath}`);
      driftFound = true;
      continue;
    }

    const currentHash = computeSha256(currentPath);
    if (currentHash !== artifact.sha256) {
      logger.error(`[DRIFT] File changed: ${currentPath}`);
      driftDetails.push(`MODIFIED: ${currentPath}`);
      driftFound = true;
    }
  }

  const result = {
      driftFound,
      driftDetails,
      checkedAgainst: latestPack
  };

  // Write result to artifacts
  if (mode === 'apply' || mode === 'plan') { // Always write report if possible
      const reportDir = artifactManager.ensureDir('drift-check');
      const reportPath = path.join(reportDir, `drift-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
      logger.info(`Detailed report written to: ${reportPath}`);
  }

  if (driftFound) {
    logger.error('\nSecurity Posture Drift Detected!');
    logger.info('The following artifacts have changed since the last evidence pack:');
    driftDetails.forEach(d => logger.info(` - ${d}`));
    logger.section('Remediation');
    logger.info('1. Verify if these changes are intentional.');
    logger.info('2. If intentional, regenerate the evidence pack to establish a new baseline:');
    logger.info('   pnpm security:evidence-pack');
    logger.info('3. If unintentional, revert the changes.');
    process.exit(1);
  }

  logger.success('No drift detected. Security artifacts match the latest evidence pack.');
  if (json) logger.json(result);
}

const program = createCommand('security:drift-check', 'Verifies security artifacts against latest evidence baseline');

program.action(async (options) => {
    await checkDrift(options);
});

program.parse(process.argv);

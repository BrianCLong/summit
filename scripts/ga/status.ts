import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createCommand, logger, handleExit } from '../_lib/cli.js';
import { ArtifactManager } from '../_lib/artifacts.js';

// Verify Evidence Bundle Wrapper
// We use verify-evidence-bundle.ts if available

async function runStatus(options: any) {
  const { mode, outDir, json } = options;
  const artifactManager = new ArtifactManager(outDir);

  logger.section('General Availability (GA) Automation Status');
  logger.info(`Checking system status...`);

  const summary = {
      timestamp: new Date().toISOString(),
      drift: { status: 'unknown', details: null as any },
      evidence: { status: 'unknown', details: null as any },
      mergeTrain: { status: 'unknown', details: null as any }
  };

  // 1. Check Drift
  logger.info('Running Drift Check...');
  try {
      execSync('npx tsx scripts/security/drift-check.ts --mode=plan --json', { stdio: 'pipe' });
      summary.drift.status = 'passing';
      logger.success('Drift check passed.');
  } catch (e: any) {
      summary.drift.status = 'failing';
      logger.error('Drift check failed.');
  }

  // 2. Check Evidence
  logger.info('Checking Evidence Bundles...');
  const evidenceDir = path.resolve('artifacts/evidence'); // Check standardized dir
  let bundleFound = false;
  let latestBundle = '';

  if (fs.existsSync(evidenceDir)) {
      const bundles = fs.readdirSync(evidenceDir).filter(d => d.startsWith('auditor-bundle'));
      if (bundles.length > 0) {
          bundleFound = true;
          latestBundle = path.join(evidenceDir, bundles.sort().reverse()[0]);
          summary.evidence.details = { count: bundles.length, latest: latestBundle };
          logger.success(`Found ${bundles.length} evidence bundles.`);
      }
  }

  if (bundleFound) {
      // Run Verification on latest bundle
      logger.info(`Verifying latest bundle: ${latestBundle}`);
      // Find manifest
      const manifest = path.join(latestBundle, 'manifest.json');
      if (fs.existsSync(manifest)) {
          try {
             execSync(`npx tsx scripts/verify-evidence-bundle.ts "${manifest}"`, { stdio: 'pipe' });
             summary.evidence.status = 'verified';
             logger.success('Evidence verification passed.');
          } catch (e) {
             summary.evidence.status = 'invalid';
             logger.error('Evidence verification failed.');
          }
      } else {
          summary.evidence.status = 'corrupt';
          logger.error('Latest bundle missing manifest.');
      }
  } else {
      summary.evidence.status = 'missing';
      logger.warn('No evidence bundles found.');
  }

  // 3. Check Merge Train (Triage)
  logger.info('Checking Merge Train Status...');
  try {
      const output = execSync('npx tsx scripts/triage/pr-triage.ts --mode=plan --json', { encoding: 'utf-8' });
      summary.mergeTrain.status = 'operational';
      logger.success('Merge train triage is operational.');
  } catch (e) {
      summary.mergeTrain.status = 'error';
      logger.error('Merge train check failed (is gh CLI installed?).');
  }

  // Output
  if (json) {
      logger.json(summary);
  } else {
      logger.section('Status Summary');
      console.table({
          Drift: summary.drift.status,
          Evidence: summary.evidence.status,
          MergeTrain: summary.mergeTrain.status
      });
  }

  // Write artifact
  const runDir = artifactManager.ensureDir('ga-status');
  const reportPath = path.join(runDir, `status-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  logger.info(`Status report saved to: ${reportPath}`);
}

const program = createCommand('ga:status', 'Checks the status of GA automation components');

program.action(async (options) => {
    await runStatus(options);
});

program.parse(process.argv);

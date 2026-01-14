import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { createCommand, logger, handleExit } from '../_lib/cli.js';
import { ArtifactManager } from '../_lib/artifacts.js';

// Import existing modules if possible, otherwise execute them
// For pr-dashboard, we can execute it.
// For merge-train.sh, it's bash, so we MUST execute it.

async function runMergeTrain(options: any) {
  const { mode, outDir, json } = options;
  const artifactManager = new ArtifactManager(outDir);

  logger.section('Merge Train Orchestrator');
  logger.info(`Mode: ${mode}`);

  const summary = {
      timestamp: new Date().toISOString(),
      steps: [] as any[]
  };

  // Step 1: Triage
  logger.section('Step 1: Triage');
  try {
      const triageCmd = `npx tsx scripts/triage/pr-triage.ts --mode=${mode} --out-dir=${outDir} ${json ? '--json' : ''}`;
      logger.info(`Running: ${triageCmd}`);
      execSync(triageCmd, { stdio: 'inherit' });
      summary.steps.push({ name: 'triage', status: 'success' });
  } catch (e) {
      logger.error('Triage failed.');
      summary.steps.push({ name: 'triage', status: 'failed' });
      if (mode === 'apply') process.exit(1);
  }

  // Step 2: Dashboard Update
  logger.section('Step 2: Dashboard Update');
  try {
      if (mode === 'apply') {
          // The pr-dashboard.ts script writes to current working directory,
          // we might need to move artifacts or pass args if it supports them.
          // Looking at pr-dashboard.ts, it doesn't take args for output path easily,
          // it hardcodes 'pr-dashboard-report.json'.

          logger.info('Running PR Dashboard Generator...');
          execSync('npx tsx scripts/pr-dashboard.ts', { stdio: 'inherit' });

          // Move artifact
          const src = 'pr-dashboard-report.json';
          if (fs.existsSync(src)) {
              const dest = path.join(artifactManager.ensureDir('merge-train'), `dashboard-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
              fs.renameSync(src, dest);
              logger.success(`Dashboard saved to ${dest}`);
          }
      } else {
          logger.info('(Skipped in plan mode)');
      }
      summary.steps.push({ name: 'dashboard', status: 'success' });
  } catch (e) {
      logger.error('Dashboard generation failed.');
      summary.steps.push({ name: 'dashboard', status: 'failed' });
  }

  // Step 3: Branch Update (Merge Train Execution)
  logger.section('Step 3: Branch Update');
  try {
      if (mode === 'apply') {
          logger.info('Running Merge Train Processor...');
          // scripts/merge-train.sh
          execSync('bash scripts/merge-train.sh', { stdio: 'inherit' });
      } else {
          logger.info('(Skipped in plan mode)');
          // We could dry-run check queue length
          try {
              const queueLength = execSync('gh pr list --label "merge-queue" --json number | jq "length"', { encoding: 'utf-8' }).trim();
              logger.info(`Queue length: ${queueLength}`);
          } catch (e) {
              logger.warn('Could not check queue length (gh cli missing?)');
          }
      }
      summary.steps.push({ name: 'branch-update', status: 'success' });
  } catch (e) {
      logger.error('Branch update failed.');
      summary.steps.push({ name: 'branch-update', status: 'failed' });
  }

  logger.section('Merge Train Run Complete');

  if (json) {
      logger.json(summary);
  }
}

const program = createCommand('merge-train:run', 'Runs the full merge train workflow');

program.action(async (options) => {
    await runMergeTrain(options);
});

program.parse(process.argv);

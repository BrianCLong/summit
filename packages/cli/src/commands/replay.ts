import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs';
import {
  loadRunManifest,
  TaskGraph,
  Scheduler,
  replayEvents
} from '@summit/orchestrator';

export const replayCommand = new Command('replay')
  .description('Replay a past run to verify determinism')
  .requiredOption('--run <run_id>', 'Run ID to replay')
  .action(async (options) => {
    const runId = options.run;
    const baseDir = path.join(os.homedir(), '.summit', 'runs', runId);
    const manifestPath = path.join(baseDir, 'manifest.json');
    const logPath = path.join(baseDir, 'events.jsonl');

    console.log(chalk.bold(`\nSummit Replay Tool\n`));
    console.log(`Run ID: ${chalk.cyan(runId)}`);
    console.log(`Base Dir: ${baseDir}`);

    try {
      if (!fs.existsSync(manifestPath)) {
        console.error(chalk.red(`Manifest not found at ${manifestPath}`));
        process.exit(1);
      }

      console.log(chalk.dim('Loading manifest...'));
      const manifest = await loadRunManifest(manifestPath);
      console.log(`Seed: ${manifest.seed_values.global_seed}`);
      console.log(`Created: ${manifest.created_at}`);

      if (!fs.existsSync(logPath)) {
        console.error(chalk.red(`Event log not found at ${logPath}`));
        process.exit(1);
      }

      console.log(chalk.dim('Loading events...'));
      const events = await replayEvents(logPath);
      console.log(`Loaded ${events.length} events.`);

      console.log(chalk.dim('Replaying orchestration...'));
      const graph = new TaskGraph();
      const scheduler = new Scheduler(graph);

      for (const event of events) {
        scheduler.applyEvent(event);
      }

      const finalHash = graph.getHash();
      console.log(`Final Graph Hash: ${chalk.yellow(finalHash)}`);

      if (manifest.final_state_hash) {
        if (manifest.final_state_hash === finalHash) {
          console.log(chalk.green('✔ SUCCESS: Replay hash matches manifest hash.'));
        } else {
          console.error(chalk.red('✘ FAILURE: Replay hash DOES NOT match manifest hash.'));
          console.error(`Expected: ${manifest.final_state_hash}`);
          console.error(`Actual:   ${finalHash}`);
          process.exit(1);
        }
      } else {
        console.log(chalk.yellow('⚠ Manifest does not contain final_state_hash. Verification skipped.'));
      }

    } catch (error: any) {
      console.error(chalk.red(`Replay failed: ${error.message}`));
      process.exit(1);
    }
  });

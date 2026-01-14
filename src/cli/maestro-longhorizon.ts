#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { LongHorizonRunner } from '../longhorizon/run';
import { RunConfig } from '../longhorizon/types';

const program = new Command();

program
  .name('maestro-longhorizon')
  .description('Run LongHorizon orchestration')
  .requiredOption('-c, --config <path>', 'Path to run config JSON')
  .option('--checkpoint <path>', 'Resume from checkpoint file')
  .option('--artifacts-dir <path>', 'Artifacts output directory')
  .option('--checkpoint-dir <path>', 'Checkpoint output directory')
  .parse(process.argv);

const options = program.opts();

async function main(): Promise<void> {
  const raw = await fs.readFile(options.config, 'utf-8');
  const config = JSON.parse(raw) as RunConfig;

  const runner = options.checkpoint
    ? await LongHorizonRunner.resume(options.checkpoint, config, {
        evaluationProfile: config.evaluationProfile,
        baseArtifactsDir: options.artifactsDir,
        checkpointDir: options.checkpointDir,
      })
    : new LongHorizonRunner(config, {
        evaluationProfile: config.evaluationProfile,
        baseArtifactsDir: options.artifactsDir,
        checkpointDir: options.checkpointDir,
      });

  const evidenceDir = await runner.run();
  await runner.checkpoint();
  process.stdout.write(`Evidence bundle created at ${evidenceDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
